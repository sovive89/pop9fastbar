import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UtensilsCrossed, Users, Tags, Settings, ArrowLeft, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AdminPage = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  if (role !== 'admin') return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-destructive">Acesso não autorizado</p></div>;

  const sections = [
    { label: 'Cardápio', desc: 'Gerenciar itens e categorias', icon: UtensilsCrossed, path: '/staff/admin/menu' },
    { label: 'Usuários', desc: 'Gerenciar equipe e papéis', icon: UserCog, path: '/staff/admin/users' },
    { label: 'Comandas', desc: 'Ver todas as comandas', icon: Tags, path: '/staff/sessions' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/staff')}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display font-bold text-lg text-foreground">Administração</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 space-y-3">
        {sections.map((s, i) => (
          <button key={s.label} onClick={() => navigate(s.path)} className="w-full glass rounded-2xl p-4 flex items-center gap-4 text-left hover:border-primary/30 transition-all animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><s.icon className="w-6 h-6 text-primary" /></div>
            <div><p className="font-semibold text-foreground">{s.label}</p><p className="text-sm text-muted-foreground">{s.desc}</p></div>
          </button>
        ))}
      </main>
    </div>
  );
};

export default AdminPage;
