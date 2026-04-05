import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Users, Package, Settings,
  Flame, ShoppingBag, LogOut, UserCog
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import pop9Logo from '@/assets/pop9-logo.png';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

const menuItems = [
  { title: 'Comandas', url: '/gestor', icon: LayoutDashboard, exact: true },
  { title: 'Cozinha', url: '/gestor/cozinha', icon: Flame },
  { title: 'Cardápio', url: '/gestor/admin/menu', icon: ShoppingBag },
  { title: 'Estoque', url: '/gestor/estoque', icon: Package },
  { title: 'Relatórios', url: '/gestor/relatorios-avancados', icon: BarChart3 },
  { title: 'CRM', url: '/gestor/crm', icon: Users },
  { title: 'Configurações', url: '/gestor/configuracoes', icon: Settings },
];

export function ManagerSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { state, setOpen, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';

  const isActive = (url: string, exact?: boolean) => {
    if (exact) return location.pathname === url;
    return location.pathname.startsWith(url);
  };

  const handleNavigate = (url: string) => {
    navigate(url);
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-[#0F0F0F]">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-3">
          <img
            src={pop9Logo}
            alt="PØP9 BAR"
            className="w-8 h-8 object-contain shrink-0"
            style={{ mixBlendMode: 'lighten' }}
          />
          {!collapsed && (
            <span className="font-display font-black text-sm text-white tracking-tight">
              PØP9 BAR
            </span>
          )}
        </div>
      </SidebarHeader>

      <Separator className="bg-white/5 mx-2" />

      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive(item.url, item.exact)}
                    onClick={() => handleNavigate(item.url)}
                    tooltip={item.title}
                    className={`rounded-xl transition-all duration-200 ${
                      isActive(item.url, item.exact)
                        ? 'bg-[#FF8A00]/15 text-[#FF8A00] font-bold hover:bg-[#FF8A00]/20 hover:text-[#FF8A00]'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut()}
              tooltip="Sair"
              className="text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function ManagerSidebarTrigger() {
  return (
    <SidebarTrigger className="text-white/40 hover:text-white hover:bg-white/10 rounded-xl h-8 w-8" />
  );
}
