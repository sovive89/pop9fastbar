import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  UtensilsCrossed, LayoutGrid, Users, Key, ArrowLeft,
  Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MenuCategory, MenuItem, AppRole } from '@/types';
import pop9Logo from '@/assets/pop9-logo.png';

type AdminTab = 'menu' | 'categories' | 'users' | 'password';

const AdminPage = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('menu');

  if (role !== 'admin') return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-destructive">Acesso não autorizado</p>
    </div>
  );

  const tabs: { id: AdminTab; icon: any; label: string }[] = [
    { id: 'menu', icon: UtensilsCrossed, label: 'Cardápio' },
    { id: 'categories', icon: LayoutGrid, label: 'Categorias' },
    { id: 'users', icon: Users, label: 'Usuários' },
    { id: 'password', icon: Key, label: 'Senha' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <img src={pop9Logo} alt="POP9" className="w-7 h-7 object-contain" style={{ filter: 'brightness(0) invert(0)' }} />
            </div>
            <div>
              <h1 className="font-display font-bold text-foreground text-sm uppercase tracking-wide">ADMIN</h1>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">PAINEL ADMINISTRATIVO</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/20 gap-1">
              <Settings className="w-3 h-3" /> Admin
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => navigate('/staff')} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Icon tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-2">
          <div className="flex gap-1 bg-secondary/20 rounded-xl p-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center transition-all ${
                  activeTab === t.id
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={t.label}
              >
                <t.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4">
        {activeTab === 'menu' && <MenuTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'password' && <PasswordTab />}
      </main>
    </div>
  );
};

// ─── Menu Tab ───
const MenuTab = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [catId, setCatId] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const fetchData = async () => {
    const [catsRes, itemsRes] = await Promise.all([
      supabase.from('menu_categories').select('*').order('sort_order'),
      supabase.from('menu_items').select('*').order('sort_order'),
    ]);
    if (catsRes.data) setCategories(catsRes.data as MenuCategory[]);
    if (itemsRes.data) setItems(itemsRes.data as MenuItem[]);
  };

  useEffect(() => { fetchData(); }, []);

  const reset = () => { setShowForm(false); setEditing(null); setName(''); setDesc(''); setPrice(''); setCatId(''); setImageUrl(''); };

  const save = async () => {
    if (!name.trim() || !price || !catId) { toast({ title: 'Preencha todos os campos', variant: 'destructive' }); return; }
    const payload = { name, description: desc || null, price: parseFloat(price), category_id: catId, image_url: imageUrl || null, sort_order: items.length };
    if (editing) {
      await supabase.from('menu_items').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('menu_items').insert(payload);
    }
    toast({ title: editing ? 'Item atualizado!' : 'Item criado!' });
    reset();
    fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('menu_items').update({ is_active: !current }).eq('id', id);
    fetchData();
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Remover este item?')) return;
    await supabase.from('menu_items').delete().eq('id', id);
    toast({ title: 'Item removido!' });
    fetchData();
  };

  const startEdit = (item: MenuItem) => {
    setEditing(item); setName(item.name); setDesc(item.description || ''); setPrice(item.price.toString());
    setCatId(item.category_id); setImageUrl(item.image_url || ''); setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={() => { reset(); setShowForm(true); }} className="rounded-xl gap-1.5">
          <Plus className="w-4 h-4" /> Novo Item
        </Button>
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-4 space-y-3 animate-slide-up border border-primary/20">
          <h3 className="font-semibold text-foreground text-sm">{editing ? 'Editar Item' : 'Novo Item'}</h3>
          <Input placeholder="Nome do item" value={name} onChange={e => setName(e.target.value)} className="rounded-xl bg-secondary/30" />
          <Input placeholder="Descrição" value={desc} onChange={e => setDesc(e.target.value)} className="rounded-xl bg-secondary/30" />
          <Input placeholder="Preço (ex: 25.00)" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="rounded-xl bg-secondary/30" />
          <select value={catId} onChange={e => setCatId(e.target.value)} className="w-full h-10 rounded-xl bg-secondary/30 border border-border/50 px-3 text-foreground text-sm">
            <option value="">Selecione categoria</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input placeholder="URL da imagem (opcional)" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="rounded-xl bg-secondary/30" />
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1 rounded-xl">Salvar</Button>
            <Button variant="ghost" onClick={reset} className="rounded-xl">Cancelar</Button>
          </div>
        </div>
      )}

      {/* Items grouped by category */}
      {categories.map(cat => {
        const catItems = items.filter(i => i.category_id === cat.id);
        const isExpanded = expandedCat === cat.id;
        return (
          <div key={cat.id} className="glass rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <span className="font-medium text-foreground">{cat.name} ({catItems.length})</span>
              {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {isExpanded && (
              <div className="border-t border-border/20 divide-y divide-border/10">
                {catItems.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Nenhum item nesta categoria</p>
                ) : catItems.map(item => (
                  <div key={item.id} className="p-3 flex items-center gap-3">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover" loading="lazy" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-primary font-semibold">R$ {Number(item.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={item.is_active} onCheckedChange={() => toggleActive(item.id, item.is_active)} />
                      <button onClick={() => startEdit(item)} className="p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteItem(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Categories Tab ───
const CategoriesTab = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MenuCategory | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const fetchData = async () => {
    const { data } = await supabase.from('menu_categories').select('*').order('sort_order');
    if (data) setCategories(data as MenuCategory[]);
  };

  useEffect(() => { fetchData(); }, []);

  const reset = () => { setShowForm(false); setEditing(null); setName(''); setDesc(''); };

  const save = async () => {
    if (!name.trim()) return;
    if (editing) {
      await supabase.from('menu_categories').update({ name, description: desc || null }).eq('id', editing.id);
    } else {
      await supabase.from('menu_categories').insert({ name, description: desc || null, sort_order: categories.length });
    }
    toast({ title: editing ? 'Categoria atualizada!' : 'Categoria criada!' });
    reset(); fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('menu_categories').update({ is_active: !current }).eq('id', id);
    fetchData();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Remover esta categoria?')) return;
    await supabase.from('menu_categories').delete().eq('id', id);
    toast({ title: 'Categoria removida!' }); fetchData();
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => { reset(); setShowForm(true); }} className="rounded-xl gap-1.5">
        <Plus className="w-4 h-4" /> Nova Categoria
      </Button>

      {showForm && (
        <div className="glass rounded-2xl p-4 space-y-3 animate-slide-up border border-primary/20">
          <h3 className="font-semibold text-foreground text-sm">{editing ? 'Editar Categoria' : 'Nova Categoria'}</h3>
          <Input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} className="rounded-xl bg-secondary/30" />
          <Input placeholder="Descrição (opcional)" value={desc} onChange={e => setDesc(e.target.value)} className="rounded-xl bg-secondary/30" />
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1 rounded-xl">Salvar</Button>
            <Button variant="ghost" onClick={reset} className="rounded-xl">Cancelar</Button>
          </div>
        </div>
      )}

      {categories.map(cat => (
        <div key={cat.id} className="glass rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">{cat.name}</p>
            {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
          </div>
          <div className="flex items-center gap-1.5">
            <Switch checked={cat.is_active} onCheckedChange={() => toggleActive(cat.id, cat.is_active)} />
            <button onClick={() => { setEditing(cat); setName(cat.name); setDesc(cat.description || ''); setShowForm(true); }} className="p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Users Tab ───
const UsersTab = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*, roles:user_roles(role)');
    if (data) setUsers(data);
  };

  useEffect(() => { fetchUsers(); }, []);

  const changeRole = async (userId: string, newRole: AppRole) => {
    // Delete existing then insert new
    await supabase.from('user_roles').delete().eq('user_id', userId);
    await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
    toast({ title: 'Papel atualizado!' });
    fetchUsers();
  };

  const filteredUsers = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const roles: { value: AppRole; label: string }[] = [
    { value: 'admin', label: 'Admin' },
    { value: 'attendant', label: 'Atendente' },
    { value: 'kitchen', label: 'Cozinha' },
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl bg-secondary/30" />
      </div>

      {filteredUsers.map(user => {
        const currentRole = user.roles?.[0]?.role as AppRole | undefined;
        return (
          <div key={user.id} className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{user.full_name || 'Sem nome'}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex gap-1">
                <button className="p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="flex gap-2">
              {roles.map(r => (
                <button
                  key={r.value}
                  onClick={() => changeRole(user.id, r.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all border ${
                    currentRole === r.value
                      ? r.value === 'admin'
                        ? 'border-destructive/50 text-destructive bg-destructive/10'
                        : 'border-primary/50 text-primary bg-primary/10'
                      : 'border-border/30 text-muted-foreground'
                  }`}
                >
                  {currentRole === r.value && '✓ '}{r.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Password Tab ───
const PasswordTab = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email');
      if (data) setUsers(data);
    };
    fetch();
  }, []);

  const resetPassword = async () => {
    if (!selectedUser || newPassword.length < 6) {
      toast({ title: 'Selecione um usuário e informe uma senha de pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }
    toast({ title: 'Reset de senha requer edge function', description: 'Implemente uma edge function com service_role para atualizar senha de outro usuário.' });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Usuário</label>
        <select
          value={selectedUser}
          onChange={e => setSelectedUser(e.target.value)}
          className="w-full h-10 rounded-xl bg-secondary/30 border border-border/50 px-3 text-foreground text-sm"
        >
          <option value="">Selecione um usuário</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Nova Senha</label>
        <Input
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="rounded-xl bg-secondary/30"
        />
      </div>
      <Button onClick={resetPassword} className="rounded-xl gap-1.5">
        <Key className="w-4 h-4" /> Redefinir Senha
      </Button>
    </div>
  );
};

export default AdminPage;
