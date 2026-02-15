import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuthStore } from "@/stores/authStore";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Overview from "./pages/Overview";
import Generator from "./pages/Generator";
import HistoryPage from "./pages/HistoryPage";
import Analytics from "./pages/Analytics";
import ApiUsage from "./pages/ApiUsage";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Visualize from "./pages/Visualize";
import LiveSessions from "./pages/LiveSessions";
import LiveMode from "./pages/LiveMode";
import ArchitecturePage from "./pages/ArchitecturePage";

const queryClient = new QueryClient();

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      navigate("/login?error=" + error);
      return;
    }

    if (token) {
      handleOAuthCallback(token)
        .then(() => navigate("/dashboard"))
        .catch(() => navigate("/login?error=auth_failed"));
    } else {
      navigate("/login");
    }
  }, [searchParams, navigate, handleOAuthCallback]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
    </div>
  );
};

const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const { initialize } = useAuthStore();
  useEffect(() => {
    initialize();
  }, [initialize]);
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthInitializer>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="generate" element={<Generator />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="api-usage" element={<ApiUsage />} />
              <Route path="settings" element={<Settings />} />
              <Route path="visualize/:id" element={<Visualize />} />
              <Route path="sessions" element={<LiveSessions />} />
              <Route path="live/:generationId" element={<LiveMode />} />
              <Route path="architecture" element={<ArchitecturePage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthInitializer>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
