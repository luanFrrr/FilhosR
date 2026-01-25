import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChildProvider } from "@/hooks/use-child-context";
import { BottomNav } from "@/components/layout/bottom-nav";

// Pages
import Dashboard from "@/pages/dashboard";
import Growth from "@/pages/growth";
import Health from "@/pages/health";
import Memories from "@/pages/memories";
import Onboarding from "@/pages/onboarding";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
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
        <Route component={NotFound} />
      </Switch>
      {!isAuthPage && <BottomNav />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ChildProvider>
          <Router />
          <Toaster />
        </ChildProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
