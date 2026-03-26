import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Chrome, Facebook, ArrowLeft, Mail, Lock, User, Building2 } from 'lucide-react';
import nightpassLogo from '@/assets/nightpass-logo.png';

type AuthMode = 'login' | 'signup';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter no mínimo 6 caracteres');
const nameSchema = z.string().min(2, 'Nome deve ter no mínimo 2 caracteres');

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signUp, signIn, signInWithGoogle, loading } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [establishmentName, setEstablishmentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      
      if (mode === 'signup') {
        nameSchema.parse(fullName);
        
        const { error } = await signUp(email, password, fullName, 'bar');
        
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Email já cadastrado',
              description: 'Este email já está em uso. Tente fazer login.',
              variant: 'destructive',
            });
          } else {
            throw error;
          }
          return;
        }

        toast({
          title: 'Conta criada com sucesso!',
          description: 'Você será redirecionado...',
        });
      } else {
        const { error } = await signIn(email, password);
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Credenciais inválidas',
              description: 'Email ou senha incorretos.',
              variant: 'destructive',
            });
          } else {
            throw error;
          }
          return;
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Ocorreu um erro. Tente novamente.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: 'Erro ao conectar com Google',
        description: error.message,
        variant: 'destructive',
      });
    }
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
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/5" />
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(38 92% 50% / 0.08) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="rounded-full hover:bg-primary/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </header>

        {/* Main */}
        <div className="flex-1 flex flex-col items-center px-6 pb-8">
          {/* Logo */}
          <div className="mb-6">
            <img 
              src={nightpassLogo} 
              alt="NightPass" 
              className="w-36 h-auto object-contain"
              style={{ mixBlendMode: 'lighten', filter: 'drop-shadow(0 0 15px hsl(38 92% 50% / 0.3))' }}
            />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <Building2 className="w-4 h-4" />
            <span>Área do Estabelecimento</span>
          </div>

          <div className="w-full max-w-sm space-y-6 animate-fade-in">
            <div className="text-center mb-4">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {mode === 'login' ? 'Bem-vindo de volta' : 'Cadastre seu bar'}
              </h1>
              <p className="text-muted-foreground">
                {mode === 'login' 
                  ? 'Acesse seu painel de controle' 
                  : 'Crie sua conta e gerencie tudo'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="space-y-2 animate-slide-up">
                    <Label htmlFor="fullName" className="text-muted-foreground">Seu nome</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Nome do responsável"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-14 pl-12 rounded-2xl bg-secondary/30 border-border/50 focus:border-primary/50"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.05s' }}>
                    <Label htmlFor="establishmentName" className="text-muted-foreground">Nome do estabelecimento</Label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="establishmentName"
                        type="text"
                        placeholder="Nome do bar"
                        value={establishmentName}
                        onChange={(e) => setEstablishmentName(e.target.value)}
                        className="h-14 pl-12 rounded-2xl bg-secondary/30 border-border/50 focus:border-primary/50"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 pl-12 rounded-2xl bg-secondary/30 border-border/50 focus:border-primary/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.15s' }}>
                <Label htmlFor="password" className="text-muted-foreground">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 pl-12 rounded-2xl bg-secondary/30 border-border/50 focus:border-primary/50"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-14 rounded-2xl text-lg font-semibold mt-6 bg-gradient-to-r from-primary to-accent animate-slide-up"
                style={{ animationDelay: '0.2s' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  mode === 'login' ? 'Entrar' : 'Criar conta'
                )}
              </Button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-4 text-sm text-muted-foreground">ou</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                size="lg"
                className="h-14 rounded-2xl border-border/50 hover:border-primary/50"
                onClick={handleGoogleLogin}
              >
                <Chrome className="w-5 h-5 mr-2" />
                Google
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="h-14 rounded-2xl border-border/50 hover:border-primary/50"
                onClick={() => toast({ title: 'Em breve', description: 'Login com Facebook em breve.' })}
              >
                <Facebook className="w-5 h-5 mr-2" />
                Facebook
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground pt-4">
              {mode === 'login' ? (
                <>
                  Não tem conta?{' '}
                  <button onClick={() => setMode('signup')} className="text-primary hover:underline font-medium">
                    Cadastrar bar
                  </button>
                </>
              ) : (
                <>
                  Já tem conta?{' '}
                  <button onClick={() => setMode('login')} className="text-primary hover:underline font-medium">
                    Entrar
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pb-6 px-6 text-center">
          <p className="text-xs text-muted-foreground/60">
            Ao continuar, você concorda com nossos{' '}
            <span className="text-primary/80 hover:text-primary cursor-pointer">Termos</span>
            {' '}e{' '}
            <span className="text-primary/80 hover:text-primary cursor-pointer">Privacidade</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
