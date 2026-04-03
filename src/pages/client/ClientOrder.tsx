import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart, CartProvider } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingBag, Search, Plus, Minus, X, Send, CheckCircle2,
  Clock, ChevronLeft, AlertCircle, Sparkles, Trash2,
  Wine, MessageSquare
} from 'lucide-react';
import pop9Logo from '@/assets/pop9-logo.png';
import { useToast } from '@/hooks/use-toast';
import type { MenuCategory, MenuItem, MenuItemIngredient } from '@/types';
import QRCode from '@/components/QRCode';

// ─── Item Detail Modal ───
const ItemDetailModal = ({
  item, ingredients, onClose, onAdd,
}: {
  item: MenuItem;
  ingredients: MenuItemIngredient[];
  onClose: () => void;
  onAdd: (notes: string, removed: string[], added: MenuItemIngredient[]) => void;
}) => {
  const [notes, setNotes] = useState('');
  const [removed, setRemoved] = useState<string[]>([]);
  const [added, setAdded] = useState<MenuItemIngredient[]>([]);

  const defaults = ingredients.filter(i => i.is_default);
  const extras = ingredients.filter(i => !i.is_default);

  const toggleRemove = (name: string) =>
    setRemoved(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  const toggleExtra = (ing: MenuItemIngredient) =>
    setAdded(prev => prev.find(a => a.id === ing.id) ? prev.filter(a => a.id !== ing.id) : [...prev, ing]);

  const extrasTotal = added.reduce((s, i) => s + i.extra_price, 0);
  const finalPrice = Number(item.price) + extrasTotal;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto glass rounded-t-3xl sm:rounded-3xl border border-border/30 animate-slide-up">
        <div className="relative h-44 bg-gradient-to-br from-primary/20 via-secondary to-background overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Wine className="w-12 h-12 text-primary/40" strokeWidth={1.5} />
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <h2 className="font-display font-bold text-xl text-foreground">{item.name}</h2>
            {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
            <p className="text-lg font-bold text-primary mt-2">R$ {Number(item.price).toFixed(2)}</p>
          </div>

          {defaults.filter(d => d.is_removable).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Remover ingredientes</h3>
              <div className="flex flex-wrap gap-2">
                {defaults.filter(d => d.is_removable).map(ing => (
                  <button
                    key={ing.id}
                    onClick={() => toggleRemove(ing.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      removed.includes(ing.name)
                        ? 'bg-destructive/20 text-destructive line-through'
                        : 'bg-secondary/40 text-foreground'
                    }`}
                  >
                    {ing.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {extras.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 inline mr-1" />
                Adicionais
              </h3>
              <div className="space-y-2">
                {extras.map(ing => {
                  const isAdded = added.find(a => a.id === ing.id);
                  return (
                    <button
                      key={ing.id}
                      onClick={() => toggleExtra(ing)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                        isAdded
                          ? 'bg-primary/15 border border-primary/30'
                          : 'bg-secondary/30 border border-transparent'
                      }`}
                    >
                      <span className={isAdded ? 'text-foreground font-medium' : 'text-foreground'}>{ing.name}</span>
                      <span className={isAdded ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                        + R$ {ing.extra_price.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <MessageSquare className="w-3 h-3 inline mr-1" />
              Observações
            </h3>
            <Textarea
              placeholder="Ex: Bem passado, sem gelo..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="rounded-xl bg-secondary/30 resize-none h-20"
            />
          </div>

          <Button
            className="w-full h-13 rounded-2xl text-base font-semibold gap-2"
            onClick={() => onAdd(notes, removed, added)}
          >
            <Plus className="w-5 h-5" />
            Adicionar — R$ {finalPrice.toFixed(2)}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Client Order Component ───
const ClientOrderInner = () => {
  const { sessionId, clientToken } = useParams<{ sessionId: string; clientToken: string }>();
  const { toast } = useToast();
  const { items: cartItems, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCart();

  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState('');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<MenuItemIngredient[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [view, setView] = useState<'menu' | 'cart' | 'orders' | 'bill'>('menu');
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!sessionId || !clientToken) { setSessionValid(false); return; }
      const { data: session } = await supabase.from('sessions').select('status').eq('id', sessionId).maybeSingle();
      if (!session || session.status !== 'active') { setSessionValid(false); return; }
      const { data: client } = await supabase.from('session_clients').select('id, client_name, client_token, session_id, joined_at').eq('session_id', sessionId).eq('client_token', clientToken).maybeSingle();
      if (!client) { setSessionValid(false); return; }
      setClientName(client.client_name);
      setClientId(client.id);
      setSessionValid(true);
    };
    validate();
  }, [sessionId, clientToken]);

  useEffect(() => {
    const fetchMenu = async () => {
      const [catsRes, itemsRes, ingsRes] = await Promise.all([
        supabase.from('menu_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('menu_items').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('menu_item_ingredients').select('*'),
      ]);
      if (catsRes.data) setCategories(catsRes.data as MenuCategory[]);
      if (itemsRes.data) setMenuItems(itemsRes.data as MenuItem[]);
      if (ingsRes.data) setIngredients(ingsRes.data as MenuItemIngredient[]);
    };
    if (sessionValid) fetchMenu();
  }, [sessionValid]);

  const fetchOrders = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*, menu_item:menu_items(name, price))')
      .eq('session_client_id', clientId)
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
  }, [clientId]);

  useEffect(() => { if (clientId) fetchOrders(); }, [clientId, view, fetchOrders]);

  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel('client-orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_items' }, () => fetchOrders())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, fetchOrders]);

  const filteredItems = menuItems.filter(i => {
    if (selectedCategory && i.category_id !== selectedCategory) return false;
    if (searchQuery && !i.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const submitOrder = async () => {
    if (cartItems.length === 0 || submitting) return;
    setSubmitting(true);
    const { data: order, error } = await supabase.from('orders').insert({ session_id: sessionId, session_client_id: clientId }).select().single();
    if (error || !order) { toast({ title: 'Erro ao enviar pedido', variant: 'destructive' }); setSubmitting(false); return; }
    
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

    // Decrement stock for each item
    for (const ci of cartItems) {
      await supabase.rpc('decrement_stock', { _menu_item_id: ci.menuItem.id, _quantity: ci.quantity });
    }
    clearCart();
    setSubmitting(false);
    toast({ title: 'Pedido enviado! 🎉', description: 'Acompanhe o status na aba Pedidos.' });
    setView('orders');
    fetchOrders();
  };

  const handleAddFromDetail = (notes: string, removed: string[], added: MenuItemIngredient[]) => {
    if (!detailItem) return;
    addItem(detailItem, notes, removed, added);
    toast({ title: `${detailItem.name} adicionado!` });
    setDetailItem(null);
  };

  if (sessionValid === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (sessionValid === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <img src={pop9Logo} alt="POP9 BAR" className="w-20 h-auto mx-auto object-contain mb-2" style={{ mixBlendMode: 'lighten', filter: 'drop-shadow(0 0 10px hsl(38 92% 50% / 0.2))' }} />
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Sessão inválida</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Este link não é válido ou a comanda foi encerrada. Peça um novo link ao atendente.
          </p>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: JSX.Element; color: string; label: string }> = {
    pending: { icon: <Clock className="w-3 h-3" />, color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20', label: 'Pendente' },
    preparing: { icon: <Clock className="w-3 h-3" />, color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', label: 'Preparando' },
    ready: { icon: <CheckCircle2 className="w-3 h-3" />, color: 'bg-green-500/15 text-green-400 border-green-500/20', label: 'Pronto' },
    confirmed: { icon: <CheckCircle2 className="w-3 h-3" />, color: 'bg-primary/15 text-primary border-primary/20', label: 'Entregue' },
    served: { icon: <CheckCircle2 className="w-3 h-3" />, color: 'bg-primary/15 text-primary border-primary/20', label: 'Servido' },
    cancelled: { icon: <X className="w-3 h-3" />, color: 'bg-destructive/15 text-destructive border-destructive/20', label: 'Cancelado' },
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {detailItem && (
        <ItemDetailModal
          item={detailItem}
          ingredients={ingredients.filter(i => i.menu_item_id === detailItem.id)}
          onClose={() => setDetailItem(null)}
          onAdd={handleAddFromDetail}
        />
      )}

      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={pop9Logo} alt="POP9 BAR" className="w-9 h-9 object-contain" style={{ mixBlendMode: 'lighten' }} />
            <div>
              <h1 className="font-display font-bold text-base text-foreground leading-tight">PØP9 BAR</h1>
              <p className="text-[11px] text-muted-foreground">Olá, {clientName} 👋</p>
            </div>
          </div>
          <button onClick={() => setView(view === 'cart' ? 'menu' : 'cart')} className="relative p-2">
            <ShoppingBag className="w-5 h-5 text-foreground" />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full text-[10px] font-bold text-primary-foreground flex items-center justify-center animate-pulse-glow">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/30 safe-area-bottom">
        <div className="flex">
          {([
            { id: 'menu' as const, label: 'Cardápio', icon: Wine },
            { id: 'cart' as const, label: `Carrinho`, icon: ShoppingBag, badge: totalItems },
            { id: 'orders' as const, label: 'Pedidos', icon: Clock },
            { id: 'bill' as const, label: 'Conta', icon: CheckCircle2 },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 text-[11px] font-medium transition-all ${
                view === tab.id ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                <tab.icon className="w-5 h-5" />
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-primary rounded-full text-[8px] font-bold text-primary-foreground flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {view === 'menu' && (
        <main className="px-4 py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar no cardápio..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl bg-secondary/30 h-10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                !selectedCategory ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-16">
              <Wine className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-muted-foreground text-sm">Nenhum item encontrado</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredItems.map((item, idx) => {
                const itemIngredients = ingredients.filter(i => i.menu_item_id === item.id);
                const hasCustomization = itemIngredients.length > 0;

                    const stock = (item as any).stock_quantity ?? -1;
                const isOutOfStock = stock === 0;
                const isLowStock = stock !== -1 && stock <= ((item as any).stock_alert_threshold ?? 5) && stock > 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => !isOutOfStock && hasCustomization ? setDetailItem(item) : undefined}
                    className={`glass rounded-2xl overflow-hidden flex text-left animate-slide-up hover:border-primary/20 transition-all group ${isOutOfStock ? 'opacity-50 pointer-events-none' : ''}`}
                    style={{ animationDelay: `${idx * 0.03}s` }}
                    disabled={isOutOfStock}
                  >
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover flex-shrink-0" loading="lazy" />
                    )}
                    <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                          {isOutOfStock && <Badge variant="destructive" className="text-[8px] px-1 py-0">Esgotado</Badge>}
                          {isLowStock && <Badge className="text-[8px] px-1 py-0 bg-yellow-500/15 text-yellow-400 border-yellow-500/20">Últimas un.</Badge>}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm font-bold text-primary">R$ {Number(item.price).toFixed(2)}</p>
                        {!isOutOfStock && (
                          <Button
                            size="sm"
                            className="h-8 rounded-xl gap-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hasCustomization) {
                                setDetailItem(item);
                              } else {
                                addItem(item);
                                toast({ title: `${item.name} adicionado!` });
                              }
                            }}
                          >
                            <Plus className="w-3 h-3" />
                            {hasCustomization ? 'Personalizar' : 'Adicionar'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      )}

      {view === 'cart' && (
        <main className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-foreground">Seu Carrinho</h2>
            {cartItems.length > 0 && (
              <button onClick={clearCart} className="text-xs text-destructive flex items-center gap-1 hover:underline">
                <Trash2 className="w-3 h-3" /> Limpar
              </button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-14 h-14 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Seu carrinho está vazio</p>
              <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setView('menu')}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Ver cardápio
              </Button>
            </div>
          ) : (
            <>
              {cartItems.map((ci, idx) => {
                const extras = ci.addedIngredients.reduce((s, i) => s + i.extra_price, 0);
                const itemTotal = (Number(ci.menuItem.price) + extras) * ci.quantity;

                return (
                  <div key={idx} className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{ci.menuItem.name}</p>
                        {ci.removedIngredients.length > 0 && (
                          <p className="text-[10px] text-destructive/80 mt-0.5">
                            Sem: {ci.removedIngredients.join(', ')}
                          </p>
                        )}
                        {ci.addedIngredients.length > 0 && (
                          <p className="text-[10px] text-primary/80 mt-0.5">
                            +{ci.addedIngredients.map(a => a.name).join(', ')}
                          </p>
                        )}
                        {ci.notes && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 italic">"{ci.notes}"</p>
                        )}
                      </div>
                      <button onClick={() => removeItem(idx)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 bg-secondary/30 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(idx, ci.quantity - 1)}
                          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-secondary transition-colors"
                        >
                          <Minus className="w-3 h-3 text-foreground" />
                        </button>
                        <span className="text-sm font-semibold text-foreground w-6 text-center">{ci.quantity}</span>
                        <button
                          onClick={() => updateQuantity(idx, ci.quantity + 1)}
                          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-secondary transition-colors"
                        >
                          <Plus className="w-3 h-3 text-foreground" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-primary">R$ {itemTotal.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}

              <div className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</p>
                    <p className="text-lg font-bold text-foreground">Total</p>
                  </div>
                  <p className="text-2xl font-bold text-primary">R$ {totalPrice.toFixed(2)}</p>
                </div>
              </div>

              <Button
                className="w-full h-14 rounded-2xl text-base font-semibold gap-2"
                onClick={submitOrder}
                disabled={submitting}
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" /> Enviar Pedido
                  </>
                )}
              </Button>
            </>
          )}
        </main>
      )}

      {view === 'orders' && (
        <main className="px-4 py-4 space-y-4">
          <h2 className="font-display font-bold text-lg text-foreground">Seus Pedidos</h2>

          {orders.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="w-14 h-14 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum pedido ainda</p>
              <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setView('menu')}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Fazer pedido
              </Button>
            </div>
          ) : (
            orders.map((order, oi) => {
              const orderStatus = statusConfig[order.status] || statusConfig.pending;
              return (
                <div key={order.id} className="glass rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: `${oi * 0.05}s` }}>
                  <div className="p-4 border-b border-border/20 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground text-sm">
                        Pedido #{order.id.slice(0, 6).toUpperCase()}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge className={orderStatus.color + ' text-[10px] px-2 gap-1'}>
                      {orderStatus.icon}
                      {orderStatus.label}
                    </Badge>
                  </div>

                  <div className="divide-y divide-border/10">
                    {order.items?.map((item: any) => {
                      const itemStatus = statusConfig[item.status] || statusConfig.pending;
                      const showQR = ['pending', 'preparing', 'ready'].includes(item.status);

                      return (
                        <div key={item.id} className="p-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-foreground font-medium">
                              {item.quantity}x {item.menu_item?.name || 'Item'}
                            </p>
                            <Badge variant="outline" className={itemStatus.color + ' text-[9px] px-1.5 gap-0.5 border'}>
                              {itemStatus.icon}
                              {itemStatus.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            R$ {(Number(item.unit_price) * item.quantity).toFixed(2)}
                          </p>

                          {showQR && (
                            <div className="flex justify-center mt-3">
                              <QRCode
                                value={item.token}
                                size={100}
                                itemName={item.menu_item?.name}
                                type="delivery"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </main>
      )}

      {view === 'bill' && (
        <main className="px-4 py-4 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-display font-bold text-2xl text-foreground">Sua Comanda</h2>
            <p className="text-sm text-muted-foreground">Confira o extrato dos seus pedidos</p>
          </div>

          <div className="glass rounded-[2rem] overflow-hidden border border-border/30">
            <div className="p-6 space-y-4">
              {orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum item consumido ainda.</p>
              ) : (
                <div className="space-y-4">
                  {orders.flatMap(o => o.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.quantity}x {item.menu_item?.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          R$ {Number(item.unit_price).toFixed(2)} cada
                        </p>
                      </div>
                      <p className="font-bold text-foreground">
                        R$ {(Number(item.unit_price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  
                  <div className="h-[1px] bg-border/20 my-4" />
                  
                  <div className="flex justify-between items-center">
                    <p className="text-base font-bold text-foreground">Total Consumido</p>
                    <p className="text-2xl font-bold text-primary">
                      R$ {orders.reduce((sum, o) => sum + (o.items?.reduce((s: number, i: any) => s + (Number(i.unit_price) * i.quantity), 0) || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-14 rounded-2xl border-primary/20 text-primary font-bold gap-2"
            onClick={() => toast({ title: "Solicitação enviada!", description: "O atendente virá até sua mesa em breve." })}
          >
            <MessageSquare className="w-5 h-5" />
            Chamar Atendente / Fechar Conta
          </Button>
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
