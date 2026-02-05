import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChildProvider } from "@/hooks/use-child-context";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Pages
import Dashboard from "@/pages/dashboard";
import Growth from "@/pages/growth";
import Health from "@/pages/health";
import Memories from "@/pages/memories";
import Onboarding from "@/pages/onboarding";
import Settings from "@/pages/settings";
import VaccineCard from "@/pages/vaccine-card";
import DailyPhotos from "@/pages/daily-photos";
import Landing from "@/pages/landing";
import Privacy from "@/pages/privacy";
import DeleteAccount from "@/pages/delete-account";
import NotFound from "@/pages/not-found";

function AuthenticatedRouter() {
  const [location] = useLocation();
  const isAuthPage = location === "/onboarding";

  return (
    <>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/growth" component={Growth} />
        <Route path="/health" component={Health} />
        <Route path="/memories" component={Memories} />
        <Route path="/settings" component={Settings} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/vaccines" component={VaccineCard} />
        <Route path="/daily-photos" component={DailyPhotos} />
        <Route component={NotFound} />
      </Switch>
      {!isAuthPage && <BottomNav />}
    </>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  // Páginas públicas que não precisam de autenticação
  if (location === "/privacy") {
    return <Privacy />;
  }
  if (location === "/delete-account") {
    return <DeleteAccount />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <ChildProvider>
      <AuthenticatedRouter />
    </ChildProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
