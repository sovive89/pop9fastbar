import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart3, DollarSign, ShoppingBag, Clock,
  TrendingUp, Users, Calendar, Download, Filter,
  Star, Mail, Smartphone
} from 'lucide-react';
import { ManagerSidebarTrigger } from '@/components/ManagerSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OrderData {
  id: string;
  created_at: string;
  order_type: string;
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
  clients: Array<{ client_name: string; client_phone: string; email: string | null }>;
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
        .select('id, created_at, order_type, items:order_items(quantity, unit_price, menu_item:menu_items(name, category_id))')
        .gte('created_at', startDate.toISOString())
        .neq('status', 'cancelled'),
      supabase
        .from('sessions')
        .select('id, opened_at, closed_at, clients:session_clients(client_name, client_phone, email)')
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
    const clientsWithEmail = sessions.flatMap(s => s.clients).filter(c => c.email).length;
    
    const directSales = orders.filter(o => o.order_type === 'direct_sale').length;
    const sessionOrders = orders.filter(o => o.order_type !== 'direct_sale').length;

    const avgSessionTime = sessions
      .filter(s => s.closed_at)
      .reduce((sum, s) => {
        const open = new Date(s.opened_at).getTime();
        const close = new Date(s.closed_at!).getTime();
        return sum + (close - open);
      }, 0) / Math.max(sessions.filter(s => s.closed_at).length, 1) / 60000; // em minutos

    return { 
      totalRevenue, totalOrders, totalItems, avgTicket, 
      uniqueClients, clientsWithEmail, avgSessionTime,
      directSales, sessionOrders
    };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF8A00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#141414] sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ManagerSidebarTrigger />
          <div>
            <h1 className="text-2xl font-black tracking-tighter italic">DASHBOARD ANALÍTICO</h1>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Vendas • CRM • Performance</p>
          </div>
        </div>
        <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          {(['today', 'week', 'month'] as const).map(p => (
            <Button
              key={p}
              onClick={() => setPeriod(p)}
              variant="ghost"
              className={`rounded-lg font-bold text-xs h-9 px-4 transition-all ${
                period === p
                  ? 'bg-[#FF8A00] text-black shadow-lg shadow-[#FF8A00]/20'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {p === 'today' ? 'Hoje' : p === 'week' ? '7 dias' : '30 dias'}
            </Button>
          ))}
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#1A1A1A] border-white/10 rounded-[2rem] overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Faturamento Total</p>
                  <p className="text-3xl font-black text-[#FF8A00]">R$ {metrics.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-[#FF8A00]/10 p-3 rounded-2xl">
                  <DollarSign className="w-6 h-6 text-[#FF8A00]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-white/10 rounded-[2rem] overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Ticket Médio</p>
                  <p className="text-3xl font-black text-white">R$ {metrics.avgTicket.toFixed(2)}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl">
                  <TrendingUp className="w-6 h-6 text-white/40" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-white/10 rounded-[2rem] overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Novos Clientes</p>
                  <p className="text-3xl font-black text-white">{metrics.uniqueClients}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl">
                  <Users className="w-6 h-6 text-white/40" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-white/10 rounded-[2rem] overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Captura de E-mail</p>
                  <p className="text-3xl font-black text-white">{metrics.clientsWithEmail}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl">
                  <Mail className="w-6 h-6 text-white/40" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Top Items */}
          <Card className="bg-[#1A1A1A] border-white/10 rounded-[2.5rem] lg:col-span-8 overflow-hidden">
            <CardHeader className="bg-white/[0.02] border-b border-white/5">
              <CardTitle className="text-lg font-black italic flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#FF8A00]" /> TOP 5 ITENS MAIS VENDIDOS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {topItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#FF8A00] rounded-xl flex items-center justify-center text-black font-black">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{item.name}</h4>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{item.qty} unidades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-[#FF8A00]">R$ {item.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Operational Mix */}
          <Card className="bg-[#1A1A1A] border-white/10 rounded-[2.5rem] lg:col-span-4 overflow-hidden">
            <CardHeader className="bg-white/[0.02] border-b border-white/5">
              <CardTitle className="text-lg font-black italic flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#FF8A00]" /> MIX OPERACIONAL
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                  <span>Venda Direta (PDV)</span>
                  <span>{metrics.directSales}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-1000" 
                    style={{ width: `${(metrics.directSales / Math.max(metrics.totalOrders, 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                  <span>Comandas (Sessões)</span>
                  <span>{metrics.sessionOrders}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#FF8A00] transition-all duration-1000" 
                    style={{ width: `${(metrics.sessionOrders / Math.max(metrics.totalOrders, 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-white/20" />
                    <span className="text-xs font-bold text-white/60">Tempo Médio Comanda</span>
                  </div>
                  <span className="text-lg font-black">{metrics.avgSessionTime.toFixed(0)} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-[#FF8A00]" />
                    <span className="text-xs font-bold text-white/60">Taxa de Conversão CRM</span>
                  </div>
                  <span className="text-lg font-black">{((metrics.clientsWithEmail / Math.max(metrics.uniqueClients, 1)) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdvancedReportsPage;
