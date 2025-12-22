import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Chrome, Facebook, ArrowRight, Sparkles } from 'lucide-react';
import nightpassLogo from '@/assets/nightpass-logo.png';
import { useAuth } from '@/contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      navigate('/eventos');
    }
  }, [user, loading, navigate]);

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        {/* Main gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/5" />
        
        {/* Animated orbs */}
        <div 
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full animate-float"
          style={{
            background: 'radial-gradient(circle, hsl(38 92% 50% / 0.08) 0%, transparent 70%)',
            animationDelay: '0s',
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full animate-float"
          style={{
            background: 'radial-gradient(circle, hsl(38 92% 50% / 0.06) 0%, transparent 70%)',
            animationDelay: '1.5s',
          }}
        />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(38 92% 50%) 1px, transparent 1px),
              linear-gradient(90deg, hsl(38 92% 50%) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top decorative line */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          {/* Logo Section */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="relative inline-block">
              <img 
                src={nightpassLogo} 
                alt="NightPass" 
                className="w-80 h-auto object-contain animate-glow-pulse"
                style={{ mixBlendMode: 'lighten' }}
              />
            </div>
            
            {/* Tagline */}
            <p className="text-muted-foreground text-lg mt-6 tracking-wide">
              Sua noite começa aqui
            </p>
          </div>

          {/* Action Section */}
          <div className="w-full max-w-sm space-y-6">
            {/* Main CTA */}
            <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Button 
                size="lg" 
                onClick={handleGetStarted} 
                className="w-full h-16 rounded-2xl text-lg font-semibold group relative overflow-hidden bg-gradient-to-r from-primary via-accent to-primary animate-gradient"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Começar Agora
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </div>

            {/* Social login */}
            <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="relative py-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/30" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-6 text-sm text-muted-foreground">
                    ou acesse com
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={handleGoogleLogin} 
                  className="h-14 rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
                >
                  <Chrome className="w-5 h-5 mr-2 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">Google</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={handleGetStarted} 
                  className="h-14 rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
                >
                  <Facebook className="w-5 h-5 mr-2 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">Facebook</span>
                </Button>
              </div>
            </div>

            {/* Features highlight */}
            <div className="animate-slide-up pt-8" style={{ animationDelay: '0.4s' }}>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { icon: '🎫', label: 'Eventos' },
                  { icon: '🍸', label: 'Bares' },
                  { icon: '✨', label: 'Experiências' },
                ].map((item, i) => (
                  <div 
                    key={item.label}
                    className="glass rounded-xl p-4 hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pb-8 px-6 text-center animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
            Ao continuar, você concorda com nossos{' '}
            <span className="text-primary/80 hover:text-primary cursor-pointer transition-colors">Termos</span>
            {' '}e{' '}
            <span className="text-primary/80 hover:text-primary cursor-pointer transition-colors">Privacidade</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
