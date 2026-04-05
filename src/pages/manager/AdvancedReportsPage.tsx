import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart3, DollarSign, ShoppingBag, Clock,
  TrendingUp, Users, Calendar, Download, Filter
} from 'lucide-react';
import { ManagerSidebarTrigger } from '@/components/ManagerSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OrderData {
  id: string;
  created_at: string;
  items: Array<{
    quantity: number;
    unit_price: number;
    menu_item: { name: string; category_id: string } | null;
  }>;
}

interface SessionData {
  id: string;
  opened_at: string;
  closed_at: string | null;
  clients: Array<{ client_name: string; client_phone: string }>;
}

const AdvancedReportsPage = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/gestor');
      return;
    }
    fetchReports();
  }, [period, role, navigate]);

  const fetchReports = async () => {
    setLoading(true);
    const now = new Date();
    let startDate = new Date();

    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setDate(now.getDate() - 30);
    }

    const [ordersRes, sessionsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, created_at, items:order_items(quantity, unit_price, menu_item:menu_items(name, category_id))')
        .gte('created_at', startDate.toISOString())
        .neq('status', 'cancelled'),
      supabase
        .from('sessions')
        .select('id, opened_at, closed_at, clients:session_clients(client_name, client_phone)')
        .gte('opened_at', startDate.toISOString()),
    ]);

    if (ordersRes.data) setOrders(ordersRes.data as any);
    if (sessionsRes.data) setSessions(sessionsRes.data as any);
    setLoading(false);
  };

  const metrics = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => 
      sum + o.items.reduce((s, i) => s + i.quantity * i.unit_price, 0), 0
    );
    const totalOrders = orders.length;
    const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const uniqueClients = new Set(sessions.flatMap(s => s.clients.map(c => c.client_phone))).size;
    const avgSessionTime = sessions
      .filter(s => s.closed_at)
      .reduce((sum, s) => {
        const open = new Date(s.opened_at).getTime();
        const close = new Date(s.closed_at!).getTime();
        return sum + (close - open);
      }, 0) / Math.max(sessions.filter(s => s.closed_at).length, 1) / 60000; // em minutos

    return { totalRevenue, totalOrders, totalItems, avgTicket, uniqueClients, avgSessionTime };
  }, [orders, sessions]);

  const topItems = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    orders.forEach(o => {
      o.items.forEach(i => {
        const name = i.menu_item?.name || 'Desconhecido';
        if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
        map[name].qty += i.quantity;
        map[name].revenue += i.quantity * i.unit_price;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orders]);

  const hourlyDistribution = useMemo(() => {
    const hours: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;
    orders.forEach(o => {
      const hour = new Date(o.created_at).getHours();
      hours[hour]++;
    });
    return hours;
  }, [orders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8A00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#141414] sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ManagerSidebarTrigger />
          <div>
            <h1 className="text-2xl font-black tracking-tighter">RELATÓRIOS AVANÇADOS</h1>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Análise de Vendas & Comportamento</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as const).map(p => (
            <Button
              key={p}
              onClick={() => setPeriod(p)}
              variant={period === p ? 'default' : 'outline'}
              className={`rounded-xl font-bold ${
                period === p
                  ? 'bg-[#FF8A00] text-black'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
            >
              {p === 'today' ? 'Hoje' : p === 'week' ? '7 dias' : '30 dias'}
            </Button>
          ))}
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="bg-[#1A1A1A] border-white/10 col-span-1 md:col-span-1 lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Faturamento</p>
                  <p className="text-2xl font-black text-[#FF8A00]">R$ {metrics.totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-[#FF8A00]/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Pedidos</p>
                  <p className="text-2xl font-black text-white">{metrics.totalOrders}</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-white/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Itens</p>
                  <p className="text-2xl font-black text-white">{metrics.totalItems}</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-white/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Ticket Médio</p>
                  <p className="text-2xl font-black text-white">R$ {metrics.avgTicket.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-white/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Clientes</p>
                  <p className="text-2xl font-black text-white">{metrics.uniqueClients}</p>
                </div>
                <Users className="w-8 h-8 text-white/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Tempo Médio</p>
                  <p className="text-2xl font-black text-white">{metrics.avgSessionTime.toFixed(0)}m</p>
                </div>
                <Clock className="w-8 h-8 text-white/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Items */}
        <Card className="bg-[#1A1A1A] border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#FF8A00]" /> Top 5 Itens Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-[#FF8A00] text-black font-bold">#{idx + 1}</Badge>
                      <h4 className="font-bold text-white">{item.name}</h4>
                    </div>
                    <p className="text-sm text-white/60">{item.qty} unidades vendidas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#FF8A00]">R$ {item.revenue.toFixed(2)}</p>
                    <p className="text-[10px] text-white/40">de faturamento</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card className="bg-[#1A1A1A] border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#FF8A00]" /> Distribuição por Horário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-1">
              {Object.entries(hourlyDistribution).map(([hour, count]) => (
                <div key={hour} className="flex flex-col items-center">
                  <div
                    className="w-full bg-[#FF8A00]/30 rounded-t-lg transition-all"
                    style={{ height: `${Math.max(20, (count / Math.max(...Object.values(hourlyDistribution))) * 100)}px` }}
                  />
                  <p className="text-[10px] text-white/40 mt-1">{hour}h</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdvancedReportsPage;
