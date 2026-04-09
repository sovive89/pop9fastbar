import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wine, User, Phone, Mail, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import pop9Logo from '@/assets/pop9-logo.png';

const formatPhoneBR = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const validateName = (name: string) => {
  return name.trim().length >= 2;
};

const ClientRegistration = () => {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkExistingSession = async () => {
      if (urlSessionId) {
        const savedToken = localStorage.getItem(`client_token_${urlSessionId}`);
        const { data: session } = await supabase
          .from('sessions')
          .select('status')
          .eq('id', urlSessionId)
          .maybeSingle();

        if (session?.status === 'active' && savedToken) {
          navigate(`/pedido/${urlSessionId}/${savedToken}`, { replace: true });
          return;
        }
      }
      setChecking(false);
    };
    checkExistingSession();
  }, [urlSessionId, navigate]);

  const phoneDigits = phone.replace(/\D/g, '');
  const nameValid = validateName(name);
  const isValid = nameValid && phoneDigits.length === 11;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);

    try {
      let targetSessionId = urlSessionId;

      // Se não houver sessionId na URL, criar uma nova sessão
      if (!targetSessionId) {
        const { data: newSession, error: sessionError } = await supabase
          .from('sessions')
          .insert({
            status: 'active',
            opened_at: new Date().toISOString(),
            table_number: null, // Bar sem mesas
          })
          .select('id')
          .single();

        if (sessionError || !newSession) {
          console.error('Erro ao criar sessão:', sessionError);
          throw new Error('Erro ao abrir comanda. Tente novamente.');
        }

        targetSessionId = newSession.id;
      }

      // Verificar se a sessão está ativa
      const { data: session } = await supabase
        .from('sessions')
        .select('status')
        .eq('id', targetSessionId)
        .maybeSingle();

      if (!session || session.status !== 'active') {
        throw new Error('Esta comanda não está ativa. Peça ao atendente para verificar.');
      }

      // Registrar o cliente na sessão
      const insertData: any = {
        session_id: targetSessionId,
        client_name: name.trim(),
        client_phone: phoneDigits,
        client_email: email.trim() || null,
      };

      const { data: client, error: clientError } = await supabase
        .from('session_clients')
        .insert(insertData)
        .select('client_token')
        .single();

      if (clientError || !client) {
        console.error('Erro Supabase:', clientError);
        throw new Error('Erro ao registrar na comanda.');
      }

      localStorage.setItem(`client_token_${targetSessionId}`, client.client_token);
      
      toast({
        title: 'Comanda aberta!',
        description: `Bem-vindo, ${name}! Você pode começar a fazer seus pedidos.`,
      });

      // Redirecionar para o cardápio
      navigate(`/pedido/${targetSessionId}/${client.client_token}`, { replace: true });
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      toast({
        title: 'Erro no cadastro',
        description: error.message || 'Algo deu errado. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={pop9Logo} alt="PØP9 BAR" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Abra sua Comanda</h1>
          <p className="text-muted-foreground">Insira seus dados para começar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">NOME</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 bg-secondary border-secondary text-foreground placeholder:text-muted-foreground"
                disabled={loading}
              />
            </div>
            {name && !nameValid && (
              <p className="text-xs text-destructive mt-1">Mínimo 2 caracteres</p>
            )}
          </div>

          {/* Celular */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">WHATSAPP / CELULAR</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="(XX) XXXXX-XXXX"
                value={phone}
                onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                className="pl-10 bg-secondary border-secondary text-foreground placeholder:text-muted-foreground"
                disabled={loading}
              />
            </div>
            {phone && phoneDigits.length !== 11 && (
              <p className="text-xs text-destructive mt-1">Celular inválido</p>
            )}
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">E-MAIL (OPCIONAL)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-secondary border-secondary text-foreground placeholder:text-muted-foreground"
                disabled={loading}
              />
            </div>
            {email && (
              <p className="text-xs text-primary mt-1">✓ Você ganhará 5% de desconto na primeira visita!</p>
            )}
          </div>

          {/* Botão Abrir Comanda */}
          <Button
            type="submit"
            disabled={!isValid || loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-6 text-lg"
          >
            {loading ? 'Abrindo...' : 'Abrir Comanda'} <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </form>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center mt-8">
          AO ABRIR SUA COMANDA, VOCÊ CONCORDA COM OS TERMOS DE USO. SEUS DADOS ESTÃO SEGUROS.
        </p>
        <p className="text-xs text-muted-foreground text-center mt-2">
          PØP9 BAR - GESTÃO INTELIGENTE
        </p>
      </div>
    </div>
  );
};

export default ClientRegistration;
