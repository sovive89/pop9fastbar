import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, User } from 'lucide-react';
import pop9Logo from '@/assets/pop9-logo.png';
import type { AppRole } from '@/types';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter no mínimo 6 caracteres');
const nameSchema = z.string().min(2, 'Nome deve ter no mínimo 2 caracteres');

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, signUp, signIn, loading } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('attendant');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading && role) {
      if (role === 'admin') navigate('/gestor/admin');
      else if (role === 'kitchen') navigate('/gestor/cozinha');
      else navigate('/gestor');
    }
  }, [user, loading, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (mode === 'signup') {
        nameSchema.parse(fullName);
        const { error } = await signUp(email, password, fullName, selectedRole);
        if (error) {
          toast({ title: 'Erro no cadastro', description: error.message, variant: 'destructive' });
          return;
        }
        toast({ title: 'Conta criada!', description: 'Verifique seu email para confirmar.' });
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: 'Credenciais inválidas', description: 'Email ou senha incorretos.', variant: 'destructive' });
          return;
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Erro de validação', description: error.errors[0].message, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const roles: { value: AppRole; label: string }[] = [
    { value: 'admin', label: 'Administrador' },
    { value: 'attendant', label: 'Atendente' },
    { value: 'kitchen', label: 'Cozinha / Balcão' },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, hsl(38 92% 50% / 0.08) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center px-6 pt-12 pb-8">
        <div className="mb-6">
          <img src={pop9Logo} alt="POP9 BAR" className="w-32 h-auto object-contain" width={512} height={512} style={{ mixBlendMode: 'lighten', filter: 'drop-shadow(0 0 15px hsl(38 92% 50% / 0.3))' }} />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-6">
          <Lock className="w-4 h-4" />
          <span>Área da Equipe</span>
        </div>

        <div className="w-full max-w-sm space-y-5 animate-fade-in">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-foreground mb-2">{mode === 'login' ? 'Entrar' : 'Nova conta'}</h1>
            <p className="text-muted-foreground">{mode === 'login' ? 'Acesse o sistema POP9 BAR' : 'Crie uma conta para a equipe'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome" className="h-14 pl-12 rounded-2xl bg-secondary/30 border-border/50" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Função</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {roles.map(r => (
                      <button key={r.value} type="button" onClick={() => setSelectedRole(r.value)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${selectedRole === r.value ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label className="text-muted-foreground">Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="seu@email.com" className="h-14 pl-4 rounded-2xl bg-secondary/30 border-border/50" required />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Senha</Label>
              <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" className="h-14 pl-4 rounded-2xl bg-secondary/30 border-border/50" required />
            </div>

            <Button type="submit" size="lg" className="w-full h-14 rounded-2xl text-lg font-semibold bg-gradient-to-r from-primary to-accent" disabled={isSubmitting}>
              {isSubmitting ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground pt-2">
            {mode === 'login' ? (
              <>Não tem conta?{' '}<button onClick={() => setMode('signup')} className="text-primary hover:underline font-medium">Cadastrar</button></>
            ) : (
              <>Já tem conta?{' '}<button onClick={() => setMode('login')} className="text-primary hover:underline font-medium">Entrar</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
