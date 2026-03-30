import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import SplashScreen from "@/components/SplashScreen";
import Auth from "./pages/Auth";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import KitchenView from "./pages/manager/KitchenView";
import SessionsPage from "./pages/manager/SessionsPage";
import AdminPage from "./pages/manager/AdminPage";
import AdminMenuPage from "./pages/staff/AdminMenuPage";
import ReportsPage from "./pages/manager/ReportsPage";
import SettingsPage from "./pages/manager/SettingsPage";
import AdvancedReportsPage from "./pages/manager/AdvancedReportsPage";
import CRMPage from "./pages/manager/CRMPage";
import ClientHome from "./pages/client/ClientHome";
import ClientOrder from "./pages/client/ClientOrder";
import ClientRegistration from "./pages/client/ClientRegistration";
import ClientLayout from "./layouts/ClientLayout";
import ManagerLayout from "./layouts/ManagerLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/gestor" replace />;
  return <>{children}</>;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenSplash, setHasSeenSplash] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem('splashSeen');
    if (seen) { setShowSplash(false); setHasSeenSplash(true); }
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
    setHasSeenSplash(true);
    sessionStorage.setItem('splashSeen', 'true');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {showSplash && !hasSeenSplash && <SplashScreen onComplete={handleSplashComplete} />}
          <HashRouter>
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />

              <Route path="/cliente" element={<ClientLayout />}>
                <Route index element={<ClientRegistration />} />
                <Route path="abrir" element={<ClientRegistration />} />
                <Route path="pedido/:sessionId" element={<ClientRegistration />} />
                <Route path="pedido/:sessionId/:clientToken" element={<ClientOrder />} />
              </Route>

              <Route path="/gestor" element={<ProtectedRoute><ManagerLayout /></ProtectedRoute>}>
                <Route index element={<ManagerDashboard />} />
                <Route path="cozinha" element={<ProtectedRoute allowedRoles={['admin', 'kitchen']}><KitchenView /></ProtectedRoute>} />
                <Route path="sessoes" element={<ProtectedRoute allowedRoles={['admin', 'attendant']}><SessionsPage /></ProtectedRoute>} />
                <Route path="sessoes/nova" element={<ProtectedRoute allowedRoles={['admin', 'attendant']}><SessionsPage /></ProtectedRoute>} />
                <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>} />
                <Route path="admin/menu" element={<ProtectedRoute allowedRoles={['admin']}><AdminMenuPage /></ProtectedRoute>} />
                <Route path="relatorios" element={<ProtectedRoute allowedRoles={['admin']}><ReportsPage /></ProtectedRoute>} />
                <Route path="configuracoes" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
                <Route path="relatorios-avancados" element={<ProtectedRoute allowedRoles={['admin']}><AdvancedReportsPage /></ProtectedRoute>} />
                <Route path="crm" element={<ProtectedRoute allowedRoles={['admin']}><CRMPage /></ProtectedRoute>} />
              </Route>

              <Route path="/staff/*" element={<Navigate to="/gestor" replace />} />
              <Route path="/abrir" element={<ClientRegistration />} />
              <Route path="/order/:sessionId" element={<ClientRegistration />} />
              <Route path="/order/:sessionId/:clientToken" element={<ClientOrder />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
