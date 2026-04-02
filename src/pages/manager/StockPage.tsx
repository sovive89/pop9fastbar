import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Package, AlertTriangle, TrendingDown, TrendingUp,
  RefreshCw, Search, Bell, BellOff, ClipboardCheck, BarChart3,
  Plus, Minus, ArrowUpDown, Calendar, X, CheckCircle2, XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import pop9Logo from '@/assets/pop9-logo.png';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

interface StockMovement {
  id: string;
  menu_item_id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_at: string;
  performed_by: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  stock_quantity: number;
  stock_alert_threshold: number;
  is_active: boolean;
  category_id: string;
  price: number;
}

type Tab = 'overview' | 'history' | 'reports' | 'inventory';

const ALERT_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGYcBh+P0NvdqFwTABqG0NnhsWQYABaC0djhsWQYABaC0djktG8kCBN/y9Xfr2AXAhN/y9XiqmMdERV/y9XiqmMdERV/y9XiqmMdERV/y9XiqmMdEQ==';

const StockPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  // Movement modal
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementItem, setMovementItem] = useState<MenuItem | null>(null);
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [movementQty, setMovementQty] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Alerts
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [alertsDismissed, setAlertsDismissed] = useState<string[]>([]);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const prevAlertItemsRef = useRef<string[]>([]);

  // Inventory
  const [inventoryMode, setInventoryMode] = useState(false);
  const [inventoryCounts, setInventoryCounts] = useState<Record<string, string>>({});
  const [inventoryNotes, setInventoryNotes] = useState<Record<string, string>>({});

  // Reports
  const [reportPeriod, setReportPeriod] = useState<'today' | '7d' | '30d'>('7d');

  const fetchData = useCallback(async () => {
    const { data: menuItems } = await supabase.from('menu_items').select('*').order('name');
    if (menuItems) setItems(menuItems as MenuItem[]);
    const { data: movs } = await supabase.from('stock_movements' as any).select('*').order('created_at', { ascending: false }).limit(200);
    if (movs) setMovements(movs as any);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime alerts
  useEffect(() => {
    if (!alertsEnabled) return;
    const lowItems = items.filter(i => {
      const s = i.stock_quantity ?? -1;
      return s !== -1 && s <= (i.stock_alert_threshold ?? 5) && !alertsDismissed.includes(i.id);
    });
    const newAlerts = lowItems.filter(i => !prevAlertItemsRef.current.includes(i.id));
    if (newAlerts.length > 0) {
      try {
        if (!alertAudioRef.current) alertAudioRef.current = new Audio(ALERT_SOUND_URL);
        alertAudioRef.current.play().catch(() => {});
      } catch {}
      newAlerts.forEach(item => {
        const isOut = item.stock_quantity === 0;
        toast({
          title: isOut ? '🚨 Item esgotado!' : '⚠️ Estoque baixo!',
          description: `${item.name}: ${isOut ? 'sem estoque' : `${item.stock_quantity} un restantes`}`,
          variant: isOut ? 'destructive' : 'default',
        });
      });
    }
    prevAlertItemsRef.current = lowItems.map(i => i.id);
  }, [items, alertsEnabled, alertsDismissed, toast]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalTracked = items.filter(i => (i.stock_quantity ?? -1) !== -1).length;
  const lowStock = items.filter(i => { const s = i.stock_quantity ?? -1; return s !== -1 && s <= (i.stock_alert_threshold ?? 5) && s > 0; }).length;
  const outOfStock = items.filter(i => (i.stock_quantity ?? -1) === 0).length;

  const filteredItems = items.filter(i => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    const stock = i.stock_quantity ?? -1;
    if (filter === 'low') return stock !== -1 && stock <= (i.stock_alert_threshold ?? 5) && stock > 0;
    if (filter === 'out') return stock === 0;
    return true;
  });

  const executeMovement = async () => {
    if (!movementItem || !movementQty || parseInt(movementQty) <= 0) {
      toast({ title: 'Informe uma quantidade válida', variant: 'destructive' });
      return;
    }
    const qty = parseInt(movementQty);
    const prev = movementItem.stock_quantity ?? -1;
    if (prev === -1) return;

    let newStock: number;
    let dbQty: number;
    if (movementType === 'in') {
      newStock = prev + qty;
      dbQty = qty;
    } else if (movementType === 'out') {
      newStock = Math.max(0, prev - qty);
      dbQty = -qty;
    } else {
      newStock = qty; // adjustment sets absolute value
      dbQty = qty - prev;
    }

    await supabase.from('menu_items').update({
      stock_quantity: newStock,
      is_active: newStock === 0 ? false : movementItem.is_active
    }).eq('id', movementItem.id);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('stock_movements' as any).insert({
      menu_item_id: movementItem.id,
      movement_type: movementType,
      quantity: dbQty,
      previous_stock: prev,
      new_stock: newStock,
      reason: movementReason || (movementType === 'in' ? 'Entrada manual' : movementType === 'out' ? 'Saída manual' : 'Ajuste de inventário'),
      performed_by: user?.id || null,
    });

    toast({ title: `Movimentação registrada: ${movementItem.name}` });
    setShowMovementModal(false);
    setMovementQty('');
    setMovementReason('');
    fetchData();
  };

  const openMovement = (item: MenuItem, type: 'in' | 'out' | 'adjustment') => {
    setMovementItem(item);
    setMovementType(type);
    setMovementQty('');
    setMovementReason('');
    setShowMovementModal(true);
  };

  // Inventory functions
  const startInventory = () => {
    setInventoryMode(true);
    const counts: Record<string, string> = {};
    items.filter(i => (i.stock_quantity ?? -1) !== -1).forEach(i => { counts[i.id] = ''; });
    setInventoryCounts(counts);
    setInventoryNotes({});
    setTab('inventory');
  };

  const submitInventory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    let divergences = 0;
    for (const item of items.filter(i => (i.stock_quantity ?? -1) !== -1)) {
      const countStr = inventoryCounts[item.id];
      if (countStr === '' || countStr === undefined) continue;
      const counted = parseInt(countStr);
      if (isNaN(counted) || counted < 0) continue;
      const prev = item.stock_quantity;
      if (counted !== prev) {
        divergences++;
        await supabase.from('menu_items').update({
          stock_quantity: counted,
          is_active: counted === 0 ? false : item.is_active
        }).eq('id', item.id);
        await supabase.from('stock_movements' as any).insert({
          menu_item_id: item.id,
          movement_type: 'adjustment',
          quantity: counted - prev,
          previous_stock: prev,
          new_stock: counted,
          reason: `Contagem física${inventoryNotes[item.id] ? `: ${inventoryNotes[item.id]}` : ''}`,
          performed_by: user?.id || null,
        });
      }
    }
    toast({ title: `Inventário finalizado!`, description: `${divergences} divergência(s) registrada(s)` });
    setInventoryMode(false);
    fetchData();
  };

  // Reports data
  const getReportData = () => {
    const now = new Date();
    let since: Date;
    if (reportPeriod === 'today') { since = new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
    else if (reportPeriod === '7d') { since = new Date(now.getTime() - 7 * 86400000); }
    else { since = new Date(now.getTime() - 30 * 86400000); }

    const filteredMovs = movements.filter(m => new Date(m.created_at) >= since);
    const outMovs = filteredMovs.filter(m => m.movement_type === 'out');
    const inMovs = filteredMovs.filter(m => m.movement_type === 'in');

    // Top consumed items
    const consumption: Record<string, number> = {};
    outMovs.forEach(m => {
      const name = items.find(i => i.id === m.menu_item_id)?.name || 'Desconhecido';
      consumption[name] = (consumption[name] || 0) + Math.abs(m.quantity);
    });
    const topConsumed = Object.entries(consumption)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, qty]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, quantidade: qty }));

    // Movement by type
    const typeData = [
      { name: 'Entradas', value: inMovs.length, fill: 'hsl(142, 70%, 45%)' },
      { name: 'Saídas', value: outMovs.length, fill: 'hsl(0, 84%, 60%)' },
      { name: 'Ajustes', value: filteredMovs.filter(m => m.movement_type === 'adjustment').length, fill: 'hsl(217, 91%, 60%)' },
    ];

    // Daily trend
    const dayMap: Record<string, { entradas: number; saidas: number }> = {};
    filteredMovs.forEach(m => {
      const day = new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dayMap[day]) dayMap[day] = { entradas: 0, saidas: 0 };
      if (m.movement_type === 'in') dayMap[day].entradas += Math.abs(m.quantity);
      else if (m.movement_type === 'out') dayMap[day].saidas += Math.abs(m.quantity);
    });
    const dailyTrend = Object.entries(dayMap).slice(-14).map(([day, v]) => ({ dia: day, ...v }));

    const totalOut = outMovs.reduce((s, m) => s + Math.abs(m.quantity), 0);
    const totalIn = inMovs.reduce((s, m) => s + Math.abs(m.quantity), 0);

    return { topConsumed, typeData, dailyTrend, totalOut, totalIn, totalMovements: filteredMovs.length };
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const CHART_COLORS = ['hsl(38, 92%, 50%)', 'hsl(142, 70%, 45%)', 'hsl(217, 91%, 60%)', 'hsl(0, 84%, 60%)', 'hsl(280, 65%, 60%)', 'hsl(190, 80%, 50%)', 'hsl(45, 90%, 55%)', 'hsl(320, 70%, 55%)'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gestor/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img src={pop9Logo} alt="PØP9" className="h-6 mix-blend-lighten" />
          <h1 className="font-display font-bold text-lg text-foreground flex-1">Estoque</h1>
          <Button
            variant="ghost" size="icon"
            onClick={() => setAlertsEnabled(!alertsEnabled)}
            className={alertsEnabled ? 'text-primary' : 'text-muted-foreground'}
          >
            {alertsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4 pb-24">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="glass rounded-2xl p-3 text-center border border-border/20">
            <Package className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold text-foreground">{totalTracked}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rastreados</p>
          </div>
          <div className={`glass rounded-2xl p-3 text-center border ${lowStock > 0 ? 'border-yellow-500/30 animate-pulse' : 'border-border/20'}`}>
            <AlertTriangle className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
            <p className="text-xl font-bold text-yellow-400">{lowStock}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Baixo</p>
          </div>
          <div className={`glass rounded-2xl p-3 text-center border ${outOfStock > 0 ? 'border-destructive/30 animate-pulse' : 'border-border/20'}`}>
            <XCircle className="w-5 h-5 mx-auto text-destructive mb-1" />
            <p className="text-xl font-bold text-destructive">{outOfStock}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Esgotados</p>
          </div>
        </div>

        {/* Alert banner */}
        {alertsEnabled && (lowStock > 0 || outOfStock > 0) && (
          <div className={`glass rounded-2xl p-3 border ${outOfStock > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${outOfStock > 0 ? 'text-destructive' : 'text-yellow-400'}`} />
              <p className="text-sm font-medium text-foreground flex-1">
                {outOfStock > 0 ? `${outOfStock} item(ns) esgotado(s)` : `${lowStock} item(ns) com estoque baixo`}
              </p>
              <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => { setFilter(outOfStock > 0 ? 'out' : 'low'); setTab('overview'); }}>
                Ver itens
              </Button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {([
            { key: 'overview' as Tab, label: 'Visão Geral', icon: Package },
            { key: 'history' as Tab, label: 'Histórico', icon: RefreshCw },
            { key: 'reports' as Tab, label: 'Relatórios', icon: BarChart3 },
            { key: 'inventory' as Tab, label: 'Inventário', icon: ClipboardCheck },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ===== OVERVIEW TAB ===== */}
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
              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Nenhum item encontrado</p>
                </div>
              )}
              {filteredItems.map(item => {
                const stock = item.stock_quantity ?? -1;
                const threshold = item.stock_alert_threshold ?? 5;
                const isLow = stock !== -1 && stock <= threshold && stock > 0;
                const isOut = stock === 0;

                return (
                  <div key={item.id} className={`glass rounded-2xl p-3 border transition-all ${isOut ? 'border-destructive/20 bg-destructive/5' : isLow ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-border/20'}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {stock === -1 ? (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground border-border/30">Ilimitado</Badge>
                          ) : isOut ? (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Esgotado</Badge>
                          ) : isLow ? (
                            <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500/15 text-yellow-400 border-yellow-500/20">{stock} un (alerta: {threshold})</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-green-400 border-green-500/20">{stock} un</Badge>
                          )}
                          <span className="text-[9px] text-muted-foreground">R$ {Number(item.price).toFixed(2)}</span>
                        </div>
                      </div>
                      {stock !== -1 && (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px] gap-0.5 px-2 border-green-500/20 text-green-400 hover:bg-green-500/10" onClick={() => openMovement(item, 'in')}>
                            <TrendingUp className="w-3 h-3" />Entrada
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px] gap-0.5 px-2 border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={() => openMovement(item, 'out')}>
                            <TrendingDown className="w-3 h-3" />Saída
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 px-0 text-muted-foreground" onClick={() => openMovement(item, 'adjustment')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ===== HISTORY TAB ===== */}
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
                  <div key={m.id} className="glass rounded-xl p-3 flex items-center gap-3 border border-border/20">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      m.movement_type === 'in' ? 'bg-green-500/15' : m.movement_type === 'out' ? 'bg-red-500/15' : 'bg-blue-500/15'
                    }`}>
                      {m.movement_type === 'in' ? <TrendingUp className="w-4 h-4 text-green-400" /> :
                       m.movement_type === 'out' ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                       <ArrowUpDown className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item?.name || 'Item removido'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {m.reason || m.movement_type} • {m.previous_stock} → {m.new_stock}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
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

        {/* ===== REPORTS TAB ===== */}
        {tab === 'reports' && (() => {
          const { topConsumed, typeData, dailyTrend, totalOut, totalIn, totalMovements } = getReportData();
          return (
            <div className="space-y-4">
              {/* Period filter */}
              <div className="flex gap-1.5">
                {([
                  { key: 'today' as const, label: 'Hoje' },
                  { key: '7d' as const, label: '7 dias' },
                  { key: '30d' as const, label: '30 dias' },
                ]).map(p => (
                  <button key={p.key} onClick={() => setReportPeriod(p.key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${reportPeriod === p.key ? 'bg-primary/20 text-primary' : 'text-muted-foreground bg-secondary/20'}`}>
                    <Calendar className="w-3 h-3 inline mr-1" />{p.label}
                  </button>
                ))}
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2">
                <div className="glass rounded-xl p-3 text-center border border-border/20">
                  <p className="text-lg font-bold text-foreground">{totalMovements}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Movimentações</p>
                </div>
                <div className="glass rounded-xl p-3 text-center border border-green-500/20">
                  <p className="text-lg font-bold text-green-400">+{totalIn}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Entradas</p>
                </div>
                <div className="glass rounded-xl p-3 text-center border border-red-500/20">
                  <p className="text-lg font-bold text-red-400">-{totalOut}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Saídas</p>
                </div>
              </div>

              {/* Top consumed */}
              {topConsumed.length > 0 && (
                <div className="glass rounded-2xl p-4 border border-border/20">
                  <h3 className="text-sm font-semibold text-foreground mb-3">🔥 Itens mais consumidos</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topConsumed} layout="vertical" margin={{ left: 0, right: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: 'hsl(40, 10%, 60%)' }} />
                      <Tooltip contentStyle={{ background: 'hsl(0,0%,8%)', border: '1px solid hsl(0,0%,18%)', borderRadius: '12px', fontSize: 12 }} />
                      <Bar dataKey="quantidade" radius={[0, 6, 6, 0]} fill="hsl(38, 92%, 50%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Movement type distribution */}
              {typeData.some(d => d.value > 0) && (
                <div className="glass rounded-2xl p-4 border border-border/20">
                  <h3 className="text-sm font-semibold text-foreground mb-3">📊 Tipo de movimentação</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} strokeWidth={0} label={({ name, value }) => `${name}: ${value}`}>
                        {typeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(0,0%,8%)', border: '1px solid hsl(0,0%,18%)', borderRadius: '12px', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Daily trend */}
              {dailyTrend.length > 0 && (
                <div className="glass rounded-2xl p-4 border border-border/20">
                  <h3 className="text-sm font-semibold text-foreground mb-3">📈 Tendência diária</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,18%)" />
                      <XAxis dataKey="dia" tick={{ fontSize: 9, fill: 'hsl(40, 10%, 60%)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(40, 10%, 60%)' }} />
                      <Tooltip contentStyle={{ background: 'hsl(0,0%,8%)', border: '1px solid hsl(0,0%,18%)', borderRadius: '12px', fontSize: 12 }} />
                      <Line type="monotone" dataKey="entradas" stroke="hsl(142, 70%, 45%)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="saidas" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {totalMovements === 0 && (
                <div className="text-center py-12">
                  <BarChart3 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Sem dados para este período</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ===== INVENTORY TAB ===== */}
        {tab === 'inventory' && (
          <div className="space-y-4">
            {!inventoryMode ? (
              <div className="text-center py-12 space-y-4">
                <ClipboardCheck className="w-16 h-16 text-muted-foreground/20 mx-auto" />
                <div>
                  <h3 className="font-semibold text-foreground">Contagem Física</h3>
                  <p className="text-sm text-muted-foreground mt-1">Compare o estoque real com o sistema e registre divergências automaticamente</p>
                </div>
                <Button onClick={startInventory} className="rounded-xl gap-2">
                  <ClipboardCheck className="w-4 h-4" /> Iniciar Inventário
                </Button>
              </div>
            ) : (
              <>
                <div className="glass rounded-2xl p-3 border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium text-foreground flex-1">Inventário em andamento</p>
                    <Badge variant="outline" className="text-[9px] text-primary border-primary/30">
                      {Object.values(inventoryCounts).filter(v => v !== '').length}/{items.filter(i => (i.stock_quantity ?? -1) !== -1).length} contados
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  {items.filter(i => (i.stock_quantity ?? -1) !== -1).map(item => {
                    const counted = inventoryCounts[item.id];
                    const hasDivergence = counted !== '' && counted !== undefined && parseInt(counted) !== item.stock_quantity;
                    return (
                      <div key={item.id} className={`glass rounded-2xl p-3 border transition-all ${hasDivergence ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border/20'}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">Sistema: {item.stock_quantity} un</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number" min="0" placeholder="Qtd"
                              value={inventoryCounts[item.id] || ''}
                              onChange={e => setInventoryCounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                              className="w-20 h-8 text-center rounded-lg bg-secondary/30 text-sm"
                            />
                            {hasDivergence && (
                              <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500/15 text-yellow-400 border-yellow-500/20">
                                {parseInt(counted) - item.stock_quantity > 0 ? '+' : ''}{parseInt(counted) - item.stock_quantity}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {hasDivergence && (
                          <Input
                            placeholder="Observação da divergência..."
                            value={inventoryNotes[item.id] || ''}
                            onChange={e => setInventoryNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="mt-2 h-7 text-xs rounded-lg bg-secondary/20"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Button onClick={submitInventory} className="flex-1 rounded-xl gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Finalizar Inventário
                  </Button>
                  <Button variant="outline" onClick={() => setInventoryMode(false)} className="rounded-xl">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Movement Modal */}
      {showMovementModal && movementItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowMovementModal(false)}>
          <div className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 space-y-4 border border-border/30 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-foreground">
                {movementType === 'in' ? '📦 Entrada' : movementType === 'out' ? '📤 Saída' : '🔄 Ajuste'}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowMovementModal(false)}><X className="w-5 h-5" /></Button>
            </div>

            <div className="glass rounded-xl p-3 border border-border/20">
              <p className="font-medium text-foreground">{movementItem.name}</p>
              <p className="text-xs text-muted-foreground">Estoque atual: {movementItem.stock_quantity} un</p>
            </div>

            {/* Movement type selector */}
            <div className="flex gap-1.5">
              {([
                { key: 'in' as const, label: 'Entrada', icon: TrendingUp, color: 'text-green-400 border-green-500/30' },
                { key: 'out' as const, label: 'Saída', icon: TrendingDown, color: 'text-red-400 border-red-500/30' },
                { key: 'adjustment' as const, label: 'Ajuste', icon: ArrowUpDown, color: 'text-blue-400 border-blue-500/30' },
              ]).map(t => (
                <button key={t.key} onClick={() => setMovementType(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${movementType === t.key ? `${t.color} bg-secondary/50` : 'text-muted-foreground border-border/20'}`}>
                  <t.icon className="w-3.5 h-3.5" />{t.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {movementType === 'adjustment' ? 'Novo estoque absoluto' : 'Quantidade'}
              </Label>
              <Input type="number" min="0" value={movementQty} onChange={e => setMovementQty(e.target.value)} placeholder="0" className="rounded-xl bg-secondary/30 text-lg text-center h-12" autoFocus />
              {movementType !== 'adjustment' && movementQty && (
                <p className="text-xs text-muted-foreground text-center">
                  Resultado: {movementItem.stock_quantity} → {movementType === 'in' ? movementItem.stock_quantity + parseInt(movementQty || '0') : Math.max(0, movementItem.stock_quantity - parseInt(movementQty || '0'))} un
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Motivo (opcional)</Label>
              <Input value={movementReason} onChange={e => setMovementReason(e.target.value)} placeholder="Ex: Reposição fornecedor, Quebra..." className="rounded-xl bg-secondary/30" />
            </div>

            <Button onClick={executeMovement} className="w-full rounded-xl h-11 gap-2">
              <CheckCircle2 className="w-4 h-4" /> Confirmar Movimentação
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPage;
