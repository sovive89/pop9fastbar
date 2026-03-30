import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UtensilsCrossed, User, Phone, ArrowRight, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formatPhoneBR = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const ClientRegistration = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);

  // Validate session on mount
  useState(() => {
    const validate = async () => {
      if (!sessionId) { setSessionValid(false); return; }
      const { data } = await supabase
        .from('sessions')
        .select('status')
        .eq('id', sessionId)
        .maybeSingle();
      setSessionValid(data?.status === 'active');
    };
    validate();
  });

  const phoneDigits = phone.replace(/\D/g, '');
  const isValid = name.trim().length >= 3 && phoneDigits.length === 11;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading || !sessionId) return;

    setLoading(true);

    // Check if client with same phone already exists in this session
    const { data: existing } = await supabase
      .from('session_clients')
      .select('client_token')
      .eq('session_id', sessionId)
      .eq('client_phone', phoneDigits)
      .maybeSingle();

    if (existing) {
      // Already registered, go directly to menu
      navigate(`/order/${sessionId}/${existing.client_token}`, { replace: true });
      return;
    }

    const { data, error } = await supabase
      .from('session_clients')
      .insert({
        session_id: sessionId,
        client_name: name.trim(),
        client_phone: phoneDigits,
      })
      .select('client_token')
      .single();

    if (error || !data) {
      toast({ title: 'Erro ao registrar', description: 'Tente novamente.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    navigate(`/order/${sessionId}/${data.client_token}`, { replace: true });
  };

  if (sessionValid === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionValid === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Sessão inválida</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Este link não é válido ou a comanda foi encerrada. Peça um novo link ao atendente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">POP9 BAR</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Identifique-se para abrir sua comanda
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Nome completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Seu nome completo"
                value={name}
                onChange={e => setName(e.target.value)}
                className="pl-10 h-12 rounded-xl bg-secondary/30"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Celular
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={e => setPhone(formatPhoneBR(e.target.value))}
                className="pl-10 h-12 rounded-xl bg-secondary/30"
                inputMode="tel"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isValid || loading}
            className="w-full h-13 rounded-2xl text-base font-semibold gap-2 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Acessar cardápio
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground">
          Seus dados são usados apenas para identificar sua comanda neste estabelecimento.
        </p>
      </div>
    </div>
  );
};

export default ClientRegistration;
