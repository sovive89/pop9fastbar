import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UtensilsCrossed, ClipboardList, Users, Settings, LogOut, DollarSign, ShoppingBag, TrendingUp, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const [activeSessions, setActiveSessions] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const { count: sessCount } = await supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'active');
      setActiveSessions(sessCount || 0);
      const today = new Date().toISOString().split('T')[0];
      const { count: ordCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today);
      setTodayOrders(ordCount || 0);
    };
    fetchStats();
  }, []);

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  const roleLabel = role === 'admin' ? 'Administrador' : role === 'kitchen' ? 'Cozinha' : 'Atendente';

  const stats = [
    { label: 'Comandas Ativas', value: activeSessions.toString(), icon: Users },
    { label: 'Pedidos Hoje', value: todayOrders.toString(), icon: ShoppingBag },
    { label: 'Vendas Hoje', value: 'R$ 0', icon: DollarSign },
    { label: 'Ticket Médio', value: 'R$ 0', icon: TrendingUp },
  ];

  const actions = [
    { label: 'Nova Comanda', desc: 'Abrir sessão para mesa/cliente', icon: Plus, path: '/staff/sessions/new', roles: ['admin', 'attendant'] },
    { label: 'Comandas', desc: 'Ver comandas ativas', icon: ClipboardList, path: '/staff/sessions', roles: ['admin', 'attendant'] },
    { label: 'Pedidos', desc: 'Pedidos em tempo real', icon: Clock, path: '/staff/kitchen', roles: ['admin', 'kitchen', 'attendant'] },
    { label: 'Cardápio', desc: 'Gerenciar itens', icon: UtensilsCrossed, path: '/staff/admin/menu', roles: ['admin'] },
    { label: 'Configurações', desc: 'Admin do sistema', icon: Settings, path: '/staff/admin', roles: ['admin'] },
  ].filter(a => a.roles.includes(role || ''));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary/30">
              <AvatarFallback className="bg-primary/20 text-primary font-bold">{profile?.full_name?.charAt(0)?.toUpperCase() || 'P'}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-display font-bold text-foreground text-lg leading-tight">{profile?.full_name || 'POP9 BAR'}</h1>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{roleLabel}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Resumo</h2>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((s, i) => (
              <div key={s.label} className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <s.icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Ações</h2>
          <div className="grid gap-3">
            {actions.map((a, i) => (
              <button key={a.label} onClick={() => navigate(a.path)} className="glass rounded-2xl p-4 flex items-center gap-4 text-left hover:border-primary/30 transition-all duration-300 animate-slide-up" style={{ animationDelay: `${0.2 + i * 0.05}s` }}>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <a.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{a.label}</p>
                  <p className="text-sm text-muted-foreground">{a.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default StaffDashboard;
