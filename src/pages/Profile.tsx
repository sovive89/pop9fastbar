import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { User, Mail, Wallet, Calendar, MapPin, Settings, LogOut, CreditCard, Bell, Shield, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useApp();

  const menuItems = [
    { icon: Wallet, label: 'Carteira', description: `Saldo: R$ ${user?.walletBalance?.toFixed(2) || '0.00'}`, action: () => {} },
    { icon: CreditCard, label: 'Formas de Pagamento', description: 'Gerencie seus cartões', action: () => {} },
    { icon: Calendar, label: 'Meus Ingressos', description: 'Eventos comprados', action: () => navigate('/sacola') },
    { icon: Bell, label: 'Notificações', description: 'Configurar alertas', action: () => {} },
    { icon: Shield, label: 'Privacidade', description: 'Dados e segurança', action: () => {} },
    { icon: Settings, label: 'Configurações', description: 'Preferências do app', action: () => {} },
    { icon: HelpCircle, label: 'Ajuda', description: 'Suporte e FAQ', action: () => {} },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header showBack title="Meu Perfil" />

      {/* Profile Card */}
      <main className="container mx-auto px-4 py-6">
        <div className="glass rounded-2xl p-6 mb-6 animate-slide-up">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 border-2 border-primary/30">
              <AvatarImage src="" alt={user?.name} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-display">
                <User className="w-10 h-10" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-display font-bold text-foreground">
                {user?.name || 'Usuário'}
              </h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Mail className="w-3 h-3" />
                {user?.email || 'usuario@email.com'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full font-medium">
                  Premium
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  São Paulo, SP
                </span>
              </div>
            </div>
          </div>
          
          <Button className="w-full mt-4" variant="outline">
            Editar Perfil
          </Button>
        </div>

        {/* Menu Items */}
        <div className="glass rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {menuItems.map((item, index) => (
            <div key={item.label}>
              <button
                onClick={item.action}
                className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </button>
              {index < menuItems.length - 1 && <Separator className="mx-4" />}
            </div>
          ))}
        </div>

        {/* Logout */}
        <Button 
          variant="ghost" 
          className="w-full mt-6 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => navigate('/')}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da Conta
        </Button>
      </main>
    </div>
  );
};

export default Profile;
