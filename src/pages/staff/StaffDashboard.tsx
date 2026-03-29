import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  ClipboardList, LogOut, Clock, Plus, X, ChefHat,
  Copy, UserPlus, XCircle, Settings, ShoppingBag, Flame,
  ChevronDown, ChevronUp, User, DollarSign, RotateCcw, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Session, SessionClient } from '@/types';
import pop9Logo from '@/assets/pop9-logo.png';
import StaffOrderModal from '@/components/StaffOrderModal';

interface SessionOrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  status: string;
  menu_item: { name: string; id: string } | null;
}

interface SessionOrder {
  id: string;
  status: string;
  created_at: string;
  session_client_id: string;
  items: SessionOrderItem[];
}

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, signOut } = useAuth();

  const [tab, setTab] = useState<'comandas' | 'pedidos'>('comandas');
  const [activeSessions, setActiveSessions] = useState(0);
  const [closedToday, setClosedToday] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [pendingItems, setPendingItems] = useState(0);
  const [sessions, setSessions] = useState<(Session & { clients: SessionClient[] })[]>([]);
  const [showNewSession, setShowNewSession] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [orderModal, setOrderModal] = useState<{ sessionId: string; clientId: string; clientName: string } | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionOrders, setSessionOrders] = useState<Record<string, SessionOrder[]>>({});

  const canManageSessions = role === 'admin' || role === 'attendant';

  const fetchAll = async () => {
    const today = new Date().toISOString().split('T')[0];
    const [sessRes, closedRes, ordRes, itemsRes, sessListRes] = await Promise.all([
      supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'closed').gte('closed_at', today),
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('order_items').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      canManageSessions
        ? supabase.from('sessions').select('*, clients:session_clients(*)').eq('status', 'active').order('opened_at', { ascending: false })
        : Promise.resolve({ data: null }),
    ]);
    setActiveSessions(sessRes.count || 0);
    setClosedToday(closedRes.count || 0);
    setTodayOrders(ordRes.count || 0);
    setPendingItems(itemsRes.count || 0);
    if (sessListRes.data) setSessions(sessListRes.data as any);
  };

  const fetchRecentOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*, menu_item:menu_items(name)), client:session_clients(client_name)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setRecentOrders(data);
  };

  const fetchSessionOrders = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, created_at, session_client_id, items:order_items(id, quantity, unit_price, status, menu_item:menu_items(name, id))')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    if (data) {
      setSessionOrders(prev => ({ ...prev, [sessionId]: data as unknown as SessionOrder[] }));
    }
  }, []);

  useEffect(() => { fetchAll(); fetchRecentOrders(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_clients' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchAll(); fetchRecentOrders();
        if (expandedSession) fetchSessionOrders(expandedSession);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchAll(); fetchRecentOrders();
        if (expandedSession) fetchSessionOrders(expandedSession);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [expandedSession, fetchSessionOrders]);

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  const roleLabel = role === 'admin' ? 'ADMIN' : role === 'kitchen' ? 'COZINHA' : 'ATENDENTE';

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const createSession = async () => {
    if (!clientName.trim()) { toast({ title: 'Informe o nome do cliente', variant: 'destructive' }); return; }
    if (clientPhone.replace(/\D/g, '').length < 10) { toast({ title: 'Informe um celular válido', variant: 'destructive' }); return; }
    setCreating(true);
    const { data: session, error } = await supabase.from('sessions').insert({ opened_by: user?.id }).select().single();
    if (error || !session) { toast({ title: 'Erro ao criar comanda', variant: 'destructive' }); setCreating(false); return; }
    await supabase.from('session_clients').insert({ session_id: session.id, client_name: clientName.trim(), client_phone: clientPhone.replace(/\D/g, '') } as any);
    toast({ title: 'Comanda aberta!' });
    setShowNewSession(false);
    setClientName('');
    setClientPhone('');
    setCreating(false);
    fetchAll();
  };

  const closeSession = async (id: string) => {
    await supabase.from('sessions').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', id);
    toast({ title: 'Comanda encerrada' });
    fetchAll();
  };

  const addClient = async (sessionId: string) => {
    const name = prompt('Nome do cliente:');
    if (!name?.trim()) return;
    await supabase.from('session_clients').insert({ session_id: sessionId, client_name: name.trim() });
    fetchAll();
  };

  const copyLink = (sessionId: string, token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/order/${sessionId}/${token}`);
    toast({ title: 'Link copiado!' });
  };

  const toggleExpand = (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
      if (!sessionOrders[sessionId]) fetchSessionOrders(sessionId);
    }
  };

  const getSessionTotal = (sessionId: string): number => {
    const orders = sessionOrders[sessionId];
    if (!orders) return 0;
    return orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.items
        .filter(it => it.status !== 'cancelled')
        .reduce((s, it) => s + it.quantity * Number(it.unit_price), 0), 0);
  };

  const getSessionItemCount = (sessionId: string): number => {
    const orders = sessionOrders[sessionId];
    if (!orders) return 0;
    return orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.items
        .filter(it => it.status !== 'cancelled')
        .reduce((s, it) => s + it.quantity, 0), 0);
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendente', preparing: 'Preparando', ready: 'Pronto', served: 'Servido', cancelled: 'Cancelado',
  };

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400',
    preparing: 'text-orange-400',
    ready: 'text-primary',
    served: 'text-muted-foreground',
    cancelled: 'text-destructive/50',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <img src={pop9Logo} alt="POP9" className="w-7 h-7 object-contain" style={{ filter: 'brightness(0) invert(0)' }} />
            </div>
            <div>
              <h1 className="font-display font-bold text-foreground text-sm uppercase tracking-wide leading-tight">
                PØP9
              </h1>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{roleLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {role === 'admin' && (
              <Button variant="outline" size="sm" onClick={() => navigate('/staff/admin')} className="rounded-xl gap-1.5 h-8 text-xs border-primary/30 text-primary">
                <Settings className="w-3.5 h-3.5" /> Admin
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive h-8 w-8">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto flex border-t border-border/20">
          <button
            onClick={() => setTab('comandas')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-medium transition-all border-b-2 ${
              tab === 'comandas' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Comandas
          </button>
          <button
            onClick={() => setTab('pedidos')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-medium transition-all border-b-2 ${
              tab === 'pedidos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Pedidos
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">

        {/* ─── COMANDAS TAB ─── */}
        {tab === 'comandas' && (
          <>
            {/* Status counters */}
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/30 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs text-muted-foreground">Ativas: <span className="text-foreground font-semibold">{activeSessions}</span></span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/30 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span className="text-xs text-muted-foreground">Encerradas hoje: <span className="text-foreground font-semibold">{closedToday}</span></span>
              </div>
              {pendingItems > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                  <Flame className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary font-medium">{pendingItems} itens pendentes</span>
                </div>
              )}
            </div>

            {/* New session button + form */}
            {canManageSessions && (
              <>
                {!showNewSession ? (
                  <Button onClick={() => setShowNewSession(true)} className="rounded-xl gap-1.5 h-10">
                    <Plus className="w-4 h-4" /> Nova Comanda
                  </Button>
                ) : (
                  <div className="glass rounded-2xl p-4 space-y-3 animate-slide-up border border-primary/20">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground text-sm">Abrir Comanda</h3>
                      <button onClick={() => setShowNewSession(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Nome completo *" value={clientName} onChange={e => setClientName(e.target.value)} className="rounded-xl bg-secondary/30 h-10" />
                      <Input placeholder="(00) 00000-0000" value={clientPhone} onChange={e => setClientPhone(formatPhone(e.target.value))} className="rounded-xl bg-secondary/30 h-10" type="tel" />
                    </div>
                    <Button onClick={createSession} disabled={creating} className="w-full rounded-xl h-10">
                      {creating ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Abrir Comanda</>}
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Comandas list - collapsible cards */}
            {sessions.length === 0 && !showNewSession ? (
              <div className="py-16 flex flex-col items-center justify-center">
                <ClipboardList className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground text-sm">Nenhuma comanda ativa</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session, i) => {
                  const code = session.id.slice(0, 4).toUpperCase();
                  const clientCount = session.clients?.length || 0;
                  const timeStr = new Date(session.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const elapsed = Math.floor((Date.now() - new Date(session.opened_at).getTime()) / 60000);
                  const elapsedStr = elapsed < 60 ? `${elapsed}min` : `${Math.floor(elapsed / 60)}h${elapsed % 60 > 0 ? String(elapsed % 60).padStart(2, '0') : ''}`;
                  const isExpanded = expandedSession === session.id;
                  const orders = sessionOrders[session.id] || [];
                  const total = getSessionTotal(session.id);
                  const itemCount = getSessionItemCount(session.id);

                  return (
                    <div
                      key={session.id}
                      className="glass rounded-2xl border border-primary/30 overflow-hidden animate-slide-up transition-all"
                      style={{ animationDelay: `${i * 0.03}s` }}
                    >
                      {/* Collapsed header - always visible */}
                      <button
                        onClick={() => toggleExpand(session.id)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/10 transition-colors"
                      >
                        {/* Code badge */}
                        <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                          <span className="font-display font-bold text-sm text-primary">{code}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-foreground">{clientCount}</span>
                            </div>
                            {sessionOrders[session.id] && (
                              <span className="text-xs text-muted-foreground">· {itemCount} itens</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground">{timeStr}</span>
                            <span className="text-[11px] text-primary font-medium">· {elapsedStr}</span>
                          </div>
                        </div>

                        {/* Total + chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          {sessionOrders[session.id] && total > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-lg">
                              <DollarSign className="w-3 h-3 text-primary" />
                              <span className="text-xs font-bold text-primary">
                                {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-border/20 animate-slide-up">
                          {/* Clients */}
                          <div className="px-4 py-3 space-y-2">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Clientes</p>
                            {session.clients?.map(client => (
                              <div key={client.id} className="flex items-center justify-between py-1">
                                <button
                                  onClick={() => setOrderModal({ sessionId: session.id, clientId: client.id, clientName: client.client_name })}
                                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                                >
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <span className="truncate">{client.client_name}</span>
                                </button>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setOrderModal({ sessionId: session.id, clientId: client.id, clientName: client.client_name })}
                                    className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Pedir
                                  </button>
                                  <button
                                    onClick={() => copyLink(session.id, client.client_token)}
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Orders / consumption */}
                          {orders.length > 0 && (
                            <div className="border-t border-border/20 px-4 py-3 space-y-2">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Consumo</p>
                              {orders.filter(o => o.status !== 'cancelled').map(order => (
                                <div key={order.id} className="bg-secondary/20 rounded-xl p-2.5 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" />
                                      {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      {' · '}
                                      {session.clients?.find(c => c.id === order.session_client_id)?.client_name || ''}
                                    </span>
                                    <span className={`text-[10px] font-medium ${statusColors[order.status] || 'text-muted-foreground'}`}>
                                      {statusLabels[order.status] || order.status}
                                    </span>
                                  </div>
                                  {order.items?.filter(it => it.status !== 'cancelled').map(item => (
                                    <div key={item.id} className="flex items-center justify-between text-xs">
                                      <span className="text-foreground/80">
                                        {item.quantity}x {item.menu_item?.name || 'Item'}
                                      </span>
                                      <span className="text-muted-foreground font-medium">
                                        R$ {(item.quantity * Number(item.unit_price)).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ))}

                              {/* Total */}
                              <div className="flex items-center justify-between pt-2 border-t border-border/20">
                                <span className="text-xs font-semibold text-foreground">Total da comanda</span>
                                <span className="text-sm font-bold text-primary">
                                  R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          )}

                          {orders.length === 0 && sessionOrders[session.id] && (
                            <div className="border-t border-border/20 px-4 py-4 text-center">
                              <p className="text-xs text-muted-foreground">Nenhum pedido ainda</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="border-t border-border/20 flex">
                            <button
                              onClick={() => addClient(session.id)}
                              className="flex-1 py-2.5 text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1 transition-colors"
                            >
                              <UserPlus className="w-3.5 h-3.5" /> Adicionar Cliente
                            </button>
                            <div className="w-px bg-border/20" />
                            <button
                              onClick={() => closeSession(session.id)}
                              className="flex-1 py-2.5 text-xs text-destructive/70 hover:text-destructive flex items-center justify-center gap-1 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Fechar Comanda
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ─── PEDIDOS TAB ─── */}
        {tab === 'pedidos' && (
          <>
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/30 rounded-lg">
                <ShoppingBag className="w-3 h-3 text-primary" />
                <span className="text-xs text-muted-foreground">Hoje: <span className="text-foreground font-semibold">{todayOrders}</span></span>
              </div>
              {pendingItems > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg animate-pulse">
                  <Flame className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary font-medium">{pendingItems} pendentes</span>
                </div>
              )}
            </div>

            {(role === 'admin' || role === 'kitchen' || role === 'attendant') && (
              <Button variant="outline" onClick={() => navigate('/staff/kitchen')} className="rounded-xl gap-1.5 border-primary/30 text-primary">
                <ChefHat className="w-4 h-4" /> Abrir Painel da Cozinha
              </Button>
            )}

            {recentOrders.length === 0 ? (
              <div className="py-16 flex flex-col items-center">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum pedido ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order, i) => (
                  <div key={order.id} className="glass rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 0.03}s` }}>
                    <div className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-foreground text-sm">
                          #{order.id.slice(0, 6).toUpperCase()}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {order.client && <> · {order.client.client_name}</>}
                        </p>
                      </div>
                      <Badge className={`text-[10px] px-2 ${
                        order.status === 'served' ? 'bg-primary/15 text-primary border-primary/20'
                        : order.status === 'cancelled' ? 'bg-destructive/15 text-destructive border-destructive/20'
                        : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
                      }`}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </div>
                    <div className="px-3 pb-3 flex flex-wrap gap-1">
                      {order.items?.map((item: any) => (
                        <span key={item.id} className="text-[10px] px-2 py-0.5 bg-secondary/30 rounded text-muted-foreground">
                          {item.quantity}x {item.menu_item?.name || 'Item'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Staff Order Modal */}
      {orderModal && (
        <StaffOrderModal
          sessionId={orderModal.sessionId}
          clientId={orderModal.clientId}
          clientName={orderModal.clientName}
          onClose={() => setOrderModal(null)}
          onOrderCreated={() => {
            fetchAll();
            fetchRecentOrders();
            if (expandedSession) fetchSessionOrders(expandedSession);
          }}
        />
      )}
    </div>
  );
};

export default StaffDashboard;
