import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  QrCode, UserPlus, ShoppingCart, Search, 
  Plus, Minus, Trash2, CreditCard, Banknote, 
  Printer, CheckCircle2, X, ArrowRight, User,
  Hash, Clock, Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManagerSidebarTrigger } from '@/components/ManagerSidebar';
import OrderScanner from '@/components/OrderScanner';
import type { MenuItem, MenuCategory, SessionClient } from '@/types';

const HybridPOSPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'scanner' | 'manual' | 'direct'>('scanner');
  const [loading, setLoading] = useState(false);
  
  // Manual / Direct Sale State
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  
  // Session Selection (for manual launch)
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [catRes, itemRes, sessionRes] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('menu_items').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('sessions')
        .select('*, session_clients(*)')
        .eq('status', 'active')
        .order('opened_at', { ascending: false })
    ]);

    if (catRes.data) setCategories(catRes.data);
    if (itemRes.data) setMenuItems(itemRes.data);
    if (sessionRes.data) setActiveSessions(sessionRes.data);
    setLoading(false);
  };

  const filteredItems = menuItems.filter(i => {
    if (selectedCat && i.category_id !== selectedCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredSessions = activeSessions.filter(s => {
    const clientName = s.session_clients?.[0]?.client_name || '';
    return clientName.toLowerCase().includes(sessionSearch.toLowerCase()) || 
           s.id.slice(0, 6).toLowerCase().includes(sessionSearch.toLowerCase());
  });

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(e => e.item.id === item.id);
      if (existing) return prev.map(e => e.item.id === item.id ? { ...e, quantity: e.quantity + 1 } : e);
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(e => e.item.id === itemId ? { ...e, quantity: Math.max(0, e.quantity + delta) } : e).filter(e => e.quantity > 0));
  };

  const cartTotal = cart.reduce((s, e) => s + Number(e.item.price) * e.quantity, 0);

  const handleDirectSale = async (method: 'card' | 'cash') => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      // 1. Create a direct sale order (no session)
      const { data: order, error: oErr } = await supabase
        .from('orders')
        .insert({ 
          status: 'completed', 
          order_type: 'direct_sale',
          paid_at: new Date().toISOString() 
        })
        .select().single();
      
      if (oErr || !order) throw oErr;

      // 2. Insert items
      const items = cart.map(e => ({
        order_id: order.id,
        menu_item_id: e.item.id,
        quantity: e.quantity,
        unit_price: Number(e.item.price),
        status: 'served'
      }));
      await supabase.from('order_items').insert(items);

      // 3. Record payment
      await supabase.from('payments').insert({
        order_id: order.id,
        amount: cartTotal,
        payment_method: method,
        status: 'approved'
      });

      toast({ title: 'Venda realizada com sucesso!' });
      setCart([]);
    } catch (err) {
      toast({ title: 'Erro ao processar venda', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleManualLaunch = async () => {
    if (cart.length === 0 || !selectedSessionId) return;
    setLoading(true);
    try {
      const session = activeSessions.find(s => s.id === selectedSessionId);
      const clientId = session?.session_clients?.[0]?.id;

      const { data: order, error: oErr } = await supabase
        .from('orders')
        .insert({ 
          session_id: selectedSessionId, 
          session_client_id: clientId,
          status: 'preparing',
          order_type: 'manual_launch'
        })
        .select().single();
      
      if (oErr || !order) throw oErr;

      const items = cart.map(e => ({
        order_id: order.id,
        menu_item_id: e.item.id,
        quantity: e.quantity,
        unit_price: Number(e.item.price),
        status: 'pending'
      }));
      await supabase.from('order_items').insert(items);

      toast({ title: 'Itens lançados na comanda!' });
      setCart([]);
      setSelectedSessionId(null);
    } catch (err) {
      toast({ title: 'Erro ao lançar itens', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#141414] sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ManagerSidebarTrigger />
          <div>
            <h1 className="text-2xl font-black tracking-tighter italic">PDV HÍBRIDO</h1>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Scanner • Manual • Venda Direta</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="outline" className="bg-[#FF8A00]/10 border-[#FF8A00]/20 text-[#FF8A00] font-black px-3 py-1">
             CAIXA ABERTO
           </Badge>
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Left Column: Actions & Menu */}
        <div className="lg:col-span-8 flex flex-col gap-6 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl w-full max-w-md">
              <TabsTrigger value="scanner" className="flex-1 rounded-xl data-[state=active]:bg-[#FF8A00] data-[state=active]:text-black font-bold gap-2">
                <QrCode className="w-4 h-4" /> Scanner
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1 rounded-xl data-[state=active]:bg-[#FF8A00] data-[state=active]:text-black font-bold gap-2">
                <UserPlus className="w-4 h-4" /> Comanda
              </TabsTrigger>
              <TabsTrigger value="direct" className="flex-1 rounded-xl data-[state=active]:bg-[#FF8A00] data-[state=active]:text-black font-bold gap-2">
                <ShoppingCart className="w-4 h-4" /> Direta
              </TabsTrigger>
            </TabsList>

            <div className="mt-6 flex-1 overflow-hidden">
              {activeTab === 'scanner' && (
                <div className="h-[60vh] flex items-center justify-center">
                  <Card className="bg-[#1A1A1A] border-white/10 w-full max-w-md">
                    <CardContent className="pt-12 pb-12 flex flex-col items-center gap-6">
                      <div className="w-48 h-48 border-2 border-dashed border-[#FF8A00]/30 rounded-[2.5rem] flex items-center justify-center relative">
                        <QrCode className="w-16 h-16 text-white/10" />
                        <div className="absolute inset-0 bg-[#FF8A00]/5 animate-pulse rounded-[2.5rem]" />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-black italic">AGUARDANDO QR CODE</h3>
                        <p className="text-white/40 text-xs font-medium">Aponte a câmera para o pedido do cliente</p>
                      </div>
                      <Button className="bg-[#FF8A00] text-black font-black rounded-xl px-8 h-12 gap-2 shadow-lg shadow-[#FF8A00]/10">
                        ATIVAR CÂMERA
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {(activeTab === 'manual' || activeTab === 'direct') && (
                <div className="flex flex-col gap-6 h-full">
                  {/* Menu Categories */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <Button 
                      variant={selectedCat === null ? 'default' : 'outline'}
                      onClick={() => setSelectedCat(null)}
                      className={`rounded-xl h-10 font-bold shrink-0 ${selectedCat === null ? 'bg-[#FF8A00] text-black' : 'border-white/10 text-white/60'}`}
                    >
                      Todos
                    </Button>
                    {categories.map(cat => (
                      <Button 
                        key={cat.id}
                        variant={selectedCat === cat.id ? 'default' : 'outline'}
                        onClick={() => setSelectedCat(cat.id)}
                        className={`rounded-xl h-10 font-bold shrink-0 ${selectedCat === cat.id ? 'bg-[#FF8A00] text-black' : 'border-white/10 text-white/60'}`}
                      >
                        {cat.name}
                      </Button>
                    ))}
                  </div>

                  {/* Search & Grid */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input 
                      placeholder="Buscar item no cardápio..." 
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="bg-white/5 border-white/10 h-12 pl-12 rounded-2xl text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2 max-h-[50vh] scrollbar-hide">
                    {filteredItems.map(item => (
                      <Card 
                        key={item.id} 
                        onClick={() => addToCart(item)}
                        className="bg-[#1A1A1A] border-white/5 hover:border-[#FF8A00]/30 transition-all cursor-pointer group active:scale-95"
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="w-full aspect-square bg-white/5 rounded-2xl overflow-hidden relative">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><ShoppingCart className="w-8 h-8 text-white/10" /></div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
                            <p className="text-[#FF8A00] font-black text-base">R$ {Number(item.price).toFixed(2)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Tabs>
        </div>

        {/* Right Column: Cart & Checkout */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-hidden">
          <Card className="bg-[#1A1A1A] border-white/10 flex-1 flex flex-col overflow-hidden rounded-[2.5rem]">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-black italic">CARRINHO</CardTitle>
                <Badge className="bg-white/5 text-white/40 border-white/10">{cart.length} itens</Badge>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/10 gap-4">
                  <ShoppingCart className="w-16 h-16" />
                  <p className="text-xs font-bold uppercase tracking-widest">Carrinho Vazio</p>
                </div>
              ) : (
                cart.map(entry => (
                  <div key={entry.item.id} className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                    <div className="w-12 h-12 bg-white/5 rounded-xl overflow-hidden shrink-0">
                      {entry.item.image_url && <img src={entry.item.image_url} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-white truncate">{entry.item.name}</h5>
                      <p className="text-[10px] text-white/40 font-bold">R$ {Number(entry.item.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg">
                      <button onClick={() => updateQty(entry.item.id, -1)} className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white"><Minus className="w-3 h-3" /></button>
                      <span className="text-xs font-black w-4 text-center">{entry.quantity}</span>
                      <button onClick={() => updateQty(entry.item.id, 1)} className="w-6 h-6 flex items-center justify-center text-[#FF8A00]"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>

            <CardFooter className="bg-white/[0.02] border-t border-white/5 p-6 flex flex-col gap-4">
              {activeTab === 'manual' && (
                <div className="w-full space-y-3">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Selecionar Comanda</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
                    <Input 
                      placeholder="Nome ou ID da comanda..." 
                      value={sessionSearch}
                      onChange={e => setSessionSearch(e.target.value)}
                      className="bg-white/5 border-white/10 h-10 pl-9 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                    {filteredSessions.map(s => (
                      <div 
                        key={s.id} 
                        onClick={() => setSelectedSessionId(s.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          selectedSessionId === s.id 
                            ? 'bg-[#FF8A00]/10 border-[#FF8A00] text-[#FF8A00]' 
                            : 'bg-white/5 border-white/5 text-white/60 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3" />
                          <span className="text-xs font-bold">{s.session_clients?.[0]?.client_name || 'Sem nome'}</span>
                        </div>
                        <span className="text-[10px] font-mono opacity-40">#{s.id.slice(0, 6).toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="w-full flex items-center justify-between py-2">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Total</span>
                <span className="text-2xl font-black italic text-[#FF8A00]">R$ {cartTotal.toFixed(2)}</span>
              </div>

              {activeTab === 'direct' ? (
                <div className="grid grid-cols-2 gap-3 w-full">
                  <Button 
                    onClick={() => handleDirectSale('card')}
                    disabled={cart.length === 0 || loading}
                    className="h-14 rounded-2xl bg-white text-black font-black gap-2 hover:bg-white/90"
                  >
                    <CreditCard className="w-5 h-5" /> CARTÃO
                  </Button>
                  <Button 
                    onClick={() => handleDirectSale('cash')}
                    disabled={cart.length === 0 || loading}
                    className="h-14 rounded-2xl bg-[#FF8A00] text-black font-black gap-2 hover:bg-[#FF8A00]/90"
                  >
                    <Banknote className="w-5 h-5" /> DINHEIRO
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleManualLaunch}
                  disabled={cart.length === 0 || !selectedSessionId || loading}
                  className="w-full h-14 rounded-2xl bg-[#FF8A00] text-black font-black text-lg gap-2 shadow-xl shadow-[#FF8A00]/10"
                >
                  {loading ? 'Processando...' : (
                    <>
                      LANÇAR NA COMANDA <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              )}
              
              <Button variant="ghost" size="sm" className="text-white/20 hover:text-white gap-2 mt-2">
                <Printer className="w-4 h-4" /> Imprimir Prévia
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HybridPOSPage;
