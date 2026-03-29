import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import SplashScreen from "@/components/SplashScreen";
import Auth from "./pages/Auth";
import StaffDashboard from "./pages/staff/StaffDashboard";
import KitchenView from "./pages/staff/KitchenView";
import SessionsPage from "./pages/staff/SessionsPage";
import AdminPage from "./pages/staff/AdminPage";
import AdminMenuPage from "./pages/staff/AdminMenuPage";
import ReportsPage from "./pages/staff/ReportsPage";
import ClientOrder from "./pages/client/ClientOrder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/staff" replace />;
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
          <BrowserRouter>
            <Routes>
              {/* Auth */}
              <Route path="/" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />

              {/* Staff routes */}
              <Route path="/staff" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
              <Route path="/staff/kitchen" element={<ProtectedRoute allowedRoles={['admin', 'kitchen']}><KitchenView /></ProtectedRoute>} />
              <Route path="/staff/sessions" element={<ProtectedRoute allowedRoles={['admin', 'attendant']}><SessionsPage /></ProtectedRoute>} />
              <Route path="/staff/sessions/new" element={<ProtectedRoute allowedRoles={['admin', 'attendant']}><SessionsPage /></ProtectedRoute>} />
              <Route path="/staff/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPage /></ProtectedRoute>} />
              <Route path="/staff/admin/menu" element={<ProtectedRoute allowedRoles={['admin']}><AdminMenuPage /></ProtectedRoute>} />

              {/* Client routes (public, no auth) */}
              <Route path="/order/:sessionId/:clientToken" element={<ClientOrder />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
