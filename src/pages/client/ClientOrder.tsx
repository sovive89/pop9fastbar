import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart, CartProvider } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Search, Plus, Minus, X, Send, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MenuCategory, MenuItem, OrderItem } from '@/types';
import QRCode from '@/components/QRCode';

const ClientOrderInner = () => {
  const { sessionId, clientToken } = useParams<{ sessionId: string; clientToken: string }>();
  const { toast } = useToast();
  const { items: cartItems, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCart();
  
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState('');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [view, setView] = useState<'menu' | 'cart' | 'orders'>('menu');

  useEffect(() => {
    const validate = async () => {
      if (!sessionId || !clientToken) { setSessionValid(false); return; }
      const { data: session } = await supabase.from('sessions').select('status').eq('id', sessionId).single();
      if (!session || session.status !== 'active') { setSessionValid(false); return; }
      const { data: client } = await supabase.from('session_clients').select('*').eq('session_id', sessionId).eq('client_token', clientToken).single();
      if (!client) { setSessionValid(false); return; }
      setClientName(client.client_name);
      setClientId(client.id);
      setSessionValid(true);
    };
    validate();
  }, [sessionId, clientToken]);

  useEffect(() => {
    const fetchMenu = async () => {
      const { data: cats } = await supabase.from('menu_categories').select('*').eq('is_active', true).order('sort_order');
      if (cats) setCategories(cats as MenuCategory[]);
      const { data: items } = await supabase.from('menu_items').select('*').eq('is_active', true).order('sort_order');
      if (items) setMenuItems(items as MenuItem[]);
    };
    if (sessionValid) fetchMenu();
  }, [sessionValid]);

  const fetchOrders = async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*, menu_item:menu_items(name, price))')
      .eq('session_client_id', clientId)
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  useEffect(() => { if (clientId) fetchOrders(); }, [clientId, view]);

  const filteredItems = menuItems.filter(i => {
    if (selectedCategory && i.category_id !== selectedCategory) return false;
    if (searchQuery && !i.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const submitOrder = async () => {
    if (cartItems.length === 0) return;
    const { data: order, error } = await supabase.from('orders').insert({ session_id: sessionId, session_client_id: clientId }).select().single();
    if (error || !order) { toast({ title: 'Erro ao enviar pedido', variant: 'destructive' }); return; }
    const orderItems = cartItems.map(ci => ({
      order_id: order.id,
      menu_item_id: ci.menuItem.id,
      quantity: ci.quantity,
      unit_price: ci.menuItem.price,
      notes: ci.notes || null,
      removed_ingredients: ci.removedIngredients.length > 0 ? ci.removedIngredients : null,
      added_ingredients: ci.addedIngredients.length > 0 ? ci.addedIngredients.map(a => a.name) : null,
    }));
    await supabase.from('order_items').insert(orderItems);
    clearCart();
    toast({ title: 'Pedido enviado! 🎉' });
    setView('orders');
    fetchOrders();
  };

  if (sessionValid === null) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (sessionValid === false) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4"><X className="w-8 h-8 text-destructive" /></div>
        <h1 className="text-xl font-bold text-foreground mb-2">Sessão inválida</h1>
        <p className="text-muted-foreground">Este link não é válido ou a comanda foi encerrada.</p>
      </div>
    </div>
  );

  const statusIcons: Record<string, JSX.Element> = {
    pending: <Clock className="w-3 h-3 text-yellow-400" />,
    preparing: <Clock className="w-3 h-3 text-blue-400" />,
    ready: <CheckCircle2 className="w-3 h-3 text-green-400" />,
    confirmed: <CheckCircle2 className="w-3 h-3 text-primary" />,
    served: <CheckCircle2 className="w-3 h-3 text-primary" />,
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendente', preparing: 'Preparando', ready: 'Pronto', confirmed: 'Entregue', served: 'Servido', cancelled: 'Cancelado',
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-lg text-foreground">POP9 BAR</h1>
              <p className="text-xs text-muted-foreground">Olá, {clientName} 👋</p>
            </div>
            <Button variant="ghost" size="icon" className="relative" onClick={() => setView(view === 'cart' ? 'menu' : 'cart')}>
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full text-[10px] font-bold text-primary-foreground flex items-center justify-center">{totalItems}</span>}
            </Button>
          </div>
        </div>
      </header>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/30">
        <div className="flex">
          {[
            { id: 'menu' as const, label: 'Cardápio', icon: Search },
            { id: 'cart' as const, label: `Carrinho (${totalItems})`, icon: ShoppingBag },
            { id: 'orders' as const, label: 'Pedidos', icon: Clock },
          ].map(tab => (
            <button key={tab.id} onClick={() => setView(tab.id)} className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs transition-all ${view === tab.id ? 'text-primary' : 'text-muted-foreground'}`}>
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Menu view */}
      {view === 'menu' && (
        <main className="px-4 py-4 space-y-4">
          <Input placeholder="Buscar item..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="rounded-xl bg-secondary/30" />
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${!selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}>Todos</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}>{cat.name}</button>
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Nenhum item encontrado</p>
          ) : (
            <div className="grid gap-3">
              {filteredItems.map(item => (
                <div key={item.id} className="glass rounded-2xl overflow-hidden flex animate-slide-up">
                  {item.image_url && <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover" loading="lazy" />}
                  <div className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">{item.name}</p>
                      {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-bold text-primary">R$ {Number(item.price).toFixed(2)}</p>
                      <Button size="sm" className="h-8 rounded-xl gap-1" onClick={() => { addItem(item); toast({ title: `${item.name} adicionado!` }); }}>
                        <Plus className="w-3 h-3" /> Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Cart view */}
      {view === 'cart' && (
        <main className="px-4 py-4 space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Carrinho vazio</p>
            </div>
          ) : (
            <>
              {cartItems.map((ci, idx) => (
                <div key={idx} className="glass rounded-2xl p-4 flex items-center gap-3 animate-slide-up">
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{ci.menuItem.name}</p>
                    <p className="text-xs text-primary font-semibold">R$ {Number(ci.menuItem.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(idx, ci.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                    <span className="text-sm font-medium text-foreground w-5 text-center">{ci.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(idx, ci.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}><X className="w-3 h-3" /></Button>
                </div>
              ))}
              <div className="glass rounded-2xl p-4">
                <div className="flex justify-between text-foreground font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">R$ {totalPrice.toFixed(2)}</span>
                </div>
              </div>
              <Button className="w-full h-14 rounded-2xl text-lg font-semibold gap-2" onClick={submitOrder}>
                <Send className="w-5 h-5" /> Enviar Pedido
              </Button>
            </>
          )}
        </main>
      )}

      {/* Orders view */}
      {view === 'orders' && (
        <main className="px-4 py-4 space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-20">
              <Clock className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum pedido ainda</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="glass rounded-2xl overflow-hidden animate-slide-up">
                <div className="p-4 border-b border-border/20 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground text-sm">Pedido #{order.id.slice(0, 6).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString('pt-BR')}</p>
                  </div>
                  <Badge className={order.status === 'served' ? 'bg-primary/20 text-primary' : 'bg-yellow-500/20 text-yellow-400'}>{statusLabels[order.status]}</Badge>
                </div>
                <div className="p-4 space-y-3">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-foreground">{item.quantity}x {item.menu_item?.name || 'Item'}</p>
                        <div className="flex items-center gap-1">
                          {statusIcons[item.status]}
                          <span className="text-xs text-muted-foreground">{statusLabels[item.status]}</span>
                        </div>
                      </div>
                      {(item.status === 'ready' || item.status === 'pending' || item.status === 'preparing') && (
                        <div className="flex justify-center py-2">
                          <QRCode value={item.token} size={120} itemName={item.menu_item?.name} type="delivery" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </main>
      )}
    </div>
  );
};

const ClientOrder = () => (
  <CartProvider>
    <ClientOrderInner />
  </CartProvider>
);

export default ClientOrder;
