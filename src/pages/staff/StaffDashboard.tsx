import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  UtensilsCrossed, ClipboardList, Users, Settings, LogOut,
  ShoppingBag, Clock, Plus, QrCode, X, ChefHat, Flame,
  Copy, UserPlus, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Session, SessionClient } from '@/types';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, role, signOut } = useAuth();

  const [activeSessions, setActiveSessions] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [pendingItems, setPendingItems] = useState(0);
  const [sessions, setSessions] = useState<(Session & { clients: SessionClient[] })[]>([]);
  const [showNewSession, setShowNewSession] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const canManageSessions = role === 'admin' || role === 'attendant';

  const fetchAll = async () => {
    const [sessRes, ordRes, itemsRes, sessListRes] = await Promise.all([
      supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]),
      supabase.from('order_items').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      canManageSessions
        ? supabase.from('sessions').select('*, clients:session_clients(*)').eq('status', 'active').order('opened_at', { ascending: false })
        : Promise.resolve({ data: null }),
    ]);
    setActiveSessions(sessRes.count || 0);
    setTodayOrders(ordRes.count || 0);
    setPendingItems(itemsRes.count || 0);
    if (sessListRes.data) setSessions(sessListRes.data as any);
  };

  useEffect(() => { fetchAll(); }, []);

  // Realtime for sessions
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_clients' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  const roleLabel = role === 'admin' ? 'Admin' : role === 'kitchen' ? 'Cozinha' : 'Atendente';
  const roleIcon = role === 'admin' ? Settings : role === 'kitchen' ? ChefHat : Users;
  const RoleIcon = roleIcon;

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

  const stats = [
    { label: 'Comandas', value: activeSessions, icon: ClipboardList, color: 'text-primary' },
    { label: 'Pedidos hoje', value: todayOrders, icon: ShoppingBag, color: 'text-blue-400' },
    { label: 'Itens pendentes', value: pendingItems, icon: Flame, color: 'text-orange-400' },
  ];

  const quickActions = [
    { label: 'Pedidos', desc: 'Tempo real', icon: Clock, path: '/staff/kitchen', roles: ['admin', 'kitchen', 'attendant'] },
    { label: 'Cardápio', desc: 'Gerenciar', icon: UtensilsCrossed, path: '/staff/admin/menu', roles: ['admin'] },
    { label: 'Admin', desc: 'Sistema', icon: Settings, path: '/staff/admin', roles: ['admin'] },
  ].filter(a => a.roles.includes(role || ''));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary/40">
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'P'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-display font-bold text-foreground text-base leading-tight">
                {profile?.full_name || 'POP9 BAR'}
              </h1>
              <div className="flex items-center gap-1.5">
                <RoleIcon className="w-3 h-3 text-primary" />
                <span className="text-[11px] text-primary font-medium">{roleLabel}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-6">
        {/* Stats strip */}
        <div className="flex gap-3">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="flex-1 glass rounded-2xl p-4 animate-slide-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        {quickActions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {quickActions.map(a => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="glass rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/30 transition-all min-w-fit"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <a.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{a.label}</p>
                  <p className="text-[11px] text-muted-foreground">{a.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Comandas Map */}
        {canManageSessions && (
          <section className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Mapa de Comandas
              </h2>
              <Button
                size="sm"
                onClick={() => setShowNewSession(!showNewSession)}
                className="rounded-xl gap-1.5 h-8 text-xs"
              >
                {showNewSession ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {showNewSession ? 'Cancelar' : 'Nova'}
              </Button>
            </div>

            {/* New session form */}
            {showNewSession && (
              <div className="glass rounded-2xl p-4 mb-4 space-y-3 animate-slide-up border border-primary/20">
                <h3 className="font-semibold text-foreground text-sm">Abrir Comanda</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Nome completo *"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="rounded-xl bg-secondary/30 h-10"
                  />
                  <Input
                    placeholder="(00) 00000-0000"
                    value={clientPhone}
                    onChange={e => setClientPhone(formatPhone(e.target.value))}
                    className="rounded-xl bg-secondary/30 h-10"
                    type="tel"
                  />
                </div>
                <Button
                  onClick={createSession}
                  disabled={creating}
                  className="w-full rounded-xl h-10"
                >
                  {creating ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Abrir Comanda
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Sessions grid */}
            {sessions.length === 0 && !showNewSession ? (
              <div className="glass rounded-2xl py-16 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground text-sm">Nenhuma comanda aberta</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Clique em "Nova" para começar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sessions.map((session, i) => {
                  const timeStr = new Date(session.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const label = session.table_number
                    ? `Mesa ${session.table_number}`
                    : `#${session.id.slice(0, 6).toUpperCase()}`;

                  return (
                    <div
                      key={session.id}
                      className="glass rounded-2xl overflow-hidden hover:border-primary/20 transition-all duration-300 animate-slide-up group"
                      style={{ animationDelay: `${0.35 + i * 0.05}s` }}
                    >
                      {/* Session header */}
                      <div className="px-4 pt-4 pb-3 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <p className="font-bold text-foreground text-sm">{label}</p>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Aberta às {timeStr}
                          </p>
                        </div>
                        <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[10px] px-2">
                          Ativa
                        </Badge>
                      </div>

                      {/* Clients */}
                      <div className="px-4 space-y-1.5">
                        {session.clients?.map(client => (
                          <div
                            key={client.id}
                            className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2"
                          >
                            <button
                              onClick={() => navigate(`/order/${session.id}/${client.client_token}`)}
                              className="flex items-center gap-2 group/client"
                            >
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-primary">
                                  {client.client_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-xs text-foreground font-medium group-hover/client:text-primary transition-colors underline-offset-2 group-hover/client:underline">
                                {client.client_name}
                              </span>
                            </button>
                            <button
                              onClick={() => copyLink(session.id, client.client_token)}
                              className="flex items-center gap-1 text-[10px] text-primary hover:text-accent transition-colors px-2 py-1 rounded-md hover:bg-primary/10"
                            >
                              <Copy className="w-3 h-3" />
                              Link
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="px-4 py-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-lg text-[11px] h-8 border-border/50"
                          onClick={() => addClient(session.id)}
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          Cliente
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-lg text-[11px] h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => closeSession(session.id)}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Encerrar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Kitchen role: show direct link to orders */}
        {role === 'kitchen' && (
          <section className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={() => navigate('/staff/kitchen')}
              className="w-full glass rounded-2xl p-6 flex items-center gap-4 hover:border-primary/30 transition-all group"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:shadow-glow transition-shadow">
                <ChefHat className="w-7 h-7 text-primary" />
              </div>
              <div className="text-left flex-1">
                <p className="font-display font-bold text-foreground text-lg">Painel da Cozinha</p>
                <p className="text-sm text-muted-foreground">Ver pedidos em tempo real</p>
              </div>
              <div className="flex items-center gap-2">
                {pendingItems > 0 && (
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 animate-pulse">
                    {pendingItems} pendente{pendingItems !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </button>
          </section>
        )}
      </main>
    </div>
  );
};

export default StaffDashboard;
