import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Order, OrderItem, MenuItem } from '@/types';

const KitchenView = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<(Order & { items: (OrderItem & { menu_item: MenuItem })[] })[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevCountRef = useRef(0);

  const fetchOrders = async () => {
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
      if (mapped.length > prevCountRef.current && prevCountRef.current > 0 && soundEnabled) {
        playNotification();
      }
      prevCountRef.current = mapped.length;
      setOrders(mapped as any);
    }
  };

  const playNotification = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1100;
        osc2.type = 'sine';
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 200);
    } catch {}
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchOrders())
      .subscribe();
    const interval = setInterval(fetchOrders, 10000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [soundEnabled]);

  const confirmItem = async (itemId: string, token: string) => {
    const { data: existing } = await supabase.from('order_items').select('status').eq('id', itemId).single();
    if (existing?.status === 'confirmed') {
      toast({ title: 'Já confirmado', description: 'Este item já foi confirmado anteriormente.' });
      return;
    }
    await supabase.from('order_items').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', itemId);
    // Check if all items in order are confirmed
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl text-foreground">🍳 Cozinha / Balcão</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
            </Button>
            <Badge className="bg-primary/20 text-primary border-primary/30">{orders.length} pedido{orders.length !== 1 ? 's' : ''}</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <ClockIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">Nenhum pedido no momento</p>
            <p className="text-muted-foreground/70 text-sm mt-1">Novos pedidos aparecerão aqui em tempo real</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders.map(order => (
              <div key={order.id} className={`glass rounded-2xl overflow-hidden animate-slide-up ${order.status === 'pending' ? 'ring-2 ring-yellow-500/50 animate-pulse-glow' : ''}`}>
                <div className="p-4 border-b border-border/20 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground">Pedido #{order.id.slice(0, 6).toUpperCase()}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{getElapsedTime(order.created_at)}</span>
                    </div>
                  </div>
                  <Badge className={statusColors[order.status]}>{statusLabels[order.status] || order.status}</Badge>
                </div>

                <div className="p-4 space-y-3">
                  {order.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{item.quantity}x {item.menu_item?.name || 'Item'}</p>
                        {item.notes && <p className="text-xs text-muted-foreground">📝 {item.notes}</p>}
                        {item.removed_ingredients?.length > 0 && <p className="text-xs text-destructive">✕ {item.removed_ingredients.join(', ')}</p>}
                        {item.added_ingredients?.length > 0 && <p className="text-xs text-green-400">+ {item.added_ingredients.join(', ')}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${statusColors[item.status]}`}>{statusLabels[item.status]}</Badge>
                        {item.status !== 'confirmed' && item.status !== 'cancelled' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => confirmItem(item.id, item.token)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> OK
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {order.status === 'pending' && (
                  <div className="p-4 pt-0">
                    <Button className="w-full rounded-xl" onClick={() => updateOrderStatus(order.id, 'preparing')}>
                      Iniciar Preparo
                    </Button>
                  </div>
                )}
                {order.status === 'preparing' && (
                  <div className="p-4 pt-0">
                    <Button className="w-full rounded-xl bg-green-600 hover:bg-green-700" onClick={() => updateOrderStatus(order.id, 'ready')}>
                      Marcar como Pronto
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const ClockIcon = Clock;

export default KitchenView;
