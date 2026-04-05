import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Package, AlertTriangle, TrendingDown, TrendingUp,
  RefreshCw, Search, Plus, X, CheckCircle2, XCircle,
  ArrowUpDown, BarChart3, ClipboardCheck, Boxes,
  Factory, Edit, Trash2, Truck, Calendar, FileText, Phone, Mail, MapPin, Building2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ManagerSidebarTrigger } from '@/components/ManagerSidebar';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';

interface Product {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  unit_of_measure: string;
  supplier: string | null;
  supplier_id: string | null;
  cost_per_lot: number;
  lot_size: number;
  cost_per_unit: number;
  category: string | null;
  sku: string | null;
  barcode: string | null;
  min_stock: number;
  current_stock: number;
  is_active: boolean;
}

interface ProductMovement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  lot_number: string | null;
  created_at: string;
}

interface ProductionRecipe {
  id: string;
  menu_item_id: string;
  product_id: string;
  quantity_used: number;
  unit_of_measure: string;
  notes: string | null;
  produced_at: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  stock_quantity: number;
  stock_alert_threshold: number;
  is_active: boolean;
  price: number;
}

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  cnpj: string | null;
  notes: string | null;
  is_active: boolean;
}

interface PurchaseEntry {
  id: string;
  product_id: string;
  supplier_id: string | null;
  quantity: number;
  unit_of_measure: string;
  cost_total: number;
  cost_per_unit: number;
  lot_number: string | null;
  invoice_number: string | null;
  purchase_date: string;
  notes: string | null;
  created_at: string;
}

type MainTab = 'products' | 'purchases' | 'suppliers' | 'production' | 'legacy' | 'reports';

const UNITS = ['un', 'kg', 'g', 'L', 'ml', 'cx', 'pct', 'lata', 'garrafa', 'dose', 'fatia'];

const StockPage = () => {
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<ProductMovement[]>([]);
  const [recipes, setRecipes] = useState<ProductionRecipe[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);

  const [mainTab, setMainTab] = useState<MainTab>('products');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '', description: '', brand: '', unit_of_measure: 'un',
    supplier: '', supplier_id: '', cost_per_lot: '', lot_size: '1', category: 'geral',
    sku: '', barcode: '', min_stock: '0', current_stock: '0'
  });

  // Movement modal
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [movementQty, setMovementQty] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [movementLot, setMovementLot] = useState('');

  // Recipe form
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [recipeForm, setRecipeForm] = useState({
    menu_item_id: '', product_id: '', quantity_used: '', unit_of_measure: 'un', notes: '', produced_at: new Date().toISOString().slice(0, 16)
  });

  // Supplier form
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '', contact_name: '', phone: '', email: '', address: '', city: '', state: '', cnpj: '', notes: ''
  });

  // Purchase entry form
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    product_id: '', supplier_id: '', quantity: '', unit_of_measure: 'un',
    cost_total: '', lot_number: '', invoice_number: '', purchase_date: new Date().toISOString().slice(0, 16), notes: ''
  });

  // Purchase search
  const [purchaseSearch, setPurchaseSearch] = useState('');

  // Reports
  const [reportPeriod, setReportPeriod] = useState<'today' | '7d' | '30d'>('7d');

  const fetchData = useCallback(async () => {
    const [prodRes, movRes, recRes, menuRes, supRes, purRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('product_movements').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('production_recipes').select('*'),
      supabase.from('menu_items').select('id, name, stock_quantity, stock_alert_threshold, is_active, price').order('name'),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('purchase_entries').select('*').order('purchase_date', { ascending: false }).limit(500),
    ]);
    if (prodRes.data) setProducts(prodRes.data as any);
    if (movRes.data) setMovements(movRes.data as any);
    if (recRes.data) setRecipes(recRes.data as any);
    if (menuRes.data) setMenuItems(menuRes.data as MenuItem[]);
    if (supRes.data) setSuppliers(supRes.data as any);
    if (purRes.data) setPurchases(purRes.data as any);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = supabase.channel('stock-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_movements' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_entries' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  // KPIs
  const totalProducts = products.length;
  const lowStock = products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock).length;
  const outOfStock = products.filter(p => p.current_stock === 0).length;
  const totalValue = products.reduce((s, p) => s + p.current_stock * (p.cost_per_unit || 0), 0);

  // Filtered products
  const filteredProducts = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.brand?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'low') return p.current_stock > 0 && p.current_stock <= p.min_stock;
    if (filter === 'out') return p.current_stock === 0;
    return true;
  });

  // --- Product CRUD ---
  const resetProductForm = () => {
    setProductForm({ name: '', description: '', brand: '', unit_of_measure: 'un', supplier: '', supplier_id: '', cost_per_lot: '', lot_size: '1', category: 'geral', sku: '', barcode: '', min_stock: '0', current_stock: '0' });
    setEditingProduct(null);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name, description: p.description || '', brand: p.brand || '',
      unit_of_measure: p.unit_of_measure, supplier: p.supplier || '', supplier_id: p.supplier_id || '',
      cost_per_lot: String(p.cost_per_lot), lot_size: String(p.lot_size),
      category: p.category || 'geral', sku: p.sku || '', barcode: p.barcode || '',
      min_stock: String(p.min_stock), current_stock: String(p.current_stock)
    });
    setShowProductForm(true);
  };

  const saveProduct = async () => {
    if (!productForm.name.trim()) { toast({ title: 'Informe o nome do produto', variant: 'destructive' }); return; }
    const payload: any = {
      name: productForm.name.trim(),
      description: productForm.description || null,
      brand: productForm.brand || null,
      unit_of_measure: productForm.unit_of_measure,
      supplier: productForm.supplier || null,
      supplier_id: productForm.supplier_id || null,
      cost_per_lot: parseFloat(productForm.cost_per_lot) || 0,
      lot_size: parseInt(productForm.lot_size) || 1,
      category: productForm.category || 'geral',
      sku: productForm.sku || null,
      barcode: productForm.barcode || null,
      min_stock: parseInt(productForm.min_stock) || 0,
      current_stock: parseFloat(productForm.current_stock) || 0,
    };

    if (editingProduct) {
      await supabase.from('products').update(payload).eq('id', editingProduct.id);
      toast({ title: 'Produto atualizado!' });
    } else {
      await supabase.from('products').insert(payload);
      toast({ title: 'Produto cadastrado!' });
    }
    setShowProductForm(false);
    resetProductForm();
    fetchData();
  };

  const deleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    toast({ title: 'Produto removido' });
    fetchData();
  };

  // --- Movements ---
  const openMovement = (product: Product, type: 'in' | 'out' | 'adjustment') => {
    setMovementProduct(product);
    setMovementType(type);
    setMovementQty('');
    setMovementReason('');
    setMovementLot('');
    setShowMovementModal(true);
  };

  const executeMovement = async () => {
    if (!movementProduct || !movementQty || parseFloat(movementQty) <= 0) {
      toast({ title: 'Informe uma quantidade válida', variant: 'destructive' }); return;
    }
    const qty = parseFloat(movementQty);
    const prev = movementProduct.current_stock;
    let newStock: number;
    if (movementType === 'in') newStock = prev + qty;
    else if (movementType === 'out') newStock = Math.max(0, prev - qty);
    else newStock = qty;

    await supabase.from('products').update({ current_stock: newStock }).eq('id', movementProduct.id);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('product_movements').insert({
      product_id: movementProduct.id,
      movement_type: movementType,
      quantity: movementType === 'out' ? -qty : (movementType === 'adjustment' ? qty - prev : qty),
      previous_stock: prev,
      new_stock: newStock,
      reason: movementReason || (movementType === 'in' ? 'Entrada manual' : movementType === 'out' ? 'Saída manual' : 'Ajuste'),
      lot_number: movementLot || null,
      performed_by: user?.id || null,
    });

    toast({ title: `Movimentação registrada: ${movementProduct.name}` });
    setShowMovementModal(false);
    fetchData();
  };

  // --- Recipes ---
  const saveRecipe = async () => {
    if (!recipeForm.menu_item_id || !recipeForm.product_id || !recipeForm.quantity_used) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' }); return;
    }
    await supabase.from('production_recipes').insert({
      menu_item_id: recipeForm.menu_item_id,
      product_id: recipeForm.product_id,
      quantity_used: parseFloat(recipeForm.quantity_used),
      unit_of_measure: recipeForm.unit_of_measure,
      notes: recipeForm.notes || null,
      produced_at: recipeForm.produced_at ? new Date(recipeForm.produced_at).toISOString() : new Date().toISOString(),
    });
    toast({ title: 'Receita cadastrada!' });
    setShowRecipeForm(false);
    setRecipeForm({ menu_item_id: '', product_id: '', quantity_used: '', unit_of_measure: 'un', notes: '', produced_at: new Date().toISOString().slice(0, 16) });
    fetchData();
  };

  const deleteRecipe = async (id: string) => {
    await supabase.from('production_recipes').delete().eq('id', id);
    toast({ title: 'Receita removida' });
    fetchData();
  };

  // --- Suppliers ---
  const resetSupplierForm = () => {
    setSupplierForm({ name: '', contact_name: '', phone: '', email: '', address: '', city: '', state: '', cnpj: '', notes: '' });
    setEditingSupplier(null);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name, contact_name: s.contact_name || '', phone: s.phone || '',
      email: s.email || '', address: s.address || '', city: s.city || '',
      state: s.state || '', cnpj: s.cnpj || '', notes: s.notes || ''
    });
    setShowSupplierForm(true);
  };

  const saveSupplier = async () => {
    if (!supplierForm.name.trim()) { toast({ title: 'Informe o nome do fornecedor', variant: 'destructive' }); return; }
    const payload = {
      name: supplierForm.name.trim(),
      contact_name: supplierForm.contact_name || null,
      phone: supplierForm.phone || null,
      email: supplierForm.email || null,
      address: supplierForm.address || null,
      city: supplierForm.city || null,
      state: supplierForm.state || null,
      cnpj: supplierForm.cnpj || null,
      notes: supplierForm.notes || null,
    };
    if (editingSupplier) {
      await supabase.from('suppliers').update(payload).eq('id', editingSupplier.id);
      toast({ title: 'Fornecedor atualizado!' });
    } else {
      await supabase.from('suppliers').insert(payload);
      toast({ title: 'Fornecedor cadastrado!' });
    }
    setShowSupplierForm(false);
    resetSupplierForm();
    fetchData();
  };

  const deleteSupplier = async (id: string) => {
    await supabase.from('suppliers').delete().eq('id', id);
    toast({ title: 'Fornecedor removido' });
    fetchData();
  };

  // --- Purchase entries ---
  const savePurchase = async () => {
    if (!purchaseForm.product_id || !purchaseForm.quantity) {
      toast({ title: 'Preencha produto e quantidade', variant: 'destructive' }); return;
    }
    const qty = parseFloat(purchaseForm.quantity);
    const costTotal = parseFloat(purchaseForm.cost_total) || 0;

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('purchase_entries').insert({
      product_id: purchaseForm.product_id,
      supplier_id: purchaseForm.supplier_id || null,
      quantity: qty,
      unit_of_measure: purchaseForm.unit_of_measure,
      cost_total: costTotal,
      lot_number: purchaseForm.lot_number || null,
      invoice_number: purchaseForm.invoice_number || null,
      purchase_date: purchaseForm.purchase_date ? new Date(purchaseForm.purchase_date).toISOString() : new Date().toISOString(),
      notes: purchaseForm.notes || null,
      performed_by: user?.id || null,
    });

    // Also update product stock (entry movement)
    const product = products.find(p => p.id === purchaseForm.product_id);
    if (product) {
      const prev = product.current_stock;
      const newStock = prev + qty;
      await supabase.from('products').update({ current_stock: newStock }).eq('id', product.id);
      await supabase.from('product_movements').insert({
        product_id: product.id,
        movement_type: 'in',
        quantity: qty,
        previous_stock: prev,
        new_stock: newStock,
        reason: `Compra registrada${purchaseForm.lot_number ? ` - Lote: ${purchaseForm.lot_number}` : ''}${purchaseForm.invoice_number ? ` - NF: ${purchaseForm.invoice_number}` : ''}`,
        lot_number: purchaseForm.lot_number || null,
        performed_by: user?.id || null,
      });
    }

    toast({ title: 'Entrada de compra registrada!' });
    setShowPurchaseForm(false);
    setPurchaseForm({ product_id: '', supplier_id: '', quantity: '', unit_of_measure: 'un', cost_total: '', lot_number: '', invoice_number: '', purchase_date: new Date().toISOString().slice(0, 16), notes: '' });
    fetchData();
  };

  // Reports
  const getReportData = () => {
    const now = new Date();
    let since: Date;
    if (reportPeriod === 'today') since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (reportPeriod === '7d') since = new Date(now.getTime() - 7 * 86400000);
    else since = new Date(now.getTime() - 30 * 86400000);

    const filtered = movements.filter(m => new Date(m.created_at) >= since);
    const outMovs = filtered.filter(m => m.movement_type === 'out');
    const inMovs = filtered.filter(m => m.movement_type === 'in');

    const consumption: Record<string, number> = {};
    outMovs.forEach(m => {
      const name = products.find(p => p.id === m.product_id)?.name || '?';
      consumption[name] = (consumption[name] || 0) + Math.abs(m.quantity);
    });
    const topConsumed = Object.entries(consumption).sort(([, a], [, b]) => b - a).slice(0, 8)
      .map(([name, qty]) => ({ name: name.length > 14 ? name.slice(0, 14) + '…' : name, quantidade: qty }));

    const typeData = [
      { name: 'Entradas', value: inMovs.length, fill: 'hsl(142, 70%, 45%)' },
      { name: 'Saídas', value: outMovs.length, fill: 'hsl(0, 84%, 60%)' },
      { name: 'Ajustes', value: filtered.filter(m => m.movement_type === 'adjustment').length, fill: 'hsl(217, 91%, 60%)' },
    ];

    const dayMap: Record<string, { entradas: number; saidas: number }> = {};
    filtered.forEach(m => {
      const day = new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dayMap[day]) dayMap[day] = { entradas: 0, saidas: 0 };
      if (m.movement_type === 'in') dayMap[day].entradas += Math.abs(m.quantity);
      else if (m.movement_type === 'out') dayMap[day].saidas += Math.abs(m.quantity);
    });
    const dailyTrend = Object.entries(dayMap).slice(-14).map(([dia, v]) => ({ dia, ...v }));

    return {
      topConsumed, typeData, dailyTrend,
      totalOut: outMovs.reduce((s, m) => s + Math.abs(m.quantity), 0),
      totalIn: inMovs.reduce((s, m) => s + Math.abs(m.quantity), 0),
      totalMovements: filtered.length
    };
  };

  const formatDateTime = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const costPerUnit = (lot: string, size: string) => {
    const l = parseFloat(lot) || 0;
    const s = parseInt(size) || 1;
    return s > 0 ? (l / s).toFixed(2) : '0.00';
  };

  // Filtered purchases
  const filteredPurchases = purchases.filter(p => {
    if (!purchaseSearch) return true;
    const product = products.find(pr => pr.id === p.product_id);
    const supplier = suppliers.find(s => s.id === p.supplier_id);
    const q = purchaseSearch.toLowerCase();
    return (product?.name.toLowerCase().includes(q) || supplier?.name.toLowerCase().includes(q) || p.lot_number?.toLowerCase().includes(q) || p.invoice_number?.toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#141414] px-4 py-3 flex items-center gap-3">
        <ManagerSidebarTrigger />
        <Package className="w-5 h-5 text-[#FF8A00]" />
        <h1 className="font-display font-bold text-lg flex-1">Gestão de Estoque</h1>
        <Button variant="ghost" size="icon" onClick={fetchData} className="text-white/40 hover:text-white"><RefreshCw className="w-4 h-4" /></Button>
      </header>

      <main className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-[#1A1A1A] border-white/5">
            <CardContent className="p-4 text-center">
              <Boxes className="w-5 h-5 mx-auto text-[#FF8A00] mb-1" />
              <p className="text-2xl font-black text-white">{totalProducts}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Produtos</p>
            </CardContent>
          </Card>
          <Card className={`bg-[#1A1A1A] border-white/5 ${lowStock > 0 ? 'border-yellow-500/30' : ''}`}>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
              <p className="text-2xl font-black text-yellow-400">{lowStock}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Estoque Baixo</p>
            </CardContent>
          </Card>
          <Card className={`bg-[#1A1A1A] border-white/5 ${outOfStock > 0 ? 'border-red-500/30' : ''}`}>
            <CardContent className="p-4 text-center">
              <XCircle className="w-5 h-5 mx-auto text-red-400 mb-1" />
              <p className="text-2xl font-black text-red-400">{outOfStock}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Esgotados</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1A1A1A] border-white/5">
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
              <p className="text-2xl font-black text-emerald-400">R$ {totalValue.toFixed(0)}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Valor em Estoque</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {([
            { key: 'products' as MainTab, label: 'Produtos', icon: Package },
            { key: 'purchases' as MainTab, label: 'Entradas', icon: TrendingUp },
            { key: 'suppliers' as MainTab, label: 'Fornecedores', icon: Truck },
            { key: 'production' as MainTab, label: 'Produção', icon: Factory },
            { key: 'legacy' as MainTab, label: 'Cardápio', icon: ClipboardCheck },
            { key: 'reports' as MainTab, label: 'Relatórios', icon: BarChart3 },
          ]).map(t => (
            <button key={t.key} onClick={() => setMainTab(t.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${mainTab === t.key ? 'bg-[#FF8A00] text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* ===== PRODUCTS TAB ===== */}
        {mainTab === 'products' && (
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input placeholder="Buscar produto ou marca..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-white/5 border-white/10 rounded-xl h-9" />
              </div>
              <div className="flex gap-1">
                {(['all', 'low', 'out'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase ${filter === f ? 'bg-[#FF8A00]/20 text-[#FF8A00]' : 'text-white/30'}`}>
                    {f === 'all' ? 'Todos' : f === 'low' ? 'Baixo' : 'Zerado'}
                  </button>
                ))}
              </div>
              <Button onClick={() => { resetProductForm(); setShowProductForm(true); }} size="sm" className="bg-[#FF8A00] text-black font-bold rounded-xl h-9 gap-1.5">
                <Plus className="w-4 h-4" /> Novo
              </Button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Nenhum produto cadastrado</p>
                <Button onClick={() => { resetProductForm(); setShowProductForm(true); }} className="mt-4 bg-[#FF8A00] text-black rounded-xl font-bold gap-2">
                  <Plus className="w-4 h-4" /> Cadastrar Produto
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map(product => {
                  const isLow = product.current_stock > 0 && product.current_stock <= product.min_stock;
                  const isOut = product.current_stock === 0;
                  const sup = suppliers.find(s => s.id === product.supplier_id);
                  return (
                    <div key={product.id} className={`bg-[#1A1A1A] rounded-2xl p-4 border transition-all ${isOut ? 'border-red-500/20' : isLow ? 'border-yellow-500/20' : 'border-white/5'}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-white text-sm truncate">{product.name}</p>
                            {product.brand && <Badge variant="outline" className="text-[9px] text-white/40 border-white/10 py-0">{product.brand}</Badge>}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/40">
                            {sup && <span>🏭 {sup.name}</span>}
                            {!sup && product.supplier && <span>📦 {product.supplier}</span>}
                            <span>📐 {product.unit_of_measure}</span>
                            {product.category && <span>🏷️ {product.category}</span>}
                            <span>💰 R$ {(product.cost_per_unit || 0).toFixed(2)}/un</span>
                            {product.lot_size > 1 && <span>📦 Lote: {product.lot_size} × R$ {(product.cost_per_lot || 0).toFixed(2)}</span>}
                            {product.sku && <span>SKU: {product.sku}</span>}
                          </div>
                          {product.description && <p className="text-[10px] text-white/25 mt-1 truncate">{product.description}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            {isOut ? (
                              <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-[10px]">Esgotado</Badge>
                            ) : isLow ? (
                              <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/20 text-[10px]">{product.current_stock} {product.unit_of_measure}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-400 border-green-500/20 text-[10px]">{product.current_stock} {product.unit_of_measure}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" className="h-7 rounded-lg text-[9px] gap-0.5 px-2 border-green-500/20 text-green-400 hover:bg-green-500/10" onClick={() => openMovement(product, 'in')}>
                              <TrendingUp className="w-3 h-3" />Ent.
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 rounded-lg text-[9px] gap-0.5 px-2 border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={() => openMovement(product, 'out')}>
                              <TrendingDown className="w-3 h-3" />Saí.
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 px-0 text-white/20" onClick={() => openEditProduct(product)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 px-0 text-white/20 hover:text-red-400" onClick={() => deleteProduct(product.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== PURCHASES TAB ===== */}
        {mainTab === 'purchases' && (
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input placeholder="Buscar por produto, fornecedor, lote ou NF..." value={purchaseSearch} onChange={e => setPurchaseSearch(e.target.value)} className="pl-10 bg-white/5 border-white/10 rounded-xl h-9" />
              </div>
              <Button onClick={() => { setPurchaseForm({ product_id: '', supplier_id: '', quantity: '', unit_of_measure: 'un', cost_total: '', lot_number: '', invoice_number: '', purchase_date: new Date().toISOString().slice(0, 16), notes: '' }); setShowPurchaseForm(true); }} size="sm" className="bg-[#FF8A00] text-black font-bold rounded-xl h-9 gap-1.5">
                <Plus className="w-4 h-4" /> Nova Entrada
              </Button>
            </div>

            {filteredPurchases.length === 0 ? (
              <div className="text-center py-16">
                <TrendingUp className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Nenhuma entrada de compra registrada</p>
                <p className="text-white/20 text-xs mt-1">Registre compras de lotes e unidades com data, fornecedor e NF</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPurchases.map(entry => {
                  const product = products.find(p => p.id === entry.product_id);
                  const supplier = suppliers.find(s => s.id === entry.supplier_id);
                  return (
                    <div key={entry.id} className="bg-[#1A1A1A] rounded-2xl p-4 border border-white/5">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-white text-sm">{product?.name || 'Produto removido'}</p>
                            <Badge variant="outline" className="text-[9px] text-green-400 border-green-500/20 py-0">+{entry.quantity} {entry.unit_of_measure}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/40">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateTime(entry.purchase_date)}</span>
                            {supplier && <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{supplier.name}</span>}
                            {entry.lot_number && <span>📦 Lote: {entry.lot_number}</span>}
                            {entry.invoice_number && <span className="flex items-center gap-1"><FileText className="w-3 h-3" />NF: {entry.invoice_number}</span>}
                          </div>
                          {entry.notes && <p className="text-[10px] text-white/25 mt-1">{entry.notes}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#FF8A00]">R$ {(entry.cost_total || 0).toFixed(2)}</p>
                          <p className="text-[9px] text-white/30">R$ {(entry.cost_per_unit || 0).toFixed(2)}/un</p>
                          <p className="text-[9px] text-white/20 mt-1">{formatDateTime(entry.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== SUPPLIERS TAB ===== */}
        {mainTab === 'suppliers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Fornecedores</h2>
                <p className="text-white/30 text-xs">Cadastro de fornecedores e informações de contato</p>
              </div>
              <Button onClick={() => { resetSupplierForm(); setShowSupplierForm(true); }} size="sm" className="bg-[#FF8A00] text-black font-bold rounded-xl gap-1.5">
                <Plus className="w-4 h-4" /> Novo Fornecedor
              </Button>
            </div>

            {suppliers.length === 0 ? (
              <div className="text-center py-16">
                <Truck className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Nenhum fornecedor cadastrado</p>
                <Button onClick={() => { resetSupplierForm(); setShowSupplierForm(true); }} className="mt-4 bg-[#FF8A00] text-black rounded-xl font-bold gap-2">
                  <Plus className="w-4 h-4" /> Cadastrar Fornecedor
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {suppliers.map(s => {
                  const productCount = products.filter(p => p.supplier_id === s.id).length;
                  const purchaseCount = purchases.filter(p => p.supplier_id === s.id).length;
                  return (
                    <div key={s.id} className="bg-[#1A1A1A] rounded-2xl p-4 border border-white/5">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#FF8A00]/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-[#FF8A00]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm">{s.name}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/40 mt-1">
                            {s.contact_name && <span>👤 {s.contact_name}</span>}
                            {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                            {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                            {s.cnpj && <span>📋 {s.cnpj}</span>}
                            {(s.city || s.state) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[s.city, s.state].filter(Boolean).join(' - ')}</span>}
                          </div>
                          {s.address && <p className="text-[10px] text-white/20 mt-1">{s.address}</p>}
                          {s.notes && <p className="text-[10px] text-white/15 mt-1 italic">{s.notes}</p>}
                          <div className="flex gap-3 mt-2">
                            <Badge variant="outline" className="text-[9px] border-white/10 text-white/30">{productCount} produtos</Badge>
                            <Badge variant="outline" className="text-[9px] border-white/10 text-white/30">{purchaseCount} compras</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 px-0 text-white/20" onClick={() => openEditSupplier(s)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 px-0 text-white/20 hover:text-red-400" onClick={() => deleteSupplier(s.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== PRODUCTION & PORTIONING TAB ===== */}
        {mainTab === 'production' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Receitas de Produção</h2>
                <p className="text-white/30 text-xs">Vincule produtos do estoque aos itens do cardápio</p>
              </div>
              <Button onClick={() => { setRecipeForm({ menu_item_id: '', product_id: '', quantity_used: '', unit_of_measure: 'un', notes: '', produced_at: new Date().toISOString().slice(0, 16) }); setShowRecipeForm(true); }} size="sm" className="bg-[#FF8A00] text-black font-bold rounded-xl gap-1.5">
                <Plus className="w-4 h-4" /> Nova Receita
              </Button>
            </div>

            {recipes.length === 0 ? (
              <div className="text-center py-16">
                <Factory className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Nenhuma receita cadastrada</p>
                <p className="text-white/20 text-xs mt-1">Vincule insumos aos itens do cardápio para rastrear consumo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const grouped: Record<string, ProductionRecipe[]> = {};
                  recipes.forEach(r => {
                    if (!grouped[r.menu_item_id]) grouped[r.menu_item_id] = [];
                    grouped[r.menu_item_id].push(r);
                  });
                  return Object.entries(grouped).map(([menuItemId, recs]) => {
                    const menuItem = menuItems.find(m => m.id === menuItemId);
                    return (
                      <Card key={menuItemId} className="bg-[#1A1A1A] border-white/5">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-sm font-bold text-[#FF8A00]">{menuItem?.name || 'Item removido'}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2">
                          {recs.map(r => {
                            const product = products.find(p => p.id === r.product_id);
                            return (
                              <div key={r.id} className="flex items-center justify-between text-xs bg-white/5 rounded-xl px-3 py-2">
                                <div className="flex-1">
                                  <span className="font-medium text-white">{product?.name || '?'}</span>
                                  <span className="text-white/30 ml-2">{r.quantity_used} {r.unit_of_measure}</span>
                                  {r.notes && <span className="text-white/20 ml-2">({r.notes})</span>}
                                  {r.produced_at && (
                                    <span className="text-white/20 ml-2 flex items-center gap-1 inline-flex">
                                      <Calendar className="w-3 h-3" />{formatDateTime(r.produced_at)}
                                    </span>
                                  )}
                                </div>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white/20 hover:text-red-400" onClick={() => deleteRecipe(r.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* ===== LEGACY (CARDÁPIO STOCK) TAB ===== */}
        {mainTab === 'legacy' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-white/30 text-xs">Estoque direto dos itens do cardápio (sistema anterior)</p>
              <Button onClick={() => { setMainTab('products'); resetProductForm(); setShowProductForm(true); }} size="sm" className="bg-[#FF8A00] text-black font-bold rounded-xl h-8 gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Novo Produto
              </Button>
            </div>
            {menuItems.map(item => {
              const stock = item.stock_quantity ?? -1;
              const isLow = stock !== -1 && stock <= item.stock_alert_threshold && stock > 0;
              const isOut = stock === 0;
              return (
                <div key={item.id} className={`bg-[#1A1A1A] rounded-xl p-3 border ${isOut ? 'border-red-500/20' : isLow ? 'border-yellow-500/20' : 'border-white/5'}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{item.name}</p>
                      <p className="text-[10px] text-white/30">R$ {Number(item.price).toFixed(2)}</p>
                    </div>
                    {stock === -1 ? (
                      <Badge variant="outline" className="text-[9px] text-white/30 border-white/10">Ilimitado</Badge>
                    ) : isOut ? (
                      <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-[9px]">Esgotado</Badge>
                    ) : isLow ? (
                      <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/20 text-[9px]">{stock} un</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-400 border-green-500/20 text-[9px]">{stock} un</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== REPORTS TAB ===== */}
        {mainTab === 'reports' && (() => {
          const { topConsumed, typeData, dailyTrend, totalOut, totalIn, totalMovements } = getReportData();
          return (
            <div className="space-y-4">
              <div className="flex gap-1.5">
                {(['today', '7d', '30d'] as const).map(p => (
                  <button key={p} onClick={() => setReportPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${reportPeriod === p ? 'bg-[#FF8A00]/20 text-[#FF8A00]' : 'text-white/30 bg-white/5'}`}>
                    {p === 'today' ? 'Hoje' : p === '7d' ? '7 dias' : '30 dias'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Card className="bg-[#1A1A1A] border-white/5"><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{totalMovements}</p><p className="text-[9px] text-white/30 uppercase">Movimentações</p>
                </CardContent></Card>
                <Card className="bg-[#1A1A1A] border-green-500/20"><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-green-400">+{totalIn}</p><p className="text-[9px] text-white/30 uppercase">Entradas</p>
                </CardContent></Card>
                <Card className="bg-[#1A1A1A] border-red-500/20"><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-red-400">-{totalOut}</p><p className="text-[9px] text-white/30 uppercase">Saídas</p>
                </CardContent></Card>
              </div>
              {topConsumed.length > 0 && (
                <Card className="bg-[#1A1A1A] border-white/5"><CardContent className="p-4">
                  <h3 className="text-sm font-bold mb-3">🔥 Mais consumidos</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topConsumed} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: 'hsl(40,10%,60%)' }} /><Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} /><Bar dataKey="quantidade" radius={[0, 6, 6, 0]} fill="hsl(38,92%,50%)" /></BarChart>
                  </ResponsiveContainer>
                </CardContent></Card>
              )}
              {typeData.some(d => d.value > 0) && (
                <Card className="bg-[#1A1A1A] border-white/5"><CardContent className="p-4">
                  <h3 className="text-sm font-bold mb-3">📊 Tipo de movimentação</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart><Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} strokeWidth={0} label={({ name, value }) => `${name}: ${value}`}>{typeData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} /></PieChart>
                  </ResponsiveContainer>
                </CardContent></Card>
              )}
              {dailyTrend.length > 0 && (
                <Card className="bg-[#1A1A1A] border-white/5"><CardContent className="p-4">
                  <h3 className="text-sm font-bold mb-3">📈 Tendência diária</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dailyTrend}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="dia" tick={{ fontSize: 9, fill: 'hsl(40,10%,60%)' }} /><YAxis tick={{ fontSize: 10, fill: 'hsl(40,10%,60%)' }} /><Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} /><Line type="monotone" dataKey="entradas" stroke="hsl(142,70%,45%)" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="saidas" stroke="hsl(0,84%,60%)" strokeWidth={2} dot={false} /></LineChart>
                  </ResponsiveContainer>
                </CardContent></Card>
              )}
              {totalMovements === 0 && (
                <div className="text-center py-12"><BarChart3 className="w-10 h-10 text-white/10 mx-auto mb-3" /><p className="text-white/30 text-sm">Sem dados para este período</p></div>
              )}
            </div>
          );
        })()}
      </main>

      {/* ===== PRODUCT FORM MODAL ===== */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowProductForm(false)}>
          <div className="w-full max-w-lg bg-[#1A1A1A] rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowProductForm(false)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Nome *</Label>
                  <Input value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Marca</Label>
                  <Input value={productForm.brand} onChange={e => setProductForm(p => ({ ...p, brand: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Categoria</Label>
                  <Input value={productForm.category} onChange={e => setProductForm(p => ({ ...p, category: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Descrição</Label>
                  <Input value={productForm.description} onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Fornecedor</Label>
                  <select value={productForm.supplier_id} onChange={e => { const s = suppliers.find(sup => sup.id === e.target.value); setProductForm(p => ({ ...p, supplier_id: e.target.value, supplier: s?.name || p.supplier })); }} className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white">
                    <option value="" className="bg-[#1A1A1A]">Selecione...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id} className="bg-[#1A1A1A]">{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Unidade de Medida</Label>
                  <select value={productForm.unit_of_measure} onChange={e => setProductForm(p => ({ ...p, unit_of_measure: e.target.value }))} className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white">
                    {UNITS.map(u => <option key={u} value={u} className="bg-[#1A1A1A]">{u}</option>)}
                  </select>
                </div>

                <div className="col-span-2 bg-white/5 rounded-xl p-3 space-y-3 border border-white/10">
                  <p className="text-[10px] font-bold text-[#FF8A00] uppercase tracking-widest">💰 Precificação por Lote</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[9px] text-white/30">Preço do Lote (R$)</Label>
                      <Input type="number" value={productForm.cost_per_lot} onChange={e => setProductForm(p => ({ ...p, cost_per_lot: e.target.value }))} className="bg-white/5 border-white/10 rounded-lg h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] text-white/30">Tamanho do Lote</Label>
                      <Input type="number" value={productForm.lot_size} onChange={e => setProductForm(p => ({ ...p, lot_size: e.target.value }))} className="bg-white/5 border-white/10 rounded-lg h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] text-white/30">Custo Unitário</Label>
                      <div className="h-9 flex items-center px-3 bg-[#FF8A00]/10 border border-[#FF8A00]/20 rounded-lg text-sm font-bold text-[#FF8A00]">
                        R$ {costPerUnit(productForm.cost_per_lot, productForm.lot_size)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Estoque Atual</Label>
                  <Input type="number" value={productForm.current_stock} onChange={e => setProductForm(p => ({ ...p, current_stock: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Estoque Mínimo</Label>
                  <Input type="number" value={productForm.min_stock} onChange={e => setProductForm(p => ({ ...p, min_stock: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">SKU</Label>
                  <Input value={productForm.sku} onChange={e => setProductForm(p => ({ ...p, sku: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Código de Barras</Label>
                  <Input value={productForm.barcode} onChange={e => setProductForm(p => ({ ...p, barcode: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <Button variant="ghost" onClick={() => setShowProductForm(false)} className="flex-1 rounded-xl h-11">Cancelar</Button>
              <Button onClick={saveProduct} className="flex-1 bg-[#FF8A00] text-black font-bold rounded-xl h-11 gap-2">
                <CheckCircle2 className="w-4 h-4" /> {editingProduct ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MOVEMENT MODAL ===== */}
      {showMovementModal && movementProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowMovementModal(false)}>
          <div className="w-full max-w-md bg-[#1A1A1A] rounded-t-3xl sm:rounded-3xl p-6 space-y-4 border border-white/10 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{movementType === 'in' ? '📦 Entrada' : movementType === 'out' ? '📤 Saída' : '🔄 Ajuste'}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowMovementModal(false)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <p className="font-medium">{movementProduct.name}</p>
              <p className="text-xs text-white/40">Estoque atual: {movementProduct.current_stock} {movementProduct.unit_of_measure}</p>
            </div>
            <div className="flex gap-1.5">
              {([
                { key: 'in' as const, label: 'Entrada', icon: TrendingUp, cls: 'text-green-400 border-green-500/30' },
                { key: 'out' as const, label: 'Saída', icon: TrendingDown, cls: 'text-red-400 border-red-500/30' },
                { key: 'adjustment' as const, label: 'Ajuste', icon: ArrowUpDown, cls: 'text-blue-400 border-blue-500/30' },
              ]).map(t => (
                <button key={t.key} onClick={() => setMovementType(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border ${movementType === t.key ? `${t.cls} bg-white/5` : 'text-white/30 border-white/10'}`}>
                  <t.icon className="w-3.5 h-3.5" />{t.label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-white/30">{movementType === 'adjustment' ? 'Novo estoque absoluto' : 'Quantidade'}</Label>
              <Input type="number" min="0" value={movementQty} onChange={e => setMovementQty(e.target.value)} placeholder="0" className="bg-white/5 border-white/10 rounded-xl text-lg text-center h-12" autoFocus />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-white/30">Nº do Lote (opcional)</Label>
              <Input value={movementLot} onChange={e => setMovementLot(e.target.value)} placeholder="Ex: LOTE-2026-04" className="bg-white/5 border-white/10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-white/30">Motivo (opcional)</Label>
              <Input value={movementReason} onChange={e => setMovementReason(e.target.value)} placeholder="Ex: Reposição fornecedor" className="bg-white/5 border-white/10 rounded-xl" />
            </div>
            <Button onClick={executeMovement} className="w-full bg-[#FF8A00] text-black font-bold rounded-xl h-11 gap-2">
              <CheckCircle2 className="w-4 h-4" /> Confirmar
            </Button>
          </div>
        </div>
      )}

      {/* ===== RECIPE FORM MODAL ===== */}
      {showRecipeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowRecipeForm(false)}>
          <div className="w-full max-w-md bg-[#1A1A1A] rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-lg">Nova Receita</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowRecipeForm(false)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] text-white/30 uppercase tracking-widest">Item do Cardápio *</Label>
                <select value={recipeForm.menu_item_id} onChange={e => setRecipeForm(p => ({ ...p, menu_item_id: e.target.value }))} className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white">
                  <option value="" className="bg-[#1A1A1A]">Selecione...</option>
                  {menuItems.map(m => <option key={m.id} value={m.id} className="bg-[#1A1A1A]">{m.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-white/30 uppercase tracking-widest">Produto (Insumo) *</Label>
                <select value={recipeForm.product_id} onChange={e => setRecipeForm(p => ({ ...p, product_id: e.target.value }))} className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white">
                  <option value="" className="bg-[#1A1A1A]">Selecione...</option>
                  {products.map(p => <option key={p.id} value={p.id} className="bg-[#1A1A1A]">{p.name} {p.brand ? `(${p.brand})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Quantidade Usada *</Label>
                  <Input type="number" value={recipeForm.quantity_used} onChange={e => setRecipeForm(p => ({ ...p, quantity_used: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Unidade</Label>
                  <select value={recipeForm.unit_of_measure} onChange={e => setRecipeForm(p => ({ ...p, unit_of_measure: e.target.value }))} className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white">
                    {UNITS.map(u => <option key={u} value={u} className="bg-[#1A1A1A]">{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-white/30 uppercase tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3" /> Data/Hora da Produção</Label>
                <Input type="datetime-local" value={recipeForm.produced_at} onChange={e => setRecipeForm(p => ({ ...p, produced_at: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-white/30 uppercase tracking-widest">Observações</Label>
                <Input value={recipeForm.notes} onChange={e => setRecipeForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ex: Base para 1 porção" className="bg-white/5 border-white/10 rounded-xl" />
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <Button variant="ghost" onClick={() => setShowRecipeForm(false)} className="flex-1 rounded-xl h-11">Cancelar</Button>
              <Button onClick={saveRecipe} className="flex-1 bg-[#FF8A00] text-black font-bold rounded-xl h-11 gap-2">
                <CheckCircle2 className="w-4 h-4" /> Cadastrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== SUPPLIER FORM MODAL ===== */}
      {showSupplierForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowSupplierForm(false)}>
          <div className="w-full max-w-lg bg-[#1A1A1A] rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-lg">{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowSupplierForm(false)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Nome da Empresa *</Label>
                  <Input value={supplierForm.name} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Contato</Label>
                  <Input value={supplierForm.contact_name} onChange={e => setSupplierForm(p => ({ ...p, contact_name: e.target.value }))} placeholder="Nome do contato" className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">CNPJ</Label>
                  <Input value={supplierForm.cnpj} onChange={e => setSupplierForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Telefone</Label>
                  <Input value={supplierForm.phone} onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">E-mail</Label>
                  <Input value={supplierForm.email} onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Endereço</Label>
                  <Input value={supplierForm.address} onChange={e => setSupplierForm(p => ({ ...p, address: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Cidade</Label>
                  <Input value={supplierForm.city} onChange={e => setSupplierForm(p => ({ ...p, city: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Estado</Label>
                  <Input value={supplierForm.state} onChange={e => setSupplierForm(p => ({ ...p, state: e.target.value }))} placeholder="UF" className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Observações</Label>
                  <Input value={supplierForm.notes} onChange={e => setSupplierForm(p => ({ ...p, notes: e.target.value }))} placeholder="Informações adicionais..." className="bg-white/5 border-white/10 rounded-xl" />
                </div>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <Button variant="ghost" onClick={() => setShowSupplierForm(false)} className="flex-1 rounded-xl h-11">Cancelar</Button>
              <Button onClick={saveSupplier} className="flex-1 bg-[#FF8A00] text-black font-bold rounded-xl h-11 gap-2">
                <CheckCircle2 className="w-4 h-4" /> {editingSupplier ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PURCHASE ENTRY FORM MODAL ===== */}
      {showPurchaseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowPurchaseForm(false)}>
          <div className="w-full max-w-lg bg-[#1A1A1A] rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-lg">📦 Registrar Entrada de Compra</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowPurchaseForm(false)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Produto *</Label>
                  <select value={purchaseForm.product_id} onChange={e => { const p = products.find(pr => pr.id === e.target.value); setPurchaseForm(f => ({ ...f, product_id: e.target.value, unit_of_measure: p?.unit_of_measure || f.unit_of_measure })); }} className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white">
                    <option value="" className="bg-[#1A1A1A]">Selecione o produto...</option>
                    {products.map(p => <option key={p.id} value={p.id} className="bg-[#1A1A1A]">{p.name} {p.brand ? `(${p.brand})` : ''}</option>)}
                  </select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Fornecedor</Label>
                  <select value={purchaseForm.supplier_id} onChange={e => setPurchaseForm(f => ({ ...f, supplier_id: e.target.value }))} className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white">
                    <option value="" className="bg-[#1A1A1A]">Selecione...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id} className="bg-[#1A1A1A]">{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Quantidade *</Label>
                  <Input type="number" value={purchaseForm.quantity} onChange={e => setPurchaseForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Unidade</Label>
                  <select value={purchaseForm.unit_of_measure} onChange={e => setPurchaseForm(f => ({ ...f, unit_of_measure: e.target.value }))} className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white">
                    {UNITS.map(u => <option key={u} value={u} className="bg-[#1A1A1A]">{u}</option>)}
                  </select>
                </div>

                <div className="col-span-2 bg-white/5 rounded-xl p-3 space-y-3 border border-white/10">
                  <p className="text-[10px] font-bold text-[#FF8A00] uppercase tracking-widest">💰 Custo da Compra</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[9px] text-white/30">Valor Total (R$)</Label>
                      <Input type="number" value={purchaseForm.cost_total} onChange={e => setPurchaseForm(f => ({ ...f, cost_total: e.target.value }))} placeholder="0.00" className="bg-white/5 border-white/10 rounded-lg h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] text-white/30">Custo Unitário</Label>
                      <div className="h-9 flex items-center px-3 bg-[#FF8A00]/10 border border-[#FF8A00]/20 rounded-lg text-sm font-bold text-[#FF8A00]">
                        R$ {purchaseForm.quantity && parseFloat(purchaseForm.quantity) > 0 ? ((parseFloat(purchaseForm.cost_total) || 0) / parseFloat(purchaseForm.quantity)).toFixed(2) : '0.00'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Nº do Lote</Label>
                  <Input value={purchaseForm.lot_number} onChange={e => setPurchaseForm(f => ({ ...f, lot_number: e.target.value }))} placeholder="LOTE-2026-04" className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Nota Fiscal</Label>
                  <Input value={purchaseForm.invoice_number} onChange={e => setPurchaseForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="NF-00000" className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3" /> Data e Hora da Compra *</Label>
                  <Input type="datetime-local" value={purchaseForm.purchase_date} onChange={e => setPurchaseForm(f => ({ ...f, purchase_date: e.target.value }))} className="bg-white/5 border-white/10 rounded-xl" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-[10px] text-white/30 uppercase tracking-widest">Observações</Label>
                  <Input value={purchaseForm.notes} onChange={e => setPurchaseForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informações adicionais da compra..." className="bg-white/5 border-white/10 rounded-xl" />
                </div>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <Button variant="ghost" onClick={() => setShowPurchaseForm(false)} className="flex-1 rounded-xl h-11">Cancelar</Button>
              <Button onClick={savePurchase} className="flex-1 bg-[#FF8A00] text-black font-bold rounded-xl h-11 gap-2">
                <CheckCircle2 className="w-4 h-4" /> Registrar Entrada
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPage;
