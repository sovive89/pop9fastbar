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
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 && parts.every(p => p.length >= 2);
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
          navigate(`/cliente/pedido/${urlSessionId}/${savedToken}`, { replace: true });
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
      const targetSessionId = urlSessionId;

      if (!targetSessionId) {
        throw new Error('Comanda não encontrada. Peça ao atendente para abrir uma comanda.');
      }

      // Verify session is active
      const { data: session } = await supabase
        .from('sessions')
        .select('status')
        .eq('id', targetSessionId)
        .maybeSingle();

      if (!session || session.status !== 'active') {
        throw new Error('Esta comanda não está ativa. Peça ao atendente para verificar.');
      }

      const insertData: any = {
        session_id: targetSessionId,
        client_name: name.trim(),
        client_phone: phoneDigits,
      };
      if (email.trim()) insertData.client_email = email.trim();

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
        description: `Bem-vindo, ${name.split(' ')[0]}!`,
      });

      navigate(`/cliente/pedido/${targetSessionId}/${client.client_token}`, { replace: true });
    } catch (error: any) {
      toast({ 
        title: 'Erro no cadastro', 
        description: error.message || 'Tente novamente.', 
        variant: 'destructive' 
      });
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] relative overflow-hidden flex flex-col items-center justify-center px-6 py-12 text-white">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, hsl(38 92% 50% / 0.08) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-10">
        {/* Logo & Welcome */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <img 
            src={pop9Logo} 
            alt="POP9 BAR" 
            className="w-32 h-auto mx-auto object-contain" 
            width={512} height={512}
            style={{ mixBlendMode: 'lighten', filter: 'drop-shadow(0 0 15px hsl(38 92% 50% / 0.3))' }} 
          />
          <div className="space-y-2">
            <div className="h-1 w-12 bg-[#FF8A00] mx-auto rounded-full" />
            <p className="text-base text-white/60 font-medium uppercase tracking-widest">
              Abra sua Comanda 🍻
            </p>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
              Preencha seus dados para começar a pedir.
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-[#1A1A1A] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl animate-in fade-in zoom-in-95 duration-500 delay-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">
                Nome completo
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-[#FF8A00] transition-colors" />
                <Input
                  placeholder="Nome e sobrenome"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="pl-12 h-14 rounded-2xl bg-white/5 border-white/10 focus:bg-white/10 transition-all text-base text-white"
                  autoFocus
                  required
                />
              </div>
              {name.length > 0 && !nameValid && (
                <p className="text-[10px] text-red-400 ml-1">Informe nome e sobrenome (mínimo 2 palavras)</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">
                WhatsApp / Celular
              </label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-[#FF8A00] transition-colors" />
                <Input
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={e => setPhone(formatPhoneBR(e.target.value))}
                  className="pl-12 h-14 rounded-2xl bg-white/5 border-white/10 focus:bg-white/10 transition-all text-base text-white"
                  inputMode="tel"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">
                E-mail <span className="text-white/15">(opcional)</span>
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-[#FF8A00] transition-colors" />
                <Input
                  placeholder="seu@email.com"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-12 h-14 rounded-2xl bg-white/5 border-white/10 focus:bg-white/10 transition-all text-base text-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={!isValid || loading}
              className="w-full h-14 rounded-2xl text-lg font-black bg-[#FF8A00] text-black hover:bg-[#FF8A00]/90 gap-3 mt-4 shadow-lg shadow-[#FF8A00]/10 active:scale-[0.98] transition-transform"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Abrir Comanda
                  <ArrowRight className="w-6 h-6" />
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="text-center space-y-4 animate-in fade-in duration-1000 delay-500">
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest leading-relaxed px-4">
            Ao abrir sua comanda, você concorda com os termos de uso. Seus dados estão seguros.
          </p>
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-white/10 uppercase tracking-tighter">
            <div className="w-8 h-[1px] bg-white/5" />
            PØP9 BAR - GESTÃO INTELIGENTE
            <div className="w-8 h-[1px] bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientRegistration;
