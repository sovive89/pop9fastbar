import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Apple, Mail, Phone, Facebook, Instagram, Chrome } from 'lucide-react';
import nightpassLogo from '@/assets/nightpass-logo.png';

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/eventos');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/20" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo and title */}
        <div className="text-center mb-8 animate-fade-in">
          <img 
            src={nightpassLogo} 
            alt="NightPass Logo" 
            className="w-56 h-auto object-contain"
          />
        </div>

        {/* Login buttons */}
        <div className="w-full max-w-sm space-y-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Button 
            variant="social" 
            size="full" 
            onClick={handleLogin}
            className="group"
          >
            <Apple className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Continuar com Apple
          </Button>

          <Button 
            variant="social" 
            size="full" 
            onClick={handleLogin}
            className="group"
          >
            <Chrome className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Continuar com Google
          </Button>

          <Button 
            variant="social" 
            size="full" 
            onClick={handleLogin}
            className="group"
          >
            <Mail className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Continuar com Email
          </Button>

          <Button 
            variant="social" 
            size="full" 
            onClick={handleLogin}
            className="group"
          >
            <Phone className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Continuar com Telefone
          </Button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground">ou redes sociais</span>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button 
              variant="glass" 
              size="icon" 
              onClick={handleLogin}
              className="w-14 h-14 rounded-xl hover:border-primary/50"
            >
              <Facebook className="w-6 h-6" />
            </Button>
            <Button 
              variant="glass" 
              size="icon" 
              onClick={handleLogin}
              className="w-14 h-14 rounded-xl hover:border-primary/50"
            >
              <Instagram className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Terms */}
        <p className="text-center text-sm text-muted-foreground mt-12 max-w-xs animate-fade-in" style={{ animationDelay: '0.4s' }}>
          Ao continuar, você concorda com nossos{' '}
          <span className="text-primary hover:underline cursor-pointer">Termos de Uso</span> e{' '}
          <span className="text-primary hover:underline cursor-pointer">Política de Privacidade</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
