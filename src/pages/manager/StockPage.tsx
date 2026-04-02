import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, AlertTriangle, TrendingDown, TrendingUp, RefreshCw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import pop9Logo from '@/assets/pop9-logo.png';

interface StockMovement {
  id: string;
  menu_item_id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_at: string;
}

const StockPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [tab, setTab] = useState<'overview' | 'history'>('overview');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  const fetchData = async () => {
    const { data: menuItems } = await supabase.from('menu_items').select('*').order('name');
    if (menuItems) setItems(menuItems);

    const { data: movs } = await supabase.from('stock_movements' as any).select('*').order('created_at', { ascending: false }).limit(100);
    if (movs) setMovements(movs as any);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredItems = items.filter(i => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    const stock = i.stock_quantity ?? -1;
    if (filter === 'low') return stock !== -1 && stock <= (i.stock_alert_threshold ?? 5) && stock > 0;
    if (filter === 'out') return stock === 0;
    return true;
  });

  const addStock = async (itemId: string, qty: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const prev = item.stock_quantity ?? -1;
    if (prev === -1) return;
    const newStock = prev + qty;
    await supabase.from('menu_items').update({ stock_quantity: newStock, is_active: newStock > 0 ? true : item.is_active }).eq('id', itemId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('stock_movements' as any).insert({
      menu_item_id: itemId,
      movement_type: 'in',
      quantity: qty,
      previous_stock: prev,
      new_stock: newStock,
      reason: 'Entrada manual',
      performed_by: user?.id || null,
    });
    toast({ title: `+${qty} unidades adicionadas` });
    fetchData();
  };

  const totalTracked = items.filter(i => (i.stock_quantity ?? -1) !== -1).length;
  const lowStock = items.filter(i => { const s = i.stock_quantity ?? -1; return s !== -1 && s <= (i.stock_alert_threshold ?? 5) && s > 0; }).length;
  const outOfStock = items.filter(i => (i.stock_quantity ?? -1) === 0).length;

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gestor/admin')}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display font-bold text-lg text-foreground flex-1">Estoque</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="glass rounded-2xl p-3 text-center">
            <Package className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold text-foreground">{totalTracked}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Rastreados</p>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
            <p className="text-xl font-bold text-yellow-400">{lowStock}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Estoque baixo</p>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto text-destructive mb-1" />
            <p className="text-xl font-bold text-destructive">{outOfStock}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Esgotados</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setTab('overview')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'overview' ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}>Visão Geral</button>
          <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'history' ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}>Histórico</button>
        </div>

        {tab === 'overview' && (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar item..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl bg-secondary/30 h-9" />
              </div>
              <div className="flex gap-1">
                {(['all', 'low', 'out'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase ${filter === f ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}>
                    {f === 'all' ? 'Todos' : f === 'low' ? 'Baixo' : 'Zerado'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {filteredItems.map(item => {
                const stock = item.stock_quantity ?? -1;
                const threshold = item.stock_alert_threshold ?? 5;
                const isLow = stock !== -1 && stock <= threshold && stock > 0;
                const isOut = stock === 0;

                return (
                  <div key={item.id} className={`glass rounded-2xl p-3 flex items-center gap-3 ${isOut ? 'border-destructive/20' : isLow ? 'border-yellow-500/20' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {stock === -1 ? (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">Ilimitado</Badge>
                        ) : isOut ? (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Esgotado</Badge>
                        ) : isLow ? (
                          <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500/15 text-yellow-400 border-yellow-500/20">{stock} un (alerta: {threshold})</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-green-400 border-green-500/20">{stock} un</Badge>
                        )}
                      </div>
                    </div>
                    {stock !== -1 && (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs gap-1" onClick={() => {
                          const qty = prompt('Quantidade a adicionar:');
                          if (qty && parseInt(qty) > 0) addStock(item.id, parseInt(qty));
                        }}>
                          <TrendingUp className="w-3 h-3" />
                          Entrada
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'history' && (
          <div className="space-y-2">
            {movements.length === 0 ? (
              <div className="text-center py-12">
                <RefreshCw className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhuma movimentação registrada</p>
              </div>
            ) : (
              movements.map(m => {
                const item = items.find(i => i.id === m.menu_item_id);
                return (
                  <div key={m.id} className="glass rounded-xl p-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      m.movement_type === 'in' ? 'bg-green-500/15' : m.movement_type === 'out' ? 'bg-red-500/15' : 'bg-blue-500/15'
                    }`}>
                      {m.movement_type === 'in' ? <TrendingUp className="w-4 h-4 text-green-400" /> :
                       m.movement_type === 'out' ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                       <RefreshCw className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item?.name || 'Item removido'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {m.reason || m.movement_type} • {m.previous_stock} → {m.new_stock}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${m.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </p>
                      <p className="text-[9px] text-muted-foreground">{formatDate(m.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default StockPage;
