import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users, Search, Phone, Calendar, DollarSign,
  ShoppingBag, TrendingUp, MessageSquare, Star
} from 'lucide-react';
import { ManagerSidebarTrigger } from '@/components/ManagerSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ClientData {
  phone: string;
  name: string;
  totalSpent: number;
  visitCount: number;
  lastVisit: string;
  avgTicket: number;
  totalItems: number;
}

const CRMPage = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const [clients, setClients] = useState<ClientData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'spent' | 'visits' | 'recent'>('spent');

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/gestor');
      return;
    }
    fetchClients();
  }, [role, navigate]);

  const fetchClients = async () => {
    setLoading(true);
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, opened_at, closed_at, clients:session_clients(client_name, client_phone, id)');

    if (sessions) {
      const clientMap: Record<string, ClientData> = {};

      for (const session of sessions) {
        for (const client of session.clients) {
          const phone = client.client_phone || 'sem-telefone';
          if (!clientMap[phone]) {
            clientMap[phone] = {
              phone,
              name: client.client_name,
              totalSpent: 0,
              visitCount: 0,
              lastVisit: session.opened_at,
              avgTicket: 0,
              totalItems: 0,
            };
          }
          clientMap[phone].visitCount++;
          clientMap[phone].lastVisit = new Date(session.opened_at) > new Date(clientMap[phone].lastVisit)
            ? session.opened_at
            : clientMap[phone].lastVisit;

          // Buscar pedidos dessa sessão
          const { data: orders } = await supabase
            .from('orders')
            .select('id, items:order_items(quantity, unit_price)')
            .eq('session_id', session.id);

          if (orders) {
            orders.forEach(order => {
              const orderTotal = order.items.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0);
              clientMap[phone].totalSpent += orderTotal;
              clientMap[phone].totalItems += order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
            });
          }
        }
      }

      // Calcular ticket médio
      Object.values(clientMap).forEach(client => {
        client.avgTicket = client.visitCount > 0 ? client.totalSpent / client.visitCount : 0;
      });

      setClients(Object.values(clientMap));
    }
    setLoading(false);
  };

  const filteredClients = useMemo(() => {
    return clients
      .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery))
      .sort((a, b) => {
        if (sortBy === 'spent') return b.totalSpent - a.totalSpent;
        if (sortBy === 'visits') return b.visitCount - a.visitCount;
        return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
      });
  }, [clients, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const totalClients = clients.length;
    const totalRevenue = clients.reduce((sum, c) => sum + c.totalSpent, 0);
    const avgSpent = totalClients > 0 ? totalRevenue / totalClients : 0;
    const totalVisits = clients.reduce((sum, c) => sum + c.visitCount, 0);
    return { totalClients, totalRevenue, avgSpent, totalVisits };
  }, [clients]);

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
            <h1 className="text-2xl font-black tracking-tighter">CRM & CLIENTES</h1>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Histórico e Análise de Comportamento</p>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#1A1A1A] border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total de Clientes</p>
                  <p className="text-3xl font-black text-[#FF8A00]">{stats.totalClients}</p>
                </div>
                <Users className="w-8 h-8 text-[#FF8A00]/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Faturamento Total</p>
                  <p className="text-3xl font-black text-white">R$ {stats.totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-white/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Gasto Médio/Cliente</p>
                  <p className="text-3xl font-black text-white">R$ {stats.avgSpent.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-white/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total de Visitas</p>
                  <p className="text-3xl font-black text-white">{stats.totalVisits}</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-white/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              placeholder="Buscar por nome ou celular..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 rounded-xl h-11 text-sm focus:ring-1 ring-[#FF8A00]"
            />
          </div>
          <div className="flex gap-2">
            {(['spent', 'visits', 'recent'] as const).map(sort => (
              <Button
                key={sort}
                onClick={() => setSortBy(sort)}
                variant={sortBy === sort ? 'default' : 'outline'}
                className={`rounded-xl font-bold text-sm ${
                  sortBy === sort
                    ? 'bg-[#FF8A00] text-black'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                {sort === 'spent' ? 'Maior Gasto' : sort === 'visits' ? 'Mais Visitas' : 'Recente'}
              </Button>
            ))}
          </div>
        </div>

        {/* Clients List */}
        <div className="space-y-4">
          {filteredClients.length > 0 ? (
            filteredClients.map((client, idx) => (
              <Card key={client.phone} className="bg-[#1A1A1A] border-white/10 hover:border-[#FF8A00]/30 transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <Badge className="bg-[#FF8A00] text-black font-bold">#{idx + 1}</Badge>
                        <h3 className="text-lg font-bold text-white">{client.name}</h3>
                        {client.visitCount >= 10 && <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Celular</p>
                          <p className="text-white font-bold flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-[#FF8A00]" />
                            {client.phone}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Total Gasto</p>
                          <p className="text-white font-bold text-lg">R$ {client.totalSpent.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Visitas</p>
                          <p className="text-white font-bold text-lg">{client.visitCount}x</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Ticket Médio</p>
                          <p className="text-white font-bold">R$ {client.avgTicket.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Última Visita</p>
                          <p className="text-white font-bold">{new Date(client.lastVisit).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" className="rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10">
                      <MessageSquare className="w-4 h-4 mr-2" /> Contatar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 font-bold">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CRMPage;
