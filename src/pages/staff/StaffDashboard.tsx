import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  LogOut, Clock, Plus, Printer, CheckCircle2, 
  LayoutDashboard, ShoppingBag, Users, Settings, BarChart3,
  Search, Flame, User as UserIcon, QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Session, SessionClient } from '@/types';
import OrderScanner from '@/components/OrderScanner';

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

  const [sessions, setSessions] = useState<(Session & { clients: SessionClient[] })[]>([]);
  const [sessionOrders, setSessionOrders] = useState<Record<string, SessionOrder[]>>({});
  const [loading, setLoading] = useState(true);
  const [showNewSession, setShowNewSession] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);

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

  const fetchAll = async () => {
    setLoading(true);
    const { data: sessList } = await supabase
      .from('sessions')
      .select('*, clients:session_clients(*)')
      .eq('status', 'active')
      .order('opened_at', { ascending: false });

    if (sessList) {
      setSessions(sessList as any);
      sessList.forEach(s => fetchSessionOrders(s.id));
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
    
    if (error) {
      toast({ title: 'Erro ao encerrar comanda', variant: 'destructive' });
    } else {
      toast({ title: 'Comanda encerrada com sucesso!' });
      fetchAll();
    }
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

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredSessions = sessions.filter(s => 
    s.clients[0]?.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.clients[0] as any)?.client_phone?.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans">
      {/* Sidebar / Top Nav */}
      <nav className="border-b border-white/10 bg-[#141414] sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter leading-none flex items-center gap-1">
              P<span className="text-[#FF8A00]">Ø</span>P9 <span className="text-xs font-medium tracking-widest text-white/40 ml-2">BAR</span>
            </h1>
          </div>
          
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

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input 
              placeholder="Buscar cliente..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 w-64 bg-white/5 border-white/10 rounded-xl h-10 text-sm focus:ring-1 ring-[#FF8A00]"
            />
          </div>
          <Button onClick={() => setShowScanner(true)} variant="outline" className="border-[#FF8A00] text-[#FF8A00] hover:bg-[#FF8A00]/10 font-bold rounded-xl h-10 gap-2">
            <QrCode className="w-5 h-5" /> <span className="hidden sm:inline">Bipar Pedido</span>
          </Button>
          <Button onClick={() => setShowNewSession(true)} className="bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black font-bold rounded-xl h-10 gap-2">
            <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Nova Comanda</span>
          </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/gestor/configuracoes')} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10">
            <Settings className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="rounded-xl border border-white/10 bg-white/5">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </nav>

      <main className="p-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Mapa de Comandas</h2>
            <p className="text-white/40 text-sm">Gerencie o consumo individual dos seus clientes em tempo real.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Ativas Agora</p>
              <p className="text-2xl font-black text-[#FF8A00]">{sessions.length}</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-right">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Total em Aberto</p>
              <p className="text-2xl font-black">R$ {sessions.reduce((acc, s) => acc + getSessionTotal(s.id), 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8A00]" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredSessions.map(session => {
              const client = session.clients[0];
              const total = getSessionTotal(session.id);
              const orders = sessionOrders[session.id] || [];

              return (
                <Card key={session.id} className="bg-[#1A1A1A] border-white/5 overflow-hidden group hover:border-[#FF8A00]/30 transition-all duration-300 shadow-2xl">
                  <CardHeader className="p-5 pb-4 space-y-0">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-bold text-white group-hover:text-[#FF8A00] transition-colors truncate max-w-[160px]">
                          {client?.client_name || 'Sem Nome'}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] text-white/60 font-medium py-0 h-5">
                            ID: {session.id.slice(0,4).toUpperCase()}
                          </Badge>
                          <div className="flex items-center gap-1 text-[10px] text-white/40 font-bold uppercase tracking-tighter">
                            <Clock className="w-3 h-3" /> {formatTime(session.opened_at)}
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#FF8A00]/10 p-2 rounded-xl">
                        <UserIcon className="w-5 h-5 text-[#FF8A00]" />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="px-5 py-0">
                    <div className="h-[180px] overflow-y-auto scrollbar-hide space-y-3">
                      {orders.flatMap(o => o.items).filter(it => it.status !== 'cancelled').map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs border-b border-white/5 pb-2 last:border-0">
                          <div className="flex flex-col">
                            <span className="font-bold text-white/90">{it.menu_item?.name}</span>
                            <span className="text-[10px] text-white/40">{it.quantity}x R$ {Number(it.unit_price).toFixed(2)}</span>
                          </div>
                          <span className="font-black text-white">R$ {(it.quantity * it.unit_price).toFixed(2)}</span>
                        </div>
                      ))}
                      {orders.flatMap(o => o.items).filter(it => it.status !== 'cancelled').length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-white/20 py-8">
                          <ShoppingBag className="w-8 h-8 mb-2 opacity-20" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Sem consumo</p>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-5 pt-4 bg-white/[0.02] border-t border-white/5 flex flex-col gap-4">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Total da Comanda</span>
                      <span className="text-xl font-black text-[#FF8A00]">R$ {total.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl h-10 text-xs font-bold gap-2">
                        <Printer className="w-4 h-4" /> Imprimir
                      </Button>
                      <Button onClick={() => closeSession(session.id)} size="sm" className="bg-white text-black hover:bg-white/90 rounded-xl h-10 text-xs font-bold gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Encerrar
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Nova Comanda - Dark Theme */}
        {showScanner && (
          <OrderScanner 
            onClose={() => setShowScanner(false)} 
            onSuccess={() => {
              fetchAll();
              setShowScanner(false);
            }} 
          />
        )}

        {showNewSession && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">          <Card className="w-full max-w-md bg-[#1A1A1A] border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-white/5 pb-6">
              <CardTitle className="text-2xl font-black text-white">ABRIR COMANDA</CardTitle>
              <p className="text-white/40 text-sm">Insira os dados do cliente para iniciar.</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Nome do Cliente</label>
                <Input 
                  placeholder="Ex: João Silva" 
                  value={clientName} 
                  onChange={e => setClientName(e.target.value)} 
                  className="bg-white/5 border-white/10 h-12 rounded-xl text-white focus:ring-[#FF8A00]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">WhatsApp (Opcional)</label>
                <Input 
                  placeholder="(00) 00000-0000" 
                  value={clientPhone} 
                  onChange={e => setClientPhone(e.target.value)} 
                  className="bg-white/5 border-white/10 h-12 rounded-xl text-white focus:ring-[#FF8A00]"
                />
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
