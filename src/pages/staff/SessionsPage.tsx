import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, ArrowLeft, X, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Session, SessionClient } from '@/types';

const SessionsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<(Session & { clients: SessionClient[] })[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('sessions')
      .select('*, clients:session_clients(*)')
      .eq('status', 'active')
      .order('opened_at', { ascending: false });
    if (data) setSessions(data as any);
  };

  useEffect(() => { fetchSessions(); }, []);

  const createSession = async () => {
    if (!clientName.trim()) { toast({ title: 'Informe o nome do cliente', variant: 'destructive' }); return; }
    if (clientPhone.replace(/\D/g, '').length < 10) { toast({ title: 'Informe um celular válido', variant: 'destructive' }); return; }
    const { data: session, error } = await supabase.from('sessions').insert({ opened_by: user?.id }).select().single();
    if (error || !session) { toast({ title: 'Erro ao criar comanda', variant: 'destructive' }); return; }
    await supabase.from('session_clients').insert({ session_id: session.id, client_name: clientName.trim(), client_phone: clientPhone.replace(/\D/g, '') } as any);
    await copyToClipboard(getSessionClientInterfaceLink(session.id), 'Comanda aberta! URL do cliente copiada.');
    setShowNew(false);
    setClientName('');
    setClientPhone('');
    fetchSessions();
  };

  const closeSession = async (id: string) => {
    await supabase.from('sessions').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', id);
    toast({ title: 'Comanda encerrada' });
    fetchSessions();
  };

  const addClient = async (sessionId: string) => {
    const name = prompt('Nome do cliente:');
    if (!name?.trim()) return;
    await supabase.from('session_clients').insert({ session_id: sessionId, client_name: name.trim() });
    fetchSessions();
  };

  const getClientLink = (sessionId: string, token: string) => {
    return `${window.location.origin}/order/${sessionId}/${token}`;
  };

  const getSessionClientInterfaceLink = (sessionId: string) => {
    return `${window.location.origin}/order/${sessionId}`;
  };

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: successMessage });
    } catch {
      toast({
        title: 'Não foi possível copiar automaticamente',
        description: 'Copie manualmente o link exibido na tela.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/staff')}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display font-bold text-lg text-foreground flex-1">Comandas</h1>
          <Button size="sm" onClick={() => setShowNew(true)} className="rounded-xl gap-1"><Plus className="w-4 h-4" /> Nova</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4">
        {showNew && (
          <div className="glass rounded-2xl p-4 space-y-3 animate-slide-up">
            <h3 className="font-semibold text-foreground">Nova Comanda</h3>
            <Input placeholder="Nome completo *" value={clientName} onChange={e => setClientName(e.target.value)} className="rounded-xl bg-secondary/30" />
            <Input placeholder="(00) 00000-0000" value={clientPhone} onChange={e => setClientPhone(formatPhone(e.target.value))} type="tel" className="rounded-xl bg-secondary/30" />
            <div className="flex gap-2">
              <Button onClick={createSession} className="flex-1 rounded-xl">Abrir</Button>
              <Button variant="ghost" onClick={() => setShowNew(false)} className="rounded-xl"><X className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {sessions.length === 0 && !showNew && (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma comanda aberta</p>
          </div>
        )}

        {sessions.map(session => (
          <div key={session.id} className="glass rounded-2xl overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-border/20 flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground">
                  Comanda #{session.id.slice(0, 6).toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(session.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativa</Badge>
            </div>

            <div className="px-4 pt-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">URL do cliente</p>
              <p className="text-[11px] text-muted-foreground/80 mb-2">
                Link que leva o cliente para abrir a comanda e iniciar a sessão.
              </p>
              <div className="flex items-center justify-between gap-2 bg-secondary/20 rounded-xl px-3 py-2">
                <span className="text-xs text-foreground/80 truncate">{getSessionClientInterfaceLink(session.id)}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary"
                    onClick={() => {
                      window.open(getSessionClientInterfaceLink(session.id), '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Abrir
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary"
                    onClick={() => {
                      copyToClipboard(getSessionClientInterfaceLink(session.id), 'URL do cliente copiada!');
                    }}
                  >
                    <QrCode className="w-3 h-3 mr-1" /> Copiar
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-2">
              {session.clients?.map(client => (
                <div key={client.id} className="flex items-center justify-between bg-secondary/20 rounded-xl px-3 py-2">
                  <button
                    onClick={() => navigate(`/order/${session.id}/${client.client_token}`)}
                    className="text-sm text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
                  >
                    {client.client_name}
                  </button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={() => {
                    copyToClipboard(getClientLink(session.id, client.client_token), 'Link copiado!');
                  }}>
                    <QrCode className="w-3 h-3 mr-1" /> Link
                  </Button>
                </div>
              ))}
            </div>

            <div className="p-4 pt-0 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 rounded-xl text-xs" onClick={() => addClient(session.id)}>
                <Plus className="w-3 h-3 mr-1" /> Cliente
              </Button>
              <Button size="sm" variant="outline" className="flex-1 rounded-xl text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => closeSession(session.id)}>
                Encerrar
              </Button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default SessionsPage;
