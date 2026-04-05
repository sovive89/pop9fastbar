import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, Volume2, VolumeX, BellRing, Power, PowerOff, Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Order, OrderItem, MenuItem } from '@/types';
import { useStockAlerts } from '@/hooks/useStockAlerts';
import { ManagerSidebarTrigger } from '@/components/ManagerSidebar';

const KitchenView = () => {
  const { toast } = useToast();
  useStockAlerts();
  const [orders, setOrders] = useState<(Order & { items: (OrderItem & { menu_item: MenuItem })[] })[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alertActive, setAlertActive] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [isModuleActive, setIsModuleActive] = useState(true);
  
  const alarmRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const saved = localStorage.getItem('pop9_kitchen_active');
    if (saved !== null) setIsModuleActive(saved === 'true');
  }, []);

  const toggleModule = () => {
    const newState = !isModuleActive;
    setIsModuleActive(newState);
    localStorage.setItem('pop9_kitchen_active', String(newState));
    toast({ 
      title: newState ? 'Módulo de Cozinha Ativado' : 'Módulo de Cozinha Desativado',
      description: newState ? 'Pedidos pendentes aparecerão aqui.' : 'O fluxo de cozinha está suspenso.'
    });
  };

  const stopAlarm = useCallback(() => {
    if (alarmRef.current) {
      clearInterval(alarmRef.current);
      alarmRef.current = null;
    }
    setAlertActive(false);
    setNewOrderCount(0);
  }, []);

  const playAlarmBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 880;
      osc1.type = 'square';
      gain1.gain.value = 0.5;
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);
    } catch {}
  }, []);

  const startAlarm = useCallback((count: number) => {
    if (!isModuleActive) return;
    setAlertActive(true);
    setNewOrderCount(count);
    playAlarmBeep();
    if (alarmRef.current) clearInterval(alarmRef.current);
    alarmRef.current = setInterval(() => {
      playAlarmBeep();
    }, 3000);
  }, [playAlarmBeep, isModuleActive]);

  const fetchOrders = async () => {
    if (!isModuleActive) {
      setOrders([]);
      return;
    }
    const { data } = await supabase
      .from('orders')
      .select(`*, items:order_items(*, menu_item:menu_items(*))`)
      .in('status', ['pending', 'preparing', 'ready'])
      .order('created_at', { ascending: true });
    
    if (data) {
      const mapped = data.map((o: any) => ({
        ...o,
        items: (o.items || []).map((i: any) => ({ ...i, menu_item: i.menu_item })),
      }));
      
      const currentIds = new Set(mapped.map(o => o.id));
      if (isFirstLoad.current) {
        prevOrderIdsRef.current = currentIds;
        isFirstLoad.current = false;
      } else {
        const newIds = [...currentIds].filter(id => !prevOrderIdsRef.current.has(id));
        if (newIds.length > 0 && soundEnabled) {
          startAlarm(newIds.length);
        }
        prevOrderIdsRef.current = currentIds;
      }
      
      setOrders(mapped as any);
    }
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchOrders())
      .subscribe();
    const interval = setInterval(fetchOrders, 10000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      if (alarmRef.current) clearInterval(alarmRef.current);
    };
  }, [soundEnabled, isModuleActive]);

  const confirmItem = async (itemId: string) => {
    await supabase.from('order_items').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', itemId);
    const { data: item } = await supabase.from('order_items').select('order_id').eq('id', itemId).single();
    if (item) {
      const { data: allItems } = await supabase.from('order_items').select('status').eq('order_id', item.order_id);
      if (allItems?.every(i => i.status === 'confirmed' || i.status === 'cancelled')) {
        await supabase.from('orders').update({ status: 'served', updated_at: new Date().toISOString() }).eq('id', item.order_id);
      }
    }
    toast({ title: 'Item confirmado!' });
    fetchOrders();
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
    if (status === 'preparing') {
      await supabase.from('order_items').update({ status: 'preparing' }).eq('order_id', orderId).eq('status', 'pending');
    }
    fetchOrders();
  };

  const getElapsedTime = (createdAt: string) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    const min = Math.floor(diff / 60);
    const sec = diff % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    preparing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ready: 'bg-green-500/20 text-green-400 border-green-500/30',
    confirmed: 'bg-primary/20 text-primary border-primary/30',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Novo', preparing: 'Preparando', ready: 'Pronto', confirmed: 'Confirmado',
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans">
      {/* Flashing alert banner */}
      {alertActive && (
        <div className="fixed inset-x-0 top-0 z-[200] cursor-pointer animate-pulse" onClick={stopAlarm}>
          <div className="bg-[#FF8A00] text-black py-4 px-6 flex items-center justify-center gap-3 shadow-lg">
            <BellRing className="w-6 h-6 animate-bounce" />
            <span className="font-black text-lg italic">🔔 {newOrderCount} NOVO(S) PEDIDO(S)!</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Toque para silenciar</span>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-[#141414] border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ManagerSidebarTrigger />
          <div>
            <h1 className="text-2xl font-black tracking-tighter italic">COZINHA / BALCÃO</h1>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Gestão de Preparo & Entregas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleModule}
            className={`rounded-xl h-10 font-bold gap-2 ${isModuleActive ? 'border-green-500/20 text-green-400 bg-green-500/5' : 'border-red-500/20 text-red-400 bg-red-500/5'}`}
          >
            {isModuleActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
            {isModuleActive ? 'ATIVO' : 'INATIVO'}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="text-white/40 hover:text-white">
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
          <Badge className="bg-[#FF8A00]/10 text-[#FF8A00] border-[#FF8A00]/20 font-black">{orders.length} PEDIDOS</Badge>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {!isModuleActive ? (
          <div className="text-center py-32 bg-[#1A1A1A] border border-white/5 rounded-[3rem] flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
              <PowerOff className="w-10 h-10 text-white/10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black italic">MÓDULO DESATIVADO</h2>
              <p className="text-white/40 text-sm font-medium max-w-xs mx-auto">Ative o módulo no topo da página para começar a receber pedidos da cozinha.</p>
            </div>
            <Button onClick={toggleModule} className="bg-[#FF8A00] text-black font-black rounded-xl px-8 h-12">
              ATIVAR AGORA
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-32 bg-[#1A1A1A] border border-white/5 rounded-[3rem] flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-white/10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black italic">SEM PEDIDOS NO MOMENTO</h2>
              <p className="text-white/40 text-sm font-medium">Novos pedidos aparecerão aqui em tempo real.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orders.map(order => (
              <Card key={order.id} className={`bg-[#1A1A1A] border-white/5 rounded-[2rem] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 ${order.status === 'pending' ? 'ring-2 ring-[#FF8A00]/50' : ''}`}>
                <CardHeader className="bg-white/[0.02] p-5 border-b border-white/5 flex flex-row items-center justify-between">
                  <div>
                    <p className="font-black text-white italic">#{order.id.slice(0, 6).toUpperCase()}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-white/20" />
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{getElapsedTime(order.created_at)}</span>
                    </div>
                  </div>
                  <Badge className={`font-black text-[10px] ${statusColors[order.status]}`}>{statusLabels[order.status] || order.status}</Badge>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  {order.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{item.quantity}x {item.menu_item?.name || 'Item'}</p>
                        {item.notes && <p className="text-[10px] text-white/40 font-medium mt-1 italic">Obs: {item.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.status !== 'confirmed' && item.status !== 'cancelled' && (
                          <Button size="sm" variant="ghost" className="h-8 rounded-lg text-[#FF8A00] hover:bg-[#FF8A00]/10 font-bold text-[10px]"
                            onClick={() => confirmItem(item.id)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> OK
                          </Button>
                        )}
                        {item.status === 'confirmed' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                      </div>
                    </div>
                  ))}
                </CardContent>

                <CardFooter className="p-5 pt-0">
                  {order.status === 'pending' && (
                    <Button className="w-full h-12 rounded-xl bg-[#FF8A00] text-black font-black italic" onClick={() => updateOrderStatus(order.id, 'preparing')}>
                      INICIAR PREPARO
                    </Button>
                  )}
                  {order.status === 'preparing' && (
                    <Button className="w-full h-12 rounded-xl bg-white text-black font-black italic" onClick={() => updateOrderStatus(order.id, 'ready')}>
                      MARCAR COMO PRONTO
                    </Button>
                  )}
                  {order.status === 'ready' && (
                    <Button className="w-full h-12 rounded-xl bg-green-500 text-black font-black italic" onClick={() => updateOrderStatus(order.id, 'served')}>
                      ENTREGAR NO BALCÃO
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default KitchenView;
