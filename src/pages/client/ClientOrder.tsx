import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  ShoppingBag, Search, Plus, Minus, X, Send, CheckCircle2,
  Clock, ChevronLeft, AlertCircle, Sparkles, Trash2,
  UtensilsCrossed, MessageSquare, QrCode as QrCodeIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MenuCategory, MenuItem, MenuItemIngredient } from '@/types';
import QRCode from '@/components/QRCode';

const ClientOrder = () => {
  const { sessionId, clientToken } = useParams<{ sessionId: string; clientToken: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items: cartItems, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCart();

  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState('');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'menu' | 'cart' | 'orders' | 'qrcode'>('menu');
  const [orderQrData, setOrderQrData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!sessionId || !clientToken) { setSessionValid(false); return; }
      const { data: session } = await supabase.from('sessions').select('status').eq('id', sessionId).maybeSingle();
      if (!session || session.status !== 'active') { setSessionValid(false); return; }
      const { data: client } = await supabase.from('session_clients').select('*').eq('session_id', sessionId).eq('client_token', clientToken).maybeSingle();
      if (!client) { setSessionValid(false); return; }
      setClientName(client.client_name);
      setClientId(client.id);
      setSessionValid(true);
    };
    validate();
  }, [sessionId, clientToken]);

  useEffect(() => {
    const fetchMenu = async () => {
      const [catsRes, itemsRes] = await Promise.all([
        supabase.from('menu_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('menu_items').select('*').eq('is_active', true).order('sort_order'),
      ]);
      if (catsRes.data) setCategories(catsRes.data as MenuCategory[]);
      if (itemsRes.data) setMenuItems(itemsRes.data as MenuItem[]);
    };
    if (sessionValid) fetchMenu();
  }, [sessionValid]);

  const generateOrderQRCode = () => {
    if (cartItems.length === 0) return;
    
    const orderData = {
      sid: sessionId,
      cid: clientId,
      cname: clientName,
      items: cartItems.map(item => ({
        id: item.menuItem.id,
        n: item.menuItem.name,
        q: item.quantity,
        p: item.menuItem.price,
        notes: item.notes || ''
      })),
      t: totalPrice,
      ts: Date.now()
    };

    setOrderQrData(JSON.stringify(orderData));
    setView('qrcode');
  };

  if (sessionValid === false) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">SESSÃO INVÁLIDA</h1>
        <p className="text-white/40 mb-6">Esta comanda foi encerrada ou o link expirou.</p>
        <Button onClick={() => navigate('/abrir')} className="bg-[#FF8A00] text-black font-bold rounded-xl h-12 px-8">
          Abrir Nova Comanda
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white pb-24">
      <header className="bg-[#141414] border-b border-white/5 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-tighter leading-none">
            P<span className="text-[#FF8A00]">Ø</span>P9 <span className="text-[10px] font-medium tracking-widest text-white/40 ml-1 uppercase">BAR</span>
          </h1>
          <p className="text-[10px] font-bold text-[#FF8A00] uppercase tracking-widest mt-1">Olá, {clientName.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView('orders')} className="rounded-xl bg-white/5 border border-white/10 relative">
            <Clock className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setView('cart')} className="rounded-xl bg-white/5 border border-white/10 relative">
            <ShoppingBag className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FF8A00] text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </header>

      {view === 'menu' && (
        <main className="p-6 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input 
              placeholder="O que vamos beber hoje?" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white/5 border-white/10 h-12 rounded-xl pl-10 text-white focus:ring-[#FF8A00]"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button 
              variant={selectedCategory === null ? 'default' : 'ghost'}
              onClick={() => setSelectedCategory(null)}
              className={`rounded-xl font-bold h-10 ${selectedCategory === null ? 'bg-[#FF8A00] text-black' : 'text-white/60'}`}
            >
              Todos
            </Button>
            {categories.map(cat => (
              <Button 
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'ghost'}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl font-bold h-10 whitespace-nowrap ${selectedCategory === cat.id ? 'bg-[#FF8A00] text-black' : 'text-white/60'}`}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {menuItems
              .filter(i => (!selectedCategory || i.category_id === selectedCategory) && (!searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase())))
              .map(item => (
                <Card key={item.id} className="bg-[#1A1A1A] border-white/5 overflow-hidden flex h-32">
                  <div className="w-32 h-full bg-white/5 flex items-center justify-center shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <UtensilsCrossed className="w-8 h-8 text-white/10" />
                    )}
                  </div>
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm">{item.name}</h3>
                      <p className="text-[10px] text-white/40 line-clamp-2 mt-1">{item.description}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#FF8A00]">R$ {Number(item.price).toFixed(2)}</span>
                      <Button size="sm" onClick={() => addItem(item)} className="bg-white text-black hover:bg-white/90 rounded-lg h-8 w-8 p-0">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </main>
      )}

      {view === 'cart' && (
        <main className="p-6 space-y-6 animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setView('menu')} className="rounded-xl bg-white/5 border border-white/10">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-black">MEU PEDIDO</h2>
          </div>

          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/20">
              <ShoppingBag className="w-16 h-16 mb-4 opacity-10" />
              <p className="font-bold uppercase tracking-widest">Carrinho Vazio</p>
              <Button onClick={() => setView('menu')} variant="link" className="text-[#FF8A00] mt-2">Voltar ao Menu</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cartItems.map((item, index) => (
                  <div key={index} className="bg-[#1A1A1A] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-white">{item.menuItem.name}</h4>
                      <p className="text-xs text-[#FF8A00] font-black">R$ {(item.quantity * item.menuItem.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl p-1 border border-white/10">
                      <button onClick={() => updateQuantity(index, Math.max(0, item.quantity - 1))} className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-black w-4 text-center text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(index, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Card className="bg-[#FF8A00] border-none rounded-[2rem] p-6 text-black">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold uppercase tracking-widest text-[10px] opacity-60">Total do Pedido</span>
                  <span className="text-3xl font-black italic">R$ {totalPrice.toFixed(2)}</span>
                </div>
                <Button 
                  onClick={generateOrderQRCode} 
                  className="w-full h-14 bg-black text-[#FF8A00] hover:bg-black/90 rounded-2xl font-black text-lg gap-3 shadow-xl"
                >
                  <QrCodeIcon className="w-6 h-6" /> GERAR QR CODE
                </Button>
                <p className="text-[10px] font-bold text-center mt-4 opacity-60 uppercase tracking-tighter">
                  Apresente o código no balcão para validar seu pedido
                </p>
              </Card>
            </>
          )}
        </main>
      )}

      {view === 'qrcode' && orderQrData && (
        <main className="p-6 flex flex-col items-center justify-center min-h-[80vh] space-y-8 animate-in zoom-in-95 duration-300">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black tracking-tighter italic">VALIDAR PEDIDO</h2>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Mostre este código no balcão</p>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-[0_0_50px_rgba(255,138,0,0.3)]">
            <QRCode value={orderQrData} size={250} type="order" />
          </div>

          <div className="w-full max-w-xs space-y-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Valor a ser lançado</p>
              <p className="text-2xl font-black text-[#FF8A00]">R$ {totalPrice.toFixed(2)}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setView('menu')} 
              className="w-full h-12 rounded-xl border-white/10 bg-white/5 text-white font-bold"
            >
              Voltar ao Menu
            </Button>
          </div>
        </main>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-[#141414]/80 backdrop-blur-xl border-t border-white/5 px-8 py-4 flex items-center justify-between z-50">
        <button onClick={() => setView('menu')} className={`flex flex-col items-center gap-1 ${view === 'menu' ? 'text-[#FF8A00]' : 'text-white/30'}`}>
          <UtensilsCrossed className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Menu</span>
        </button>
        <button onClick={() => setView('cart')} className={`flex flex-col items-center gap-1 relative ${view === 'cart' || view === 'qrcode' ? 'text-[#FF8A00]' : 'text-white/30'}`}>
          <ShoppingBag className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Pedido</span>
          {totalItems > 0 && <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF8A00] rounded-full animate-pulse" />}
        </button>
        <button onClick={() => setView('orders')} className={`flex flex-col items-center gap-1 ${view === 'orders' ? 'text-[#FF8A00]' : 'text-white/30'}`}>
          <Clock className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Consumo</span>
        </button>
      </nav>
    </div>
  );
};

export default ClientOrder;
