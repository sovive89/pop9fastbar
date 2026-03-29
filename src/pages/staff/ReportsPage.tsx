import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, BarChart3, DollarSign, ShoppingBag,
  Package, TrendingUp, Hash, Flame, Calendar
} from 'lucide-react';
import pop9Logo from '@/assets/pop9-logo.png';

type Period = 'today' | 'week' | 'month';

interface OrderItemRow {
  quantity: number;
  unit_price: number;
  status: string;
  created_at: string;
  order_id: string;
  menu_item: { name: string; category_id: string } | null;
}

interface CategoryRow {
  id: string;
  name: string;
}

const ReportsPage = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [period, setPeriod] = useState<Period>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Compute date range from period
  useEffect(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (period === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 6);
      setStartDate(weekAgo.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 29);
      setStartDate(monthAgo.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  }, [period]);

  // Fetch data when dates change
  useEffect(() => {
    if (!startDate || !endDate) return;
    const fetchData = async () => {
      setLoading(true);
      const from = `${startDate}T00:00:00`;
      const to = `${endDate}T23:59:59`;

      const [itemsRes, ordersRes, catsRes] = await Promise.all([
        supabase
          .from('order_items')
          .select('quantity, unit_price, status, created_at, order_id, menu_item:menu_items(name, category_id)')
          .gte('created_at', from)
          .lte('created_at', to)
          .neq('status', 'cancelled'),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', from)
          .lte('created_at', to)
          .neq('status', 'cancelled'),
        supabase.from('menu_categories').select('id, name'),
      ]);

      if (itemsRes.data) setItems(itemsRes.data as unknown as OrderItemRow[]);
      setOrderCount(ordersRes.count || 0);
      if (catsRes.data) setCategories(catsRes.data);
      setLoading(false);
    };
    fetchData();
  }, [startDate, endDate]);

  // KPIs
  const revenue = useMemo(() =>
    items.reduce((s, i) => s + i.quantity * Number(i.unit_price), 0), [items]);

  const totalItemsSold = useMemo(() =>
    items.reduce((s, i) => s + i.quantity, 0), [items]);

  const avgTicket = orderCount > 0 ? revenue / orderCount : 0;

  // Top items
  const topItems = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    items.forEach(i => {
      const name = i.menu_item?.name || 'Desconhecido';
      if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
      map[name].qty += i.quantity;
      map[name].revenue += i.quantity * Number(i.unit_price);
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [items]);

  // Sales by category
  const salesByCategory = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    items.forEach(i => {
      const catId = i.menu_item?.category_id || 'unknown';
      const cat = categories.find(c => c.id === catId);
      const name = cat?.name || 'Outros';
      if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
      map[name].qty += i.quantity;
      map[name].revenue += i.quantity * Number(i.unit_price);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [items, categories]);

  // Heatmap data: day x hour
  const heatmapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(18).fill(0)); // 7 days x 18 hours (6-23)
    items.forEach(i => {
      const d = new Date(i.created_at);
      const day = d.getDay(); // 0=Sun
      const hour = d.getHours();
      if (hour >= 6 && hour <= 23) {
        grid[day][hour - 6] += i.quantity;
      }
    });
    return grid;
  }, [items]);

  const maxHeat = useMemo(() => Math.max(1, ...heatmapData.flat()), [heatmapData]);

  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  // Reorder: Mon-Sun
  const orderedDays = [1, 2, 3, 4, 5, 6, 0];

  const getHeatColor = (val: number) => {
    if (val === 0) return 'bg-secondary/40';
    const ratio = val / maxHeat;
    if (ratio < 0.25) return 'bg-primary/20';
    if (ratio < 0.5) return 'bg-primary/40';
    if (ratio < 0.75) return 'bg-primary/70';
    return 'bg-primary';
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (role !== 'admin') return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-destructive">Acesso não autorizado</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/staff')} className="h-8 w-8 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground text-sm uppercase tracking-wide">Relatórios</h1>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Vendas & Métricas</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Period selector */}
        <div className="flex gap-2 flex-wrap">
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                period === p
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>

        {/* Date range display */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-2 glass rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">{startDate.split('-').reverse().join('/')}</span>
          </div>
          <span className="text-muted-foreground">até</span>
          <div className="flex items-center gap-1.5 px-3 py-2 glass rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">{endDate.split('-').reverse().join('/')}</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard icon={DollarSign} label="Faturamento" value={`R$ ${fmt(revenue)}`} />
          <KPICard icon={ShoppingBag} label="Pedidos" value={String(orderCount)} />
          <KPICard icon={Package} label="Itens Vendidos" value={String(totalItemsSold)} />
          <KPICard icon={TrendingUp} label="Ticket Médio" value={`R$ ${fmt(avgTicket)}`} />
        </div>

        {/* Heatmap */}
        <div className="glass rounded-2xl p-4 space-y-3 border border-border/30">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-foreground text-xs uppercase tracking-wide">
              Mapa de Calor — Pedidos por Dia e Hora
            </h2>
          </div>
          <p className="text-[11px] text-muted-foreground">Quanto mais escuro, mais pedidos no período.</p>

          {/* Hour labels */}
          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              <div className="flex items-center mb-1 ml-10">
                {Array.from({ length: 18 }, (_, i) => i + 6).filter(h => h % 3 === 0).map(h => (
                  <span key={h} className="text-[10px] text-muted-foreground" style={{ width: `${(3 / 18) * 100}%` }}>
                    {h}
                  </span>
                ))}
              </div>
              {orderedDays.map(dayIdx => (
                <div key={dayIdx} className="flex items-center gap-1 mb-0.5">
                  <span className="w-9 text-[11px] text-muted-foreground font-medium text-right shrink-0">
                    {dayLabels[dayIdx]}
                  </span>
                  <div className="flex gap-[2px] flex-1">
                    {heatmapData[dayIdx].map((val, h) => (
                      <div
                        key={h}
                        className={`aspect-square rounded-sm flex-1 ${getHeatColor(val)} transition-colors`}
                        title={`${dayLabels[dayIdx]} ${h + 6}h: ${val} itens`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center gap-1.5 mt-3 ml-10">
                <span className="text-[10px] text-muted-foreground">menos</span>
                <div className="w-3 h-3 rounded-sm bg-primary/20" />
                <div className="w-3 h-3 rounded-sm bg-primary/40" />
                <div className="w-3 h-3 rounded-sm bg-primary/70" />
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span className="text-[10px] text-muted-foreground">mais</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Items */}
        <div className="glass rounded-2xl p-4 space-y-3 border border-border/30">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-foreground text-xs uppercase tracking-wide">
              Itens Mais Vendidos
            </h2>
          </div>
          {topItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado no período</p>
          ) : (
            <div className="space-y-2">
              {topItems.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <div className="w-full bg-secondary/30 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-primary rounded-full h-1.5 transition-all"
                        style={{ width: `${(item.qty / (topItems[0]?.qty || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-foreground">{item.qty}x</p>
                    <p className="text-[10px] text-muted-foreground">R$ {fmt(item.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales by Category */}
        <div className="glass rounded-2xl p-4 space-y-3 border border-border/30">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-foreground text-xs uppercase tracking-wide">
              Vendas por Categoria
            </h2>
          </div>
          {salesByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado no período</p>
          ) : (
            <div className="space-y-2">
              {salesByCategory.map(cat => (
                <div key={cat.name} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{cat.name}</p>
                    <div className="w-full bg-secondary/30 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-primary rounded-full h-1.5 transition-all"
                        style={{ width: `${(cat.revenue / (salesByCategory[0]?.revenue || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-xs font-bold text-primary">R$ {fmt(cat.revenue)}</p>
                    <p className="text-[10px] text-muted-foreground">{cat.qty} itens</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-8" />
      </main>
    </div>
  );
};

const KPICard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="glass rounded-2xl p-4 border border-border/30 space-y-2">
    <div className="flex items-center gap-1.5">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
    </div>
    <p className="text-xl font-display font-bold text-foreground">{value}</p>
  </div>
);

export default ReportsPage;
