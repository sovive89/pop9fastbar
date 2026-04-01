import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  X, QrCode, CheckCircle2, AlertCircle, 
  ShoppingBag, User, DollarSign, ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface OrderScannerProps {
  onClose: () => void;
  onSuccess: () => void;
}

const OrderScanner = ({ onClose, onSuccess }: OrderScannerProps) => {
  const { toast } = useToast();
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputData, setInputData] = useState('');

  // Simular a leitura do QR Code (em produção, usaria uma biblioteca como react-qr-reader)
  const handleScan = async (data: string) => {
    try {
      setLoading(true);
      setError(null);
      const parsedData = JSON.parse(data);
      
      // Validação básica dos dados do QR Code
      if (!parsedData.sid || !parsedData.cid || !parsedData.items) {
        throw new Error('QR Code inválido ou corrompido.');
      }

      setScanResult(parsedData);
    } catch (err: any) {
      setError(err.message || 'Erro ao ler QR Code.');
    } finally {
      setLoading(false);
    }
  };

  const confirmOrder = async () => {
    if (!scanResult) return;
    setLoading(true);

    try {
      // 1. Criar o pedido (order)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          session_id: scanResult.sid,
          session_client_id: scanResult.cid,
          status: 'served', // Como foi validado no balcão, já pode entrar como servido
        })
        .select()
        .single();

      if (orderError || !order) throw new Error('Erro ao criar pedido no banco.');

      // 2. Criar os itens do pedido (order_items)
      const orderItems = scanResult.items.map((item: any) => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.q,
        unit_price: item.p,
        notes: item.notes || null,
        status: 'served'
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw new Error('Erro ao lançar itens na comanda.');

      toast({
        title: 'Pedido Validado!',
        description: `R$ ${scanResult.t.toFixed(2)} lançados na comanda de ${scanResult.cname}.`,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      toast({
        title: 'Erro na Validação',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-in zoom-in-95 duration-200">
        {!scanResult ? (
          <Card className="bg-[#1A1A1A] border-white/10 overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-white/5 pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FF8A00] p-2 rounded-xl">
                    <QrCode className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-white italic">SCANNER DE PEDIDO</CardTitle>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Bipe o QR Code do cliente</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="py-12 flex flex-col items-center justify-center space-y-6">
              {/* Área de Simulação de Câmera */}
              <div className="w-64 h-64 border-2 border-dashed border-white/20 rounded-[3rem] flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-[#FF8A00]/5 animate-pulse" />
                <QrCode className="w-20 h-20 text-white/10 group-hover:text-[#FF8A00]/20 transition-colors" />
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-4">Aguardando QR Code...</p>
                
                {/* Overlay de Canto */}
                <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-[#FF8A00] rounded-tl-xl" />
                <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-[#FF8A00] rounded-tr-xl" />
                <div className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-[#FF8A00] rounded-bl-xl" />
                <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-[#FF8A00] rounded-br-xl" />
              </div>

              {/* Input de Simulação (Para teste manual) */}
              <div className="w-full max-w-xs space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center block">Entrada Manual (JSON)</label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Cole o JSON do pedido aqui..." 
                    value={inputData}
                    onChange={e => setInputData(e.target.value)}
                    className="bg-white/5 border-white/10 h-10 rounded-xl text-xs"
                  />
                  <Button onClick={() => handleScan(inputData)} size="sm" className="bg-[#FF8A00] text-black font-bold rounded-xl h-10">
                    Ler
                  </Button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-xl border border-red-400/20">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-tighter">{error}</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-white/[0.02] border-t border-white/5 p-4 justify-center">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">PØP9 BAR - VALIDAÇÃO SEGURA</p>
            </CardFooter>
          </Card>
        ) : (
          <Card className="bg-[#1A1A1A] border-[#FF8A00]/30 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="bg-[#FF8A00]/5 border-b border-[#FF8A00]/10 pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FF8A00] p-2 rounded-xl shadow-lg shadow-[#FF8A00]/20">
                    <CheckCircle2 className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-white italic">PEDIDO IDENTIFICADO</CardTitle>
                    <p className="text-[#FF8A00] text-[10px] font-bold uppercase tracking-widest">Validar itens abaixo</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setScanResult(null)} className="text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Cliente Info */}
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="w-12 h-12 bg-[#FF8A00]/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-[#FF8A00]" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Cliente</p>
                  <p className="text-lg font-black text-white">{scanResult.cname}</p>
                </div>
              </div>

              {/* Itens */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Resumo do Pedido</p>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                  {scanResult.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-white">{item.n}</span>
                        <span className="text-[10px] text-white/40">{item.q}x R$ {Number(item.p).toFixed(2)}</span>
                      </div>
                      <span className="font-black text-white">R$ {(item.q * item.p).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-[#FF8A00] p-6 rounded-[2rem] text-black">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total a Lançar</p>
                  <p className="text-3xl font-black italic">R$ {scanResult.t.toFixed(2)}</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-20" />
              </div>
            </CardContent>
            <CardFooter className="p-6 pt-0 flex gap-3">
              <Button variant="ghost" onClick={() => setScanResult(null)} className="flex-1 h-14 rounded-2xl text-white/60 font-bold">Cancelar</Button>
              <Button 
                onClick={confirmOrder} 
                disabled={loading}
                className="flex-1 h-14 rounded-2xl bg-[#FF8A00] text-black font-black text-lg gap-2 shadow-xl shadow-[#FF8A00]/10"
              >
                {loading ? 'Processando...' : (
                  <>
                    CONFIRMAR <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OrderScanner;
