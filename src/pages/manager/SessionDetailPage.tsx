import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft, Clock, Plus, Minus, Printer, CheckCircle2,
  RotateCcw, ExternalLink, Hash, Wine, Search, Send,
  X, ChevronDown, ChevronUp, User as UserIcon, XCircle, Trash2
} from 'lucide-react';
import pop9Logo from '@/assets/pop9-logo.png';
import CloseSessionModal from '@/components/CloseSessionModal';
import type { MenuCategory, MenuItem, SessionClient } from '@/types';

interface OrderItemRow {
  id: string;
  quantity: number;
  unit_price: number;
  status: string;
  token: string;
  notes: string | null;
  menu_item: { name: string; id: string } | null;
}

interface OrderRow {
  id: string;
  status: string;
  created_at: string;
  session_client_id: string;
  items: OrderItemRow[];
}

const statusLabel: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  preparing: { label: 'Preparando', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  ready: { label: 'Pronto', color: 'bg-green-500/15 text-green-400 border-green-500/20' },
  confirmed: { label: 'Entregue', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  served: { label: 'Servido', color: 'bg-primary/15 text-primary border-primary/20' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
};

interface CartEntry { item: MenuItem; quantity: number; notes: string; }

const SessionDetailPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<any>(null);
  const [client, setClient] = useState<SessionClient | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Menu / cart
  const [showMenu, setShowMenu] = useState(false);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    const [sRes, cRes, oRes] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', sessionId).single(),
      supabase.from('session_clients').select('*').eq('session_id', sessionId).limit(1).single(),
      supabase.from('orders')
        .select('id, status, created_at, session_client_id, items:order_items(id, quantity, unit_price, status, token, notes, menu_item:menu_items(name, id))')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false }),
    ]);
    if (sRes.data) setSession(sRes.data);
    if (cRes.data) setClient(cRes.data as SessionClient);
    if (oRes.data) setOrders(oRes.data as unknown as OrderRow[]);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
    // Load menu
    Promise.all([
      supabase.from('menu_categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('menu_items').select('*').eq('is_active', true).order('sort_order'),
    ]).then(([cRes, iRes]) => {
      if (cRes.data) setCategories(cRes.data as MenuCategory[]);
      if (iRes.data) setMenuItems(iRes.data as MenuItem[]);
    });
  }, [fetchSession]);

  // Realtime
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `session_id=eq.${sessionId}` }, () => fetchSession())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchSession())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, fetchSession]);

  const isActive = session?.status === 'active';

  const allItems = orders.flatMap(o => o.items).filter(it => it.status !== 'cancelled');
  const total = allItems.reduce((s, it) => s + it.quantity * Number(it.unit_price), 0);

  const closeSession = async () => {
    await supabase.from('sessions').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', sessionId);
    toast({ title: 'Comanda encerrada!' });
    fetchSession();
  };

  const reopenSession = async () => {
    await supabase.from('sessions').update({ status: 'active', closed_at: null }).eq('id', sessionId);
    toast({ title: 'Comanda reaberta!' });
    fetchSession();
  };

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    await supabase.from('order_items').update({ status: newStatus, ...(newStatus === 'confirmed' ? { confirmed_at: new Date().toISOString() } : {}) }).eq('id', itemId);
    toast({ title: `Status atualizado para ${statusLabel[newStatus]?.label || newStatus}` });
    fetchSession();
  };

  const cancelItem = async (itemId: string) => {
    await supabase.from('order_items').update({ status: 'cancelled' }).eq('id', itemId);
    toast({ title: 'Item cancelado' });
    fetchSession();
  };

  const copyClientLink = () => {
    const link = `${window.location.origin}/cliente/pedido/${sessionId}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copiado!' });
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatDateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const getElapsed = (openedAt: string) => {
    const diff = Date.now() - new Date(openedAt).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  // Cart logic
  const filtered = menuItems.filter(i => {
    if (selectedCat && i.category_id !== selectedCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(e => e.item.id === item.id);
      if (existing) return prev.map(e => e.item.id === item.id ? { ...e, quantity: e.quantity + 1 } : e);
      return [...prev, { item, quantity: 1, notes: '' }];
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(e => e.item.id === itemId ? { ...e, quantity: Math.max(0, e.quantity + delta) } : e).filter(e => e.quantity > 0));
  };

  const getCartQty = (itemId: string) => cart.find(e => e.item.id === itemId)?.quantity || 0;
  const cartTotal = cart.reduce((s, e) => s + Number(e.item.price) * e.quantity, 0);
  const cartCount = cart.reduce((s, e) => s + e.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0 || !client) return;
    setSubmitting(true);
    try {
      const { data: order, error: oErr } = await supabase
        .from('orders')
        .insert({ session_id: sessionId!, session_client_id: client.id, status: 'pending' })
        .select().single();
      if (oErr || !order) throw oErr;

      const items = cart.map(e => ({
        order_id: order.id,
        menu_item_id: e.item.id,
        quantity: e.quantity,
        unit_price: Number(e.item.price),
        notes: e.notes || null,
        status: 'pending',
      }));
      const { error: iErr } = await supabase.from('order_items').insert(items);
      if (iErr) throw iErr;

      toast({ title: 'Pedido lançado com sucesso!' });
      setCart([]);
      setShowMenu(false);
      fetchSession();
    } catch {
      toast({ title: 'Erro ao lançar pedido', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8A00]" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center text-white gap-4">
        <p className="text-lg">Comanda não encontrada</p>
        <Button onClick={() => navigate('/gestor')} className="bg-[#FF8A00] text-black">Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans">
      {/* Top bar */}
      <nav className="border-b border-white/10 bg-[#141414] sticky top-0 z-40 px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gestor')} className="rounded-xl border border-white/10 bg-white/5 h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src={pop9Logo} alt="POP9" className="w-8 h-8 object-contain" style={{ mixBlendMode: 'lighten' }} />
          <div>
            <h1 className="text-base font-bold leading-tight">{client?.client_name || 'Sem nome'}</h1>
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <Hash className="w-3 h-3" />{session.id.slice(0, 6).toUpperCase()}
              <Clock className="w-3 h-3 ml-1" />{formatTime(session.opened_at)}
              {isActive && <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[9px] py-0 h-4 ml-1">{getElapsed(session.opened_at)}</Badge>}
              {!isActive && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] py-0 h-4 ml-1">Encerrada</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={copyClientLink} variant="outline" size="sm" className="border-white/20 text-white/60 hover:text-[#FF8A00] rounded-xl h-9 gap-1">
            <ExternalLink className="w-3 h-3" /> <span className="hidden sm:inline">Link</span>
          </Button>
          <Button onClick={() => setShowCloseModal(true)} variant="outline" size="sm" className="border-white/20 text-white/60 hover:text-[#FF8A00] rounded-xl h-9 gap-1">
            <Printer className="w-3 h-3" /> <span className="hidden sm:inline">Imprimir</span>
          </Button>
          {isActive ? (
            <Button onClick={() => setShowCloseModal(true)} size="sm" className="bg-white text-black hover:bg-white/90 rounded-xl h-9 gap-1 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" /> Fechar
            </Button>
          ) : (
            <Button onClick={reopenSession} variant="outline" size="sm" className="border-white/20 text-white rounded-xl h-9 gap-1 font-bold text-xs">
              <RotateCcw className="w-4 h-4" /> Reabrir
            </Button>
          )}
        </div>
      </nav>

      <main className="p-4 md:p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Order history */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black italic tracking-tighter">HISTÓRICO DE CONSUMO</h2>
            <Badge className="bg-white/5 text-white/40 border-white/10">{allItems.length} itens</Badge>
          </div>

          {orders.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-white/5 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                <Wine className="w-8 h-8 text-white/10" />
              </div>
              <p className="text-white/40 font-bold text-sm uppercase tracking-widest">Nenhum consumo registrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <Card key={order.id} className="bg-[#1A1A1A] border-white/5 overflow-hidden rounded-2xl">
                  <CardHeader className="bg-white/[0.02] py-3 px-4 border-b border-white/5 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] text-white/40">#{order.id.slice(0, 4).toUpperCase()}</Badge>
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{formatTime(order.created_at)}</span>
                    </div>
                    <Badge className={statusLabel[order.status]?.color || 'bg-white/5'}>
                      {statusLabel[order.status]?.label || order.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                      {order.items.map(item => (
                        <div key={item.id} className="p-4 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                              <Wine className="w-5 h-5 text-white/20" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm">{item.menu_item?.name || 'Item removido'}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-white/40">{item.quantity}x R$ {Number(item.unit_price).toFixed(2)}</span>
                                {item.notes && <Badge variant="outline" className="text-[9px] py-0 h-4 border-white/10 text-white/30">Obs: {item.notes}</Badge>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-sm mr-2">R$ {(item.quantity * item.unit_price).toFixed(2)}</span>
                            {isActive && item.status !== 'served' && item.status !== 'cancelled' && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button onClick={() => updateItemStatus(item.id, 'served')} size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-green-400 hover:bg-green-400/10">
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button onClick={() => cancelItem(item.id)} size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-red-400 hover:bg-red-400/10">
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right: Summary & Quick Add */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-[#1A1A1A] border-white/10 rounded-[2.5rem] overflow-hidden sticky top-24">
            <CardHeader className="bg-[#FF8A00] p-6 text-black">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Acumulado</p>
              <h3 className="text-4xl font-black italic tracking-tighter">R$ {total.toFixed(2)}</h3>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {isActive && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-white/30">Lançamento Rápido</h4>
                    <Button onClick={() => setShowMenu(!showMenu)} variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase text-[#FF8A00] hover:bg-[#FF8A00]/10">
                      {showMenu ? 'Fechar' : 'Abrir Cardápio'}
                    </Button>
                  </div>

                  {showMenu ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
                        <Input 
                          placeholder="Buscar item..." 
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="bg-white/5 border-white/10 h-9 pl-9 rounded-xl text-xs"
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                        {filtered.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex-1 min-w-0 mr-2">
                              <p className="text-xs font-bold truncate">{item.name}</p>
                              <p className="text-[10px] text-[#FF8A00] font-black">R$ {Number(item.price).toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getCartQty(item.id) > 0 && (
                                <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg">
                                  <button onClick={() => updateQty(item.id, -1)} className="w-5 h-5 flex items-center justify-center text-white/40"><Minus className="w-3 h-3" /></button>
                                  <span className="text-[10px] font-black w-3 text-center">{getCartQty(item.id)}</span>
                                  <button onClick={() => addToCart(item)} className="w-5 h-5 flex items-center justify-center text-[#FF8A00]"><Plus className="w-3 h-3" /></button>
                                </div>
                              )}
                              {getCartQty(item.id) === 0 && (
                                <Button onClick={() => addToCart(item)} size="icon" variant="ghost" className="h-8 w-8 rounded-lg bg-white/5 hover:bg-[#FF8A00] hover:text-black transition-all">
                                  <Plus className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {cart.length > 0 && (
                        <div className="pt-4 border-t border-white/5 space-y-3">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-white/40">Subtotal</span>
                            <span>R$ {cartTotal.toFixed(2)}</span>
                          </div>
                          <Button onClick={submitOrder} disabled={submitting} className="w-full bg-white text-black font-black h-11 rounded-xl gap-2">
                            {submitting ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> LANÇAR {cartCount} ITENS</>}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={() => setShowMenu(true)} variant="outline" className="h-20 rounded-2xl border-white/5 bg-white/5 flex flex-col gap-2 hover:border-[#FF8A00]/30 transition-all">
                        <Plus className="w-5 h-5 text-[#FF8A00]" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Lançar Item</span>
                      </Button>
                      <Button onClick={() => setShowCloseModal(true)} variant="outline" className="h-20 rounded-2xl border-white/5 bg-white/5 flex flex-col gap-2 hover:border-white/20 transition-all">
                        <Printer className="w-5 h-5 text-white/40" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Imprimir</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/20">
                  <span>Informações</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Status</span>
                    <Badge className={isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}>
                      {isActive ? 'Ativa' : 'Encerrada'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Abertura</span>
                    <span className="text-xs font-bold">{formatDateTime(session.opened_at)}</span>
                  </div>
                  {session.closed_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">Fechamento</span>
                      <span className="text-xs font-bold">{formatDateTime(session.closed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {showCloseModal && (
        <CloseSessionModal 
          sessionId={sessionId!}
          clientName={client?.client_name || 'Sem nome'}
          total={total}
          openedAt={session.opened_at}
          items={allItems.map(it => ({ name: it.menu_item?.name || 'Item', quantity: it.quantity, unitPrice: Number(it.unit_price) }))}
          onClose={() => setShowCloseModal(false)}
          onClosed={() => {
            setShowCloseModal(false);
            fetchSession();
          }}
        />
      )}
    </div>
  );
};

export default SessionDetailPage;
