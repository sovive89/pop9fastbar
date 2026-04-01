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
            <ExternalLink className="w-4 h-4" /> <span className="hidden sm:inline">Link</span>
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

      <div className="max-w-5xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Order list */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Consumo</h2>
            <span className="text-2xl font-black text-[#FF8A00]">R$ {total.toFixed(2)}</span>
          </div>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/20">
              <Wine className="w-12 h-12 mb-3 opacity-20" strokeWidth={1.5} />
              <p className="text-sm font-bold">Nenhum pedido ainda</p>
            </div>
          ) : (
            orders.map(order => (
              <Card key={order.id} className="bg-[#1A1A1A] border-white/5">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-bold text-white/80">Pedido</CardTitle>
                      <Badge className={`${statusLabel[order.status]?.color || 'bg-white/5 text-white/40'} text-[9px] py-0 h-4 border`}>
                        {statusLabel[order.status]?.label || order.status}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-white/30">{formatTime(order.created_at)}</span>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {order.items.map(it => {
                    const st = statusLabel[it.status] || { label: it.status, color: 'bg-white/5 text-white/40' };
                    return (
                      <div key={it.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white/90 truncate">{it.menu_item?.name}</span>
                            <Badge className={`${st.color} text-[8px] py-0 h-3.5 border`}>{st.label}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-white/40">{it.quantity}x R$ {Number(it.unit_price).toFixed(2)}</span>
                            <span className="text-[9px] text-white/20 font-mono">{it.token.slice(0, 8)}</span>
                            {it.notes && <span className="text-[9px] text-white/30 italic truncate max-w-[100px]">{it.notes}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-sm">R$ {(it.quantity * Number(it.unit_price)).toFixed(2)}</span>
                          {it.status !== 'cancelled' && it.status !== 'confirmed' && (
                            <div className="flex gap-1">
                              {it.status === 'pending' && (
                                <button onClick={() => updateItemStatus(it.id, 'preparing')} className="p-1 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors" title="Preparar">
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {it.status === 'preparing' && (
                                <button onClick={() => updateItemStatus(it.id, 'ready')} className="p-1 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors" title="Pronto">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {it.status === 'ready' && (
                                <button onClick={() => updateItemStatus(it.id, 'confirmed')} className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors" title="Entregue">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => cancelItem(it.id)} className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors" title="Cancelar">
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right: Menu / Add items panel */}
        <div className="lg:col-span-2 space-y-4">
          {isActive && (
            <>
              <Button onClick={() => setShowMenu(!showMenu)} className="w-full bg-[#FF8A00] text-black font-bold rounded-xl h-12 gap-2 text-sm">
                <Plus className="w-5 h-5" /> {showMenu ? 'Fechar Cardápio' : 'Lançar Itens'}
              </Button>

              {showMenu && (
                <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden">
                  {/* Search */}
                  <div className="p-3 border-b border-white/5">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <Input
                        placeholder="Buscar item..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 bg-white/5 border-white/10 rounded-xl h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-hide border-b border-white/5">
                    <button
                      onClick={() => setSelectedCat(null)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${!selectedCat ? 'bg-[#FF8A00] text-black' : 'bg-white/5 text-white/50 hover:text-white'}`}
                    >
                      Todos
                    </button>
                    {categories.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCat(c.id)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${selectedCat === c.id ? 'bg-[#FF8A00] text-black' : 'bg-white/5 text-white/50 hover:text-white'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>

                  {/* Items */}
                  <div className="max-h-[400px] overflow-y-auto p-3 space-y-1.5">
                    {filtered.length === 0 ? (
                      <div className="py-8 text-center">
                        <Wine className="w-8 h-8 text-white/10 mx-auto mb-2" strokeWidth={1.5} />
                        <p className="text-[10px] text-white/30">Nenhum item encontrado</p>
                      </div>
                    ) : (
                      filtered.map(item => {
                        const qty = getCartQty(item.id);
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${qty > 0 ? 'bg-[#FF8A00]/10 border border-[#FF8A00]/20' : 'bg-white/5 hover:bg-white/10'}`}
                          >
                            <div className="flex-1 min-w-0 mr-3">
                              <p className="text-sm font-bold text-white/90 truncate">{item.name}</p>
                              <p className="text-xs text-[#FF8A00] font-bold">R$ {Number(item.price).toFixed(2)}</p>
                            </div>
                            {qty === 0 ? (
                              <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-lg bg-[#FF8A00]/20 text-[#FF8A00] hover:bg-[#FF8A00] hover:text-black flex items-center justify-center transition-all">
                                <Plus className="w-4 h-4" />
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all">
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-sm font-black text-white w-5 text-center">{qty}</span>
                                <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-lg bg-[#FF8A00]/20 text-[#FF8A00] hover:bg-[#FF8A00] hover:text-black flex items-center justify-center transition-all">
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Cart footer */}
                  {cart.length > 0 && (
                    <div className="border-t border-white/5 p-3 space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {cart.map(e => (
                          <span key={e.item.id} className="text-[10px] px-2 py-1 bg-[#FF8A00]/10 text-[#FF8A00] rounded-lg flex items-center gap-1 font-bold">
                            {e.quantity}x {e.item.name}
                            <button onClick={() => setCart(prev => prev.filter(c => c.item.id !== e.item.id))} className="hover:text-red-400">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <Button onClick={submitOrder} disabled={submitting} className="w-full rounded-xl h-11 bg-[#FF8A00] text-black font-bold gap-2 text-sm">
                        {submitting ? (
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Enviar — {cartCount} {cartCount === 1 ? 'item' : 'itens'} · R$ {cartTotal.toFixed(2)}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Session info card */}
          <Card className="bg-[#1A1A1A] border-white/5">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Informações</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/40">Cliente</span>
                  <span className="font-bold">{client?.client_name}</span>
                </div>
                {(client as any)?.client_phone && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Telefone</span>
                    <span className="font-bold">{(client as any).client_phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/40">Abertura</span>
                  <span className="font-bold text-xs">{formatDateTime(session.opened_at)}</span>
                </div>
                {session.closed_at && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Fechamento</span>
                    <span className="font-bold text-xs">{formatDateTime(session.closed_at)}</span>
                  </div>
                )}
                {session.closed_at && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Duração</span>
                    <span className="font-bold text-xs">{getElapsed(session.opened_at)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/40">Status</span>
                  <Badge className={isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}>
                    {isActive ? 'Ativa' : 'Encerrada'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Total Itens</span>
                  <span className="font-bold">{allItems.length}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/5">
                  <span className="text-white/40 font-black uppercase text-[10px] tracking-widest">Total</span>
                  <span className="text-xl font-black text-[#FF8A00]">R$ {total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full border-white/10 text-white/40 hover:text-white rounded-xl gap-2">
            <Printer className="w-4 h-4" /> Imprimir Comanda
          </Button>
        </div>
      </div>

      {showCloseModal && client && (
        <CloseSessionModal
          sessionId={sessionId!}
          clientName={client.client_name}
          total={total}
          items={allItems.map(it => ({ name: it.menu_item?.name || '', quantity: it.quantity, unitPrice: Number(it.unit_price) }))}
          openedAt={session.opened_at}
          onClose={() => setShowCloseModal(false)}
          onClosed={() => { setShowCloseModal(false); fetchSession(); }}
        />
      )}
    </div>
  );
};

export default SessionDetailPage;
