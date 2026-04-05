import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ManagerSidebarTrigger } from '@/components/ManagerSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  UserPlus, Search, Trash2, Key, Shield, ShieldCheck,
  UtensilsCrossed, ChefHat, Users as UsersIcon, Eye, EyeOff, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { AppRole } from '@/types';

interface StaffUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: AppRole | null;
  created_at: string;
  last_sign_in_at: string | null;
}

const ROLES: { value: AppRole; label: string; icon: any; color: string }[] = [
  { value: 'admin', label: 'Admin', icon: ShieldCheck, color: 'text-red-400 border-red-500/30 bg-red-500/10' },
  { value: 'attendant', label: 'Atendente', icon: Shield, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { value: 'kitchen', label: 'Cozinha', icon: ChefHat, color: 'text-green-400 border-green-500/30 bg-green-500/10' },
  { value: 'bar', label: 'Bar', icon: UtensilsCrossed, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
];

const StaffPage = () => {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('attendant');
  const [showNewPw, setShowNewPw] = useState(false);

  // Reset password modal
  const [resetUser, setResetUser] = useState<StaffUser | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);

  // Delete confirm
  const [deleteUser, setDeleteUser] = useState<StaffUser | null>(null);

  // Change role modal
  const [roleUser, setRoleUser] = useState<StaffUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('attendant');

  useEffect(() => {
    if (role !== 'admin') { navigate('/gestor'); return; }
    fetchUsers();
  }, [role]);

  const callManageUsers = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('manage-users', {
      body,
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.error) throw new Error(res.error.message);
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await callManageUsers({ action: 'list' });
      setUsers(data.users || []);
    } catch (err: any) {
      toast({ title: 'Erro ao carregar usuários', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setActionLoading(true);
    try {
      await callManageUsers({
        action: 'create',
        email: newEmail.trim(),
        password: newPassword,
        full_name: newName.trim(),
        role: newRole,
      });
      toast({ title: 'Funcionário criado com sucesso!' });
      setShowCreate(false);
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('attendant');
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erro ao criar', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser || resetPw.length < 6) {
      toast({ title: 'Senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }
    setActionLoading(true);
    try {
      await callManageUsers({ action: 'reset_password', user_id: resetUser.id, new_password: resetPw });
      toast({ title: 'Senha redefinida com sucesso!' });
      setResetUser(null); setResetPw('');
    } catch (err: any) {
      toast({ title: 'Erro ao redefinir senha', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setActionLoading(true);
    try {
      await callManageUsers({ action: 'delete', user_id: deleteUser.id });
      toast({ title: 'Funcionário removido com sucesso!' });
      setDeleteUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!roleUser) return;
    setActionLoading(true);
    try {
      await callManageUsers({ action: 'update_role', user_id: roleUser.id, role: selectedRole });
      toast({ title: 'Papel atualizado com sucesso!' });
      setRoleUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar papel', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleInfo = (r: AppRole | null) => ROLES.find(x => x.value === r) || { label: 'Sem papel', color: 'text-muted-foreground border-border/30 bg-secondary/20', icon: UsersIcon };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#141414] sticky top-0 z-50 px-6 py-4 flex items-center gap-4">
        <ManagerSidebarTrigger />
        <div className="flex-1">
          <h1 className="text-2xl font-black tracking-tighter">EQUIPE</h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Gestão de Funcionários</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={() => setShowCreate(true)} className="bg-[#FF8A00] text-black font-bold rounded-xl gap-2">
              <UserPlus className="w-4 h-4" /> Novo
            </Button>
          </TooltipTrigger>
          <TooltipContent>Adicionar funcionário</TooltipContent>
        </Tooltip>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 h-12 rounded-xl text-white"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ROLES.map(r => {
            const count = users.filter(u => u.role === r.value).length;
            return (
              <div key={r.value} className={`rounded-xl border p-3 ${r.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <r.icon className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">{r.label}</span>
                </div>
                <span className="text-2xl font-black">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Users list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white/40" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-bold">Nenhum funcionário encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map(u => {
              const roleInfo = getRoleInfo(u.role);
              const isSelf = u.id === user?.id;
              return (
                <Card key={u.id} className="bg-[#1A1A1A] border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${roleInfo.color}`}>
                        {(u.full_name || u.email)?.[0]?.toUpperCase() || '?'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white truncate">{u.full_name || 'Sem nome'}</p>
                          {isSelf && <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">VOCÊ</Badge>}
                        </div>
                        <p className="text-xs text-white/50 truncate">{u.email}</p>
                        {u.last_sign_in_at && (
                          <p className="text-[10px] text-white/30 mt-0.5">
                            Último acesso: {new Date(u.last_sign_in_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>

                      {/* Role badge */}
                      <Badge variant="outline" className={`${roleInfo.color} text-xs font-bold gap-1`}>
                        <roleInfo.icon className="w-3 h-3" />
                        {roleInfo.label}
                      </Badge>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => { setRoleUser(u); setSelectedRole(u.role || 'attendant'); }}
                              className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Alterar papel</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => { setResetUser(u); setResetPw(''); }}
                              className="p-2 text-white/40 hover:text-amber-400 rounded-lg hover:bg-white/5 transition-colors"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Redefinir senha</TooltipContent>
                        </Tooltip>

                        {!isSelf && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setDeleteUser(u)}
                                className="p-2 text-white/40 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir funcionário</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── Create User Modal ─── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Novo Funcionário</DialogTitle>
            <DialogDescription className="text-white/50">Preencha os dados para criar um novo acesso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nome completo" value={newName} onChange={e => setNewName(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl text-white" />
            <Input placeholder="Email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl text-white" />
            <div className="relative">
              <Input
                placeholder="Senha (mín. 6 caracteres)"
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="bg-white/5 border-white/10 h-12 rounded-xl text-white pr-10"
              />
              <button onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-2 block font-bold uppercase tracking-wider">Papel</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setNewRole(r.value)}
                    className={`p-3 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all ${
                      newRole === r.value ? r.color : 'border-white/10 text-white/40'
                    }`}
                  >
                    <r.icon className="w-4 h-4" />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-white/60">Cancelar</Button>
            <Button onClick={handleCreate} disabled={actionLoading} className="bg-[#FF8A00] text-black font-bold rounded-xl gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar Funcionário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Change Role Modal ─── */}
      <Dialog open={!!roleUser} onOpenChange={() => setRoleUser(null)}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Alterar Papel</DialogTitle>
            <DialogDescription className="text-white/50">
              {roleUser?.full_name || roleUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map(r => (
              <button
                key={r.value}
                onClick={() => setSelectedRole(r.value)}
                className={`p-4 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all ${
                  selectedRole === r.value ? r.color : 'border-white/10 text-white/40'
                }`}
              >
                <r.icon className="w-5 h-5" />
                {r.label}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRoleUser(null)} className="text-white/60">Cancelar</Button>
            <Button onClick={handleChangeRole} disabled={actionLoading} className="bg-[#FF8A00] text-black font-bold rounded-xl gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reset Password Modal ─── */}
      <Dialog open={!!resetUser} onOpenChange={() => setResetUser(null)}>
        <DialogContent className="bg-[#1A1A1A] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription className="text-white/50">
              {resetUser?.full_name || resetUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Input
              placeholder="Nova senha (mín. 6 caracteres)"
              type={showResetPw ? 'text' : 'password'}
              value={resetPw}
              onChange={e => setResetPw(e.target.value)}
              className="bg-white/5 border-white/10 h-12 rounded-xl text-white pr-10"
            />
            <button onClick={() => setShowResetPw(!showResetPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
              {showResetPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetUser(null)} className="text-white/60">Cancelar</Button>
            <Button onClick={handleResetPassword} disabled={actionLoading} className="bg-[#FF8A00] text-black font-bold rounded-xl gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Redefinir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent className="bg-[#1A1A1A] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Funcionário</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Tem certeza que deseja excluir <strong className="text-white">{deleteUser?.full_name || deleteUser?.email}</strong>? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={actionLoading} className="bg-red-600 text-white hover:bg-red-700 gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StaffPage;
