import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ManagerSidebar } from '@/components/ManagerSidebar';

const ManagerLayout = () => {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-[#0F0F0F]">
        <ManagerSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ManagerLayout;
