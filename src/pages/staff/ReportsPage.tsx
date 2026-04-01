import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, BarChart3, DollarSign, ShoppingBag,
  Package, TrendingUp, Hash, Flame, CalendarIcon
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import pop9Logo from '@/assets/pop9-logo.png';

type Period = 'today' | 'week' | 'month' | 'custom';

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

const CHART_COLORS = ['#FF8A00', '#FF6B00', '#E07800', '#CC6600', '#B35500', '#994D00', '#804000', '#663300'];

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
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  useEffect(() => {
    if (period === 'custom') return;
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

  useEffect(() => {
    if (period !== 'custom') return;
    if (customStart) setStartDate(customStart.toISOString().split('T')[0]);
    if (customEnd) setEndDate(customEnd.toISOString().split('T')[0]);
  }, [customStart, customEnd, period]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    const fetchData = async () => {
      setLoading(true);
      const from = `${startDate}T00:00:00`;
      const to = `${endDate}T23:59:59`;
      const [itemsRes, ordersRes, catsRes] = await Promise.all([
        supabase.from('order_items').select('quantity, unit_price, status, created_at, order_id, menu_item:menu_items(name, category_id)').gte('created_at', from).lte('created_at', to).neq('status', 'cancelled'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', from).lte('created_at', to).neq('status', 'cancelled'),
        supabase.from('menu_categories').select('id, name'),
      ]);
      if (itemsRes.data) setItems(itemsRes.data as unknown as OrderItemRow[]);
      setOrderCount(ordersRes.count || 0);
      if (catsRes.data) setCategories(catsRes.data);
      setLoading(false);
    };
    fetchData();
  }, [startDate, endDate]);

  const revenue = useMemo(() => items.reduce((s, i) => s + i.quantity * Number(i.unit_price), 0), [items]);
  const totalItemsSold = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const avgTicket = orderCount > 0 ? revenue / orderCount : 0;

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

  const categoryChartData = useMemo(() => {
    const totalRev = salesByCategory.reduce((s, c) => s + c.revenue, 0);
    return salesByCategory.map(c => ({
      name: c.name,
      value: c.revenue,
      percent: totalRev > 0 ? ((c.revenue / totalRev) * 100).toFixed(0) : '0',
    }));
  }, [salesByCategory]);

  const heatmapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(18).fill(0));
    items.forEach(i => {
      const d = new Date(i.created_at);
      const day = d.getDay();
      const hour = d.getHours();
      if (hour >= 6 && hour <= 23) grid[day][hour - 6] += i.quantity;
    });
    return grid;
  }, [items]);

  const maxHeat = useMemo(() => Math.max(1, ...heatmapData.flat()), [heatmapData]);
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const orderedDays = [1, 2, 3, 4, 5, 6, 0];

  const getHeatColor = (val: number) => {
    if (val === 0) return 'bg-white/5';
    const ratio = val / maxHeat;
    if (ratio < 0.25) return 'bg-[#FF8A00]/20';
    if (ratio < 0.5) return 'bg-[#FF8A00]/40';
    if (ratio < 0.75) return 'bg-[#FF8A00]/70';
    return 'bg-[#FF8A00]';
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (role !== 'admin') return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
      <p className="text-red-400">Acesso não autorizado</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#141414] border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gestor')} className="h-9 w-9 shrink-0 rounded-xl border border-white/10 bg-white/5">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-[#FF8A00] flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="font-bold text-sm uppercase tracking-wide">Relatórios</h1>
            <span className="text-[10px] text-white/40 uppercase tracking-widest">Vendas & Métricas</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Period selector */}
        <div className="flex gap-2 flex-wrap">
          {(['today', 'week', 'month', 'custom'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => { setPeriod(p); if (p === 'custom' && !customStart) { setCustomStart(new Date()); setCustomEnd(new Date()); } }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                period === p ? 'bg-[#FF8A00] text-black border-[#FF8A00]' : 'border-white/10 text-white/50 hover:text-white'
              }`}
            >
              {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Personalizado'}
            </button>
          ))}
        </div>

        {/* Date pickers */}
        <div className="flex items-center gap-2 text-xs">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("gap-1.5 h-9 rounded-xl text-xs border-white/10 bg-white/5 text-white", period !== 'custom' && "pointer-events-none opacity-70")}>
                <CalendarIcon className="w-3.5 h-3.5 text-white/40" />
                {startDate ? startDate.split('-').reverse().join('/') : 'Início'}
              </Button>
            </PopoverTrigger>
            {period === 'custom' && (
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent mode="single" selected={customStart} onSelect={(d) => { setCustomStart(d); if (d && customEnd && d > customEnd) setCustomEnd(d); }} disabled={(date) => date > new Date()} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            )}
          </Popover>
          <span className="text-white/40">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("gap-1.5 h-9 rounded-xl text-xs border-white/10 bg-white/5 text-white", period !== 'custom' && "pointer-events-none opacity-70")}>
                <CalendarIcon className="w-3.5 h-3.5 text-white/40" />
                {endDate ? endDate.split('-').reverse().join('/') : 'Fim'}
              </Button>
            </PopoverTrigger>
            {period === 'custom' && (
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent mode="single" selected={customEnd} onSelect={setCustomEnd} disabled={(date) => date > new Date() || (customStart ? date < customStart : false)} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            )}
          </Popover>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8A00]" /></div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <KPICard icon={DollarSign} label="Faturamento" value={`R$ ${fmt(revenue)}`} />
              <KPICard icon={ShoppingBag} label="Pedidos" value={String(orderCount)} />
              <KPICard icon={Package} label="Itens Vendidos" value={String(totalItemsSold)} />
              <KPICard icon={TrendingUp} label="Ticket Médio" value={`R$ ${fmt(avgTicket)}`} />
            </div>

            {/* Heatmap */}
            <div className="bg-[#1A1A1A] rounded-2xl p-4 space-y-3 border border-white/5">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#FF8A00]" />
                <h2 className="font-bold text-xs uppercase tracking-wide">Mapa de Calor — Pedidos por Dia e Hora</h2>
              </div>
              <p className="text-[11px] text-white/40">Quanto mais escuro, mais pedidos no período.</p>
              <div className="overflow-x-auto">
                <div className="min-w-[400px]">
                  <div className="flex items-center mb-1 ml-10">
                    {Array.from({ length: 18 }, (_, i) => i + 6).filter(h => h % 3 === 0).map(h => (
                      <span key={h} className="text-[10px] text-white/30" style={{ width: `${(3 / 18) * 100}%` }}>{h}</span>
                    ))}
                  </div>
                  {orderedDays.map(dayIdx => (
                    <div key={dayIdx} className="flex items-center gap-1 mb-0.5">
                      <span className="w-9 text-[11px] text-white/40 font-medium text-right shrink-0">{dayLabels[dayIdx]}</span>
                      <div className="flex gap-[2px] flex-1">
                        {heatmapData[dayIdx].map((val, h) => (
                          <div key={h} className={`aspect-square rounded-sm flex-1 ${getHeatColor(val)} transition-colors`} title={`${dayLabels[dayIdx]} ${h + 6}h: ${val} itens`} />
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 mt-3 ml-10">
                    <span className="text-[10px] text-white/30">menos</span>
                    <div className="w-3 h-3 rounded-sm bg-[#FF8A00]/20" />
                    <div className="w-3 h-3 rounded-sm bg-[#FF8A00]/40" />
                    <div className="w-3 h-3 rounded-sm bg-[#FF8A00]/70" />
                    <div className="w-3 h-3 rounded-sm bg-[#FF8A00]" />
                    <span className="text-[10px] text-white/30">mais</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Items - Horizontal Bar Chart */}
            <div className="bg-[#1A1A1A] rounded-2xl p-4 space-y-3 border border-white/5">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-[#FF8A00]" />
                <h2 className="font-bold text-xs uppercase tracking-wide">Itens Mais Vendidos</h2>
              </div>
              {topItems.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-6">Nenhum dado no período</p>
              ) : (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topItems} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(value: number) => [`${value} un.`, 'Quantidade']}
                      />
                      <Bar dataKey="qty" fill="#FF8A00" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Sales by Category - Donut Chart */}
            <div className="bg-[#1A1A1A] rounded-2xl p-4 space-y-3 border border-white/5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#FF8A00]" />
                <h2 className="font-bold text-xs uppercase tracking-wide">Vendas por Categoria</h2>
              </div>
              {categoryChartData.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-6">Nenhum dado no período</p>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="h-[220px] w-full max-w-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {categoryChartData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                          formatter={(value: number) => [`R$ ${fmt(value)}`, 'Receita']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {categoryChartData.map((cat, idx) => (
                      <div key={cat.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-3 h-3 rounded-sm" style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }} />
                        <span className="text-white/60">{cat.name}</span>
                        <span className="text-white/30">{cat.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Item Table */}
            <div className="bg-[#1A1A1A] rounded-2xl p-4 space-y-3 border border-white/5">
              <h2 className="font-bold text-xs uppercase tracking-wide">Detalhamento por Item</h2>
              {topItems.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-6">Nenhum dado no período</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 text-[10px] uppercase tracking-widest">
                        <th className="text-left py-2 px-1 font-bold">#</th>
                        <th className="text-left py-2 px-1 font-bold">Item</th>
                        <th className="text-center py-2 px-1 font-bold">Qtd</th>
                        <th className="text-right py-2 px-1 font-bold">Receita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topItems.map((item, idx) => (
                        <tr key={item.name} className="border-b border-white/5 last:border-0">
                          <td className="py-2.5 px-1 text-[#FF8A00] font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-1 font-medium text-white/90">{item.name}</td>
                          <td className="py-2.5 px-1 text-center text-white/60">{item.qty}</td>
                          <td className="py-2.5 px-1 text-right font-bold text-[#FF8A00]">R$ {fmt(item.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="h-8" />
          </>
        )}
      </main>
    </div>
  );
};

const KPICard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-white/5 space-y-2">
    <div className="flex items-center gap-1.5">
      <Icon className="w-4 h-4 text-[#FF8A00]" />
      <span className="text-[11px] text-white/40 uppercase tracking-wider font-bold">{label}</span>
    </div>
    <p className="text-xl font-black text-white">{value}</p>
  </div>
);

export default ReportsPage;
