import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical, Package, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { MenuCategory, MenuItem } from '@/types';

const AdminMenuPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<'categories' | 'items'>('items');
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  // Category form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  // Item form
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemImage, setItemImage] = useState('');
  const [itemStock, setItemStock] = useState('-1');
  const [itemStockAlert, setItemStockAlert] = useState('5');

  const fetchData = async () => {
    const { data: cats } = await supabase.from('menu_categories').select('*').order('sort_order');
    if (cats) setCategories(cats as MenuCategory[]);
    const { data: itms } = await supabase.from('menu_items').select('*').order('sort_order');
    if (itms) setItems(itms as MenuItem[]);
  };

  useEffect(() => { fetchData(); }, []);

  const saveCategory = async () => {
    if (!catName.trim()) return;
    if (editingCategory) {
      await supabase.from('menu_categories').update({ name: catName, description: catDesc || null }).eq('id', editingCategory.id);
    } else {
      await supabase.from('menu_categories').insert({ name: catName, description: catDesc || null, sort_order: categories.length });
    }
    toast({ title: editingCategory ? 'Categoria atualizada!' : 'Categoria criada!' });
    resetForm();
    fetchData();
  };

  const saveItem = async () => {
    if (!itemName.trim() || !itemPrice || !itemCategoryId) { toast({ title: 'Preencha todos os campos', variant: 'destructive' }); return; }
    const payload = { name: itemName, description: itemDesc || null, price: parseFloat(itemPrice), category_id: itemCategoryId, image_url: itemImage || null, sort_order: items.length, stock_quantity: parseInt(itemStock), stock_alert_threshold: parseInt(itemStockAlert) };
    if (editingItem) {
      await supabase.from('menu_items').update(payload).eq('id', editingItem.id);
    } else {
      await supabase.from('menu_items').insert(payload);
    }
    toast({ title: editingItem ? 'Item atualizado!' : 'Item criado!' });
    resetForm();
    fetchData();
  };

  const toggleActive = async (type: 'category' | 'item', id: string, current: boolean) => {
    if (type === 'category') await supabase.from('menu_categories').update({ is_active: !current }).eq('id', id);
    else await supabase.from('menu_items').update({ is_active: !current }).eq('id', id);
    fetchData();
  };

  const deleteItem = async (type: 'category' | 'item', id: string) => {
    if (!confirm('Tem certeza?')) return;
    if (type === 'category') await supabase.from('menu_categories').delete().eq('id', id);
    else await supabase.from('menu_items').delete().eq('id', id);
    toast({ title: 'Removido!' });
    fetchData();
  };

  const resetForm = () => { setShowForm(false); setEditingCategory(null); setEditingItem(null); setCatName(''); setCatDesc(''); setItemName(''); setItemDesc(''); setItemPrice(''); setItemCategoryId(''); setItemImage(''); setItemStock('-1'); setItemStockAlert('5'); };

  const startEditCategory = (cat: MenuCategory) => { setActiveTab('categories'); setEditingCategory(cat); setCatName(cat.name); setCatDesc(cat.description || ''); setShowForm(true); };
  const startEditItem = (item: MenuItem) => { setActiveTab('items'); setEditingItem(item); setItemName(item.name); setItemDesc(item.description || ''); setItemPrice(item.price.toString()); setItemCategoryId(item.category_id); setItemImage(item.image_url || ''); setItemStock(((item as any).stock_quantity ?? -1).toString()); setItemStockAlert(((item as any).stock_alert_threshold ?? 5).toString()); setShowForm(true); };

  const updateStock = async (itemId: string, newQty: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const prevStock = (item as any).stock_quantity ?? -1;
    await supabase.from('menu_items').update({ stock_quantity: newQty }).eq('id', itemId);
    // Record movement
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('stock_movements' as any).insert({
      menu_item_id: itemId,
      movement_type: 'adjustment',
      quantity: newQty - prevStock,
      previous_stock: prevStock,
      new_stock: newQty,
      reason: 'Ajuste manual',
      performed_by: user?.id || null,
    });
    toast({ title: 'Estoque atualizado!' });
    fetchData();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gestor/admin')}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-display font-bold text-lg text-foreground flex-1">Cardápio</h1>
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl gap-1"><Plus className="w-4 h-4" /> Novo</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('items')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'items' ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}>Itens ({items.length})</button>
          <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'categories' ? 'bg-primary text-primary-foreground' : 'bg-secondary/30 text-muted-foreground'}`}>Categorias ({categories.length})</button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="glass rounded-2xl p-4 space-y-3 animate-slide-up">
            <h3 className="font-semibold text-foreground">{activeTab === 'categories' ? (editingCategory ? 'Editar Categoria' : 'Nova Categoria') : (editingItem ? 'Editar Item' : 'Novo Item')}</h3>
            {activeTab === 'categories' ? (
              <>
                <Input placeholder="Nome da categoria" value={catName} onChange={e => setCatName(e.target.value)} className="rounded-xl bg-secondary/30" />
                <Input placeholder="Descrição (opcional)" value={catDesc} onChange={e => setCatDesc(e.target.value)} className="rounded-xl bg-secondary/30" />
                <div className="flex gap-2">
                  <Button onClick={saveCategory} className="flex-1 rounded-xl">Salvar</Button>
                  <Button variant="ghost" onClick={resetForm} className="rounded-xl">Cancelar</Button>
                </div>
              </>
            ) : (
              <>
                <Input placeholder="Nome do item" value={itemName} onChange={e => setItemName(e.target.value)} className="rounded-xl bg-secondary/30" />
                <Input placeholder="Descrição" value={itemDesc} onChange={e => setItemDesc(e.target.value)} className="rounded-xl bg-secondary/30" />
                <Input placeholder="Preço (ex: 25.00)" type="number" step="0.01" value={itemPrice} onChange={e => setItemPrice(e.target.value)} className="rounded-xl bg-secondary/30" />
                <select value={itemCategoryId} onChange={e => setItemCategoryId(e.target.value)} className="w-full h-10 rounded-xl bg-secondary/30 border border-border/50 px-3 text-foreground text-sm">
                  <option value="">Selecione categoria</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Input placeholder="URL da imagem (opcional)" value={itemImage} onChange={e => setItemImage(e.target.value)} className="rounded-xl bg-secondary/30" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Estoque (-1 = ∞)</Label>
                    <Input type="number" value={itemStock} onChange={e => setItemStock(e.target.value)} className="rounded-xl bg-secondary/30" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Alerta mínimo</Label>
                    <Input type="number" value={itemStockAlert} onChange={e => setItemStockAlert(e.target.value)} className="rounded-xl bg-secondary/30" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveItem} className="flex-1 rounded-xl">Salvar</Button>
                  <Button variant="ghost" onClick={resetForm} className="rounded-xl">Cancelar</Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Category list */}
        {activeTab === 'categories' && categories.map(cat => (
          <div key={cat.id} className="glass rounded-2xl p-4 flex items-center justify-between animate-slide-up">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium text-foreground">{cat.name}</p>
                {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={cat.is_active} onCheckedChange={() => toggleActive('category', cat.id, cat.is_active)} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditCategory(cat)}><Pencil className="w-3 h-3" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem('category', cat.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}

        {/* Item list */}
        {activeTab === 'items' && items.map(item => {
          const stock = (item as any).stock_quantity ?? -1;
          const alertThreshold = (item as any).stock_alert_threshold ?? 5;
          const isLowStock = stock !== -1 && stock <= alertThreshold && stock > 0;
          const isOutOfStock = stock === 0;

          return (
            <div key={item.id} className={`glass rounded-2xl p-4 flex items-center gap-3 animate-slide-up ${isOutOfStock ? 'opacity-60' : ''}`}>
              {item.image_url && <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-xl object-cover" loading="lazy" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{item.name}</p>
                <p className="text-sm text-primary font-semibold">R$ {Number(item.price).toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground">{categories.find(c => c.id === item.category_id)?.name}</p>
                  {stock === -1 ? (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/30 text-muted-foreground">∞</Badge>
                  ) : isOutOfStock ? (
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0 gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />Esgotado</Badge>
                  ) : isLowStock ? (
                    <Badge className="text-[9px] px-1.5 py-0 gap-0.5 bg-yellow-500/15 text-yellow-400 border-yellow-500/20"><AlertTriangle className="w-2.5 h-2.5" />{stock} un</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5 border-green-500/20 text-green-400"><Package className="w-2.5 h-2.5" />{stock} un</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {stock !== -1 && (
                  <div className="flex items-center gap-0.5 mr-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStock(item.id, Math.max(0, stock - 1))}>
                      <span className="text-sm font-bold">−</span>
                    </Button>
                    <span className="text-xs font-mono w-6 text-center text-foreground">{stock}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStock(item.id, stock + 1)}>
                      <span className="text-sm font-bold">+</span>
                    </Button>
                  </div>
                )}
                <Switch checked={item.is_active} onCheckedChange={() => toggleActive('item', item.id, item.is_active)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditItem(item)}><Pencil className="w-3 h-3" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItem('item', item.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default AdminMenuPage;
