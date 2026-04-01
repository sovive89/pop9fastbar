import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  LogOut, Clock, Plus, Printer, CheckCircle2, 
  LayoutDashboard, ShoppingBag, Users, Settings, BarChart3,
  Search, Flame, User as UserIcon, QrCode, RotateCcw,
  Wine, ChevronDown, ChevronUp, ExternalLink, Hash, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Session, SessionClient } from '@/types';
import OrderScanner from '@/components/OrderScanner';
import StaffOrderModal from '@/components/StaffOrderModal';
import pop9Logo from '@/assets/pop9-logo.png';

interface SessionOrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  status: string;
  token: string;
  menu_item: { name: string; id: string } | null;
}

interface SessionOrder {
  id: string;
  status: string;
  created_at: string;
  session_client_id: string;
  items: SessionOrderItem[];
}

const statusLabel: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  preparing: { label: 'Preparando', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  ready: { label: 'Pronto', color: 'bg-green-500/15 text-green-400 border-green-500/20' },
  confirmed: { label: 'Entregue', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  served: { label: 'Servido', color: 'bg-primary/15 text-primary border-primary/20' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/15 text-red-400 border-red-500/20' },
};

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, signOut } = useAuth();

  const [sessions, setSessions] = useState<(Session & { clients: SessionClient[] })[]>([]);
  const [closedSessions, setClosedSessions] = useState<(Session & { clients: SessionClient[] })[]>([]);
  const [sessionOrders, setSessionOrders] = useState<Record<string, SessionOrder[]>>({});
  const [loading, setLoading] = useState(true);
  const [showNewSession, setShowNewSession] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  // Staff order modal
  const [orderModal, setOrderModal] = useState<{ sessionId: string; clientId: string; clientName: string } | null>(null);
  // Manual token confirm
  const [confirmToken, setConfirmToken] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);

  const fetchSessionOrders = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, created_at, session_client_id, items:order_items(id, quantity, unit_price, status, token, menu_item:menu_items(name, id))')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    if (data) {
      setSessionOrders(prev => ({ ...prev, [sessionId]: data as unknown as SessionOrder[] }));
    }
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [activeRes, closedRes] = await Promise.all([
      supabase.from('sessions').select('*, clients:session_clients(*)').eq('status', 'active').order('opened_at', { ascending: false }),
      supabase.from('sessions').select('*, clients:session_clients(*)').eq('status', 'closed').order('closed_at', { ascending: false }).limit(20),
    ]);

    if (activeRes.data) {
      setSessions(activeRes.data as any);
      activeRes.data.forEach(s => fetchSessionOrders(s.id));
    }
    if (closedRes.data) {
      setClosedSessions(closedRes.data as any);
      closedRes.data.forEach(s => fetchSessionOrders(s.id));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_clients' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
        if (payload.new?.session_id) fetchSessionOrders(payload.new.session_id);
        else fetchAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSessionOrders]);

  const closeSession = async (id: string) => {
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) toast({ title: 'Erro ao encerrar comanda', variant: 'destructive' });
    else { toast({ title: 'Comanda encerrada!' }); fetchAll(); }
  };

  const reopenSession = async (id: string) => {
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'active', closed_at: null })
      .eq('id', id);
    if (error) toast({ title: 'Erro ao reabrir comanda', variant: 'destructive' });
    else { toast({ title: 'Comanda reaberta!' }); fetchAll(); }
  };

  const confirmItemByToken = async () => {
    const token = confirmToken.trim();
    if (!token) return;

    const { data, error } = await supabase
      .from('order_items')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('token', token)
      .eq('status', 'pending')
      .select('id, menu_item:menu_items(name)')
      .maybeSingle();

    if (error || !data) {
      // Try other statuses
      const { data: existing } = await supabase
        .from('order_items')
        .select('status, menu_item:menu_items(name)')
        .eq('token', token)
        .maybeSingle();
      
      if (existing) {
        toast({ title: 'Item já confirmado', description: `Status: ${statusLabel[existing.status]?.label || existing.status}` });
      } else {
        toast({ title: 'Token não encontrado', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Item confirmado! ✅', description: (data as any).menu_item?.name || '' });
      fetchAll();
    }
    setConfirmToken('');
    setShowTokenModal(false);
  };

  const createSession = async () => {
    if (!clientName.trim()) { toast({ title: 'Informe o nome do cliente', variant: 'destructive' }); return; }
    setCreating(true);
    const { data: session, error } = await supabase.from('sessions').insert({ opened_by: user?.id, status: 'active' }).select().single();
    if (error || !session) { toast({ title: 'Erro ao criar comanda', variant: 'destructive' }); setCreating(false); return; }
    await supabase.from('session_clients').insert({ session_id: session.id, client_name: clientName.trim(), client_phone: clientPhone.replace(/\D/g, '') });
    toast({ title: 'Comanda aberta!' });
    setShowNewSession(false);
    setClientName('');
    setClientPhone('');
    setCreating(false);
    fetchAll();
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

  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (isoString: string) => new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  const getElapsed = (openedAt: string) => {
    const diff = Date.now() - new Date(openedAt).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const displaySessions = activeTab === 'active' ? sessions : closedSessions;
  const filteredSessions = displaySessions.filter(s =>
    s.clients[0]?.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.clients[0] as any)?.client_phone?.includes(searchQuery)
  );

  const copyClientLink = (session: Session) => {
    const link = `${window.location.origin}/cliente/pedido/${session.id}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copiado!' });
  };

  const renderSessionCard = (session: Session & { clients: SessionClient[] }) => {
    const client = session.clients[0];
    const total = getSessionTotal(session.id);
    const orders = sessionOrders[session.id] || [];
    const allItems = orders.flatMap(o => o.items).filter(it => it.status !== 'cancelled');
    const isExpanded = expandedCards.has(session.id);
    const isActive = session.status === 'active';

    return (
      <Card key={session.id} onClick={() => navigate(`/gestor/comanda/${session.id}`)} className={`bg-[#1A1A1A] border-white/5 overflow-hidden group hover:border-[#FF8A00]/30 transition-all duration-300 shadow-2xl cursor-pointer ${!isActive ? 'opacity-70' : ''}`}>
        <CardHeader className="p-5 pb-3 space-y-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <CardTitle className="text-lg font-bold text-white group-hover:text-[#FF8A00] transition-colors truncate max-w-[180px]">
                {client?.client_name || 'Sem Nome'}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] text-white/60 font-medium py-0 h-5">
                  <Hash className="w-2.5 h-2.5 mr-0.5" />{session.id.slice(0, 4).toUpperCase()}
                </Badge>
                <div className="flex items-center gap-1 text-[10px] text-white/40 font-bold uppercase tracking-tighter">
                  <Clock className="w-3 h-3" /> {formatTime(session.opened_at)}
                </div>
                {isActive && (
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[9px] py-0 h-4">
                    {getElapsed(session.opened_at)}
                  </Badge>
                )}
                {!isActive && session.closed_at && (
                  <Badge className="bg-white/5 text-white/40 border-white/10 text-[9px] py-0 h-4">
                    Fechada {formatDate(session.closed_at)}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isActive && (
                <button onClick={(e) => { e.stopPropagation(); copyClientLink(session); }} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Copiar link do cliente">
                  <ExternalLink className="w-4 h-4 text-white/40 hover:text-[#FF8A00]" />
                </button>
              )}
              <div className="bg-[#FF8A00]/10 p-2 rounded-xl">
                <UserIcon className="w-5 h-5 text-[#FF8A00]" />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 py-0">
          {/* Summary row */}
          <button onClick={() => toggleExpand(session.id)} className="w-full flex items-center justify-between py-2 text-white/40 hover:text-white/60 transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-widest">{allItems.length} {allItems.length === 1 ? 'item' : 'itens'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Expanded items */}
          <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[400px]' : 'max-h-[120px]'}`}>
            <div className="overflow-y-auto scrollbar-hide space-y-2 pb-2" style={{ maxHeight: isExpanded ? '380px' : '110px' }}>
              {allItems.map((it, idx) => {
                const st = statusLabel[it.status] || { label: it.status, color: 'bg-white/5 text-white/40' };
                return (
                  <div key={idx} className="flex items-center justify-between text-xs border-b border-white/5 pb-2 last:border-0 gap-2">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-bold text-white/90 truncate">{it.menu_item?.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40">{it.quantity}x R$ {Number(it.unit_price).toFixed(2)}</span>
                        <Badge className={`${st.color} text-[8px] py-0 h-3.5 border`}>{st.label}</Badge>
                      </div>
                    </div>
                    <span className="font-black text-white text-nowrap">R$ {(it.quantity * Number(it.unit_price)).toFixed(2)}</span>
                  </div>
                );
              })}
              {allItems.length === 0 && (
                <div className="flex flex-col items-center justify-center text-white/20 py-6">
                  <Wine className="w-8 h-8 mb-2 opacity-20" strokeWidth={1.5} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Sem consumo</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-5 pt-3 bg-white/[0.02] border-t border-white/5 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Total</span>
            <span className="text-xl font-black text-[#FF8A00]">R$ {total.toFixed(2)}</span>
          </div>
          <div className={`grid ${isActive ? 'grid-cols-3' : 'grid-cols-2'} gap-2 w-full`}>
            {isActive && (
              <Button
                onClick={() => navigate(`/gestor/comanda/${session.id}`)}
                variant="outline" size="sm"
                className="bg-[#FF8A00]/10 border-[#FF8A00]/20 hover:bg-[#FF8A00]/20 text-[#FF8A00] rounded-xl h-9 text-[10px] font-bold gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Lançar
              </Button>
            )}
            {isActive ? (
              <Button onClick={() => closeSession(session.id)} size="sm" className="bg-white text-black hover:bg-white/90 rounded-xl h-9 text-[10px] font-bold gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Fechar
              </Button>
            ) : (
              <Button onClick={() => reopenSession(session.id)} variant="outline" size="sm" className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl h-9 text-[10px] font-bold gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> Reabrir
              </Button>
            )}
            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl h-9 text-[10px] font-bold gap-1">
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans">
      {/* Nav */}
      <nav className="border-b border-white/10 bg-[#141414] sticky top-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <img src={pop9Logo} alt="POP9 BAR" className="w-10 h-10 object-contain" style={{ mixBlendMode: 'lighten' }} />

          <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <Button variant="ghost" size="sm" className="rounded-lg bg-white/10 text-white gap-2 h-9">
              <LayoutDashboard className="w-4 h-4" /> Comandas
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/gestor/crm')} className="rounded-lg text-white/60 hover:text-white gap-2 h-9">
              <Users className="w-4 h-4" /> CRM
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/gestor/relatorios-avancados')} className="rounded-lg text-white/60 hover:text-white gap-2 h-9">
              <BarChart3 className="w-4 h-4" /> Relatórios
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/gestor/cozinha')} className="rounded-lg text-white/60 hover:text-white gap-2 h-9">
              <Flame className="w-4 h-4" /> Cozinha
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/gestor/admin/menu')} className="rounded-lg text-white/60 hover:text-white gap-2 h-9">
              <ShoppingBag className="w-4 h-4" /> Cardápio
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              placeholder="Buscar cliente..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 w-48 lg:w-64 bg-white/5 border-white/10 rounded-xl h-9 text-sm focus:ring-1 ring-[#FF8A00]"
            />
          </div>
          <Button onClick={() => setShowTokenModal(true)} variant="outline" size="sm" className="border-white/20 text-white/60 hover:text-[#FF8A00] hover:border-[#FF8A00]/30 font-bold rounded-xl h-9 gap-1.5">
            <Hash className="w-4 h-4" /> <span className="hidden lg:inline">Token</span>
          </Button>
          <Button onClick={() => setShowScanner(true)} variant="outline" size="sm" className="border-[#FF8A00] text-[#FF8A00] hover:bg-[#FF8A00]/10 font-bold rounded-xl h-9 gap-1.5">
            <QrCode className="w-4 h-4" /> <span className="hidden sm:inline">Bipar</span>
          </Button>
          <Button onClick={() => setShowNewSession(true)} size="sm" className="bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black font-bold rounded-xl h-9 gap-1.5">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nova</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/gestor/configuracoes')} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 h-9 w-9">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="rounded-xl border border-white/10 bg-white/5 h-9 w-9">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <main className="p-4 md:p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Mapa de Comandas</h2>
            <p className="text-white/40 text-sm">Gerencie o consumo individual em tempo real.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Ativas</p>
              <p className="text-2xl font-black text-[#FF8A00]">{sessions.length}</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-right">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Total Aberto</p>
              <p className="text-2xl font-black">R$ {sessions.reduce((acc, s) => acc + getSessionTotal(s.id), 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-[#FF8A00] text-black' : 'bg-white/5 text-white/50 hover:text-white'}`}
          >
            Ativas ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'closed' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:text-white'}`}
          >
            Encerradas ({closedSessions.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8A00]" /></div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/20">
            <Wine className="w-16 h-16 mb-4 opacity-20" strokeWidth={1.5} />
            <p className="text-lg font-bold">Nenhuma comanda {activeTab === 'active' ? 'ativa' : 'encerrada'}</p>
            {activeTab === 'active' && (
              <Button onClick={() => setShowNewSession(true)} className="mt-4 bg-[#FF8A00] text-black font-bold rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Abrir Comanda
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredSessions.map(renderSessionCard)}
          </div>
        )}
      </main>

      {/* Modals */}
      {showScanner && (
        <OrderScanner onClose={() => setShowScanner(false)} onSuccess={() => { fetchAll(); setShowScanner(false); }} />
      )}

      {orderModal && (
        <StaffOrderModal
          sessionId={orderModal.sessionId}
          clientId={orderModal.clientId}
          clientName={orderModal.clientName}
          onClose={() => setOrderModal(null)}
          onOrderCreated={() => fetchAll()}
        />
      )}

      {/* Token confirmation modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-[#1A1A1A] border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FF8A00] p-2 rounded-xl">
                    <Hash className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-white">CONFIRMAR TOKEN</CardTitle>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Cole ou digite o código do item</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowTokenModal(false)} className="text-white/40 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <Input
                placeholder="Token do item (ex: a1b2c3d4e5f6)"
                value={confirmToken}
                onChange={e => setConfirmToken(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmItemByToken()}
                className="bg-white/5 border-white/10 h-14 rounded-xl text-white text-center text-lg font-mono tracking-widest focus:ring-[#FF8A00]"
                autoFocus
              />
            </CardContent>
            <CardFooter className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowTokenModal(false)} className="flex-1 h-12 rounded-xl text-white/60 font-bold">Cancelar</Button>
              <Button onClick={confirmItemByToken} className="flex-1 h-12 rounded-xl bg-[#FF8A00] text-black font-bold gap-2">
                <CheckCircle2 className="w-5 h-5" /> Confirmar
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* New session modal */}
      {showNewSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-[#1A1A1A] border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-white/5 pb-6">
              <CardTitle className="text-2xl font-black text-white">ABRIR COMANDA</CardTitle>
              <p className="text-white/40 text-sm">Insira os dados do cliente para iniciar.</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Nome do Cliente</label>
                <Input placeholder="Ex: João Silva" value={clientName} onChange={e => setClientName(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl text-white focus:ring-[#FF8A00]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">WhatsApp (Opcional)</label>
                <Input placeholder="(00) 00000-0000" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl text-white focus:ring-[#FF8A00]" />
              </div>
            </CardContent>
            <CardFooter className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowNewSession(false)} className="flex-1 h-12 rounded-xl text-white/60 font-bold">Cancelar</Button>
              <Button onClick={createSession} disabled={creating} className="flex-1 h-12 rounded-xl bg-[#FF8A00] text-black font-bold">
                {creating ? 'Criando...' : 'Confirmar'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
