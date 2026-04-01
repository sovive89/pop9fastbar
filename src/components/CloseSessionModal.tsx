import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, CheckCircle2, XCircle, Printer } from 'lucide-react';

interface CloseSessionModalProps {
  sessionId: string;
  clientName: string;
  total: number;
  items: { name: string; quantity: number; unitPrice: number }[];
  openedAt: string;
  onClose: () => void;
  onClosed: () => void;
}

const CloseSessionModal = ({ sessionId, clientName, total, items, openedAt, onClose, onClosed }: CloseSessionModalProps) => {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [closing, setClosing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const closedAt = new Date().toISOString();
  const formatDT = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  const verifyAdmin = async () => {
    if (!password.trim()) return;
    setVerifying(true);
    try {
      // Try signing in with admin credentials to verify
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || '',
        password: password,
      });
      if (error) {
        toast({ title: 'Senha incorreta', variant: 'destructive' });
        setVerifying(false);
        return;
      }
      // Check if user has admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        toast({ title: 'Permissão negada — apenas admins', variant: 'destructive' });
      } else {
        setVerified(true);
      }
    } catch {
      toast({ title: 'Erro ao verificar senha', variant: 'destructive' });
    }
    setVerifying(false);
  };

  const handleClose = async () => {
    setClosing(true);
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'closed', closed_at: closedAt })
      .eq('id', sessionId);

    if (error) {
      toast({ title: 'Erro ao encerrar comanda', variant: 'destructive' });
      setClosing(false);
      return;
    }

    toast({ title: 'Comanda encerrada com sucesso!' });
    // Auto print
    handlePrint();
    onClosed();
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=320,height=600');
    if (!win) return;
    win.document.write(`
      <html>
      <head>
        <title>Comanda - ${clientName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 8px; width: 280px; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; padding: 2px 0; }
          .total-row { font-size: 16px; font-weight: bold; }
          h1 { font-size: 16px; margin-bottom: 4px; }
          .small { font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1A1A1A] border-white/10 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b border-white/5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#FF8A00] p-2 rounded-xl">
                <Lock className="w-5 h-5 text-black" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-white">FECHAR COMANDA</CardTitle>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{clientName}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/40 hover:text-white">
              <XCircle className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Receipt preview */}
          <div className="bg-white text-black rounded-xl p-4 text-xs font-mono space-y-2">
            <div ref={printRef}>
              <div className="text-center">
                <h1 className="text-sm font-bold">POP9 BAR</h1>
                <p className="text-[10px] text-gray-500">Comprovante de Consumo</p>
                <div className="border-t border-dashed border-gray-400 my-2" />
              </div>
              <div className="flex justify-between">
                <span>Cliente:</span>
                <span className="font-bold">{clientName}</span>
              </div>
              <div className="flex justify-between">
                <span>Abertura:</span>
                <span>{formatDT(openedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Fechamento:</span>
                <span>{formatDT(closedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Comanda:</span>
                <span>#{sessionId.slice(0, 6).toUpperCase()}</span>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <div className="space-y-1">
                {items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate max-w-[160px]">{it.quantity}x {it.name}</span>
                    <span>R$ {(it.quantity * it.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <div className="flex justify-between text-sm font-bold">
                <span>TOTAL</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <p className="text-center text-[9px] text-gray-400 mt-2">Obrigado pela preferência!</p>
            </div>
          </div>

          {/* Admin password */}
          {!verified ? (
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Senha do Administrador</label>
              <Input
                type="password"
                placeholder="Digite a senha admin"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && verifyAdmin()}
                className="bg-white/5 border-white/10 h-12 rounded-xl text-white text-center focus:ring-[#FF8A00]"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-400 bg-green-500/10 rounded-xl p-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold">Senha verificada</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-xl text-white/60 font-bold">Cancelar</Button>
          {!verified ? (
            <Button onClick={verifyAdmin} disabled={verifying || !password.trim()} className="flex-1 h-12 rounded-xl bg-[#FF8A00] text-black font-bold gap-2">
              {verifying ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Lock className="w-4 h-4" /> Verificar</>}
            </Button>
          ) : (
            <Button onClick={handleClose} disabled={closing} className="flex-1 h-12 rounded-xl bg-white text-black font-bold gap-2">
              {closing ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Printer className="w-4 h-4" /> Fechar & Imprimir</>}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default CloseSessionModal;
