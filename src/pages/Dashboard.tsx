import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart3, 
  UtensilsCrossed, 
  ClipboardList, 
  Users, 
  Settings, 
  LogOut, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const stats = [
    { label: 'Vendas Hoje', value: 'R$ 0,00', icon: DollarSign, trend: '+0%' },
    { label: 'Pedidos', value: '0', icon: ShoppingBag, trend: '+0%' },
    { label: 'Clientes', value: '0', icon: Users, trend: '+0%' },
    { label: 'Ticket Médio', value: 'R$ 0,00', icon: TrendingUp, trend: '+0%' },
  ];

  const quickActions = [
    { label: 'Cardápio', description: 'Gerenciar itens do bar', icon: UtensilsCrossed, path: '/cardapio' },
    { label: 'Pedidos', description: 'Pedidos em andamento', icon: ClipboardList, path: '/pedidos' },
    { label: 'Relatórios', description: 'Vendas e desempenho', icon: BarChart3, path: '/relatorios' },
    { label: 'Configurações', description: 'Dados do bar', icon: Settings, path: '/configuracoes' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary/30">
              <AvatarFallback className="bg-primary/20 text-primary font-bold">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'B'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-display font-bold text-foreground text-lg leading-tight">
                {profile?.full_name || 'Meu Bar'}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Painel de Controle
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Resumo do dia</h2>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, i) => (
              <div 
                key={stat.label}
                className="glass rounded-2xl p-4 animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">{stat.trend}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Ações rápidas</h2>
          <div className="grid gap-3">
            {quickActions.map((action, i) => (
              <button
                key={action.label}
                onClick={() => {/* TODO: navigate(action.path) */}}
                className="glass rounded-2xl p-4 flex items-center gap-4 text-left hover:border-primary/30 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${0.2 + i * 0.05}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <action.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{action.label}</p>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Empty state for recent orders */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Últimos pedidos</h2>
          <div className="glass rounded-2xl p-8 text-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <ClipboardList className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum pedido ainda</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Os pedidos dos clientes aparecerão aqui</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
