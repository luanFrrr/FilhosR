import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChildProvider } from "@/hooks/use-child-context";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useAuth } from "@/hooks/use-auth";
import { useChildContext } from "@/hooks/use-child-context";
import {
  appendNotifyChildId,
  extractNotifyChildFromPath,
  normalizeNotificationTarget,
  resolveNotifyChildId,
} from "@/lib/notification-navigation";
import { Loader2 } from "lucide-react";
import { NotificationPermissionBanner } from "@/components/notifications/NotificationPermissionBanner";
import { PermissionPrompt } from "@/components/permissions/PermissionPrompt";
import {
  ForegroundNotificationCenter,
  type ForegroundNotificationPayload,
} from "@/components/notifications/ForegroundNotificationCenter";

// Pages
import Dashboard from "@/pages/dashboard";
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

function GrowthRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/health?tab=growth");
  }, [setLocation]);
  return null;
}

function AuthenticatedRouter() {
  const [location, setLocation] = useLocation();
  const { setActiveChildId } = useChildContext();
  const isAuthPage = location === "/onboarding";
  const [foregroundNotification, setForegroundNotification] =
    React.useState<ForegroundNotificationPayload | null>(null);
  const lastNavigationRef = React.useRef<string | null>(null);

  const navigateFromNotification = React.useCallback(
    (rawUrl: string | null | undefined, rawChildId?: unknown) => {
      const { target, isInternal } = normalizeNotificationTarget(rawUrl);
      const payloadChildId = resolveNotifyChildId(rawChildId);
      const targetWithChild = appendNotifyChildId(target, payloadChildId);

      if (isInternal) {
        const parsed = extractNotifyChildFromPath(targetWithChild);
        const targetChildId = payloadChildId || parsed.childId;

        if (targetChildId) {
          setActiveChildId(targetChildId);
        }

        if (parsed.path.startsWith("/")) {
          if (lastNavigationRef.current === parsed.path && location === parsed.path) {
            return;
          }
          lastNavigationRef.current = parsed.path;
          setLocation(parsed.path);
          return;
        }
      }

      window.location.assign(target);
    },
    [location, setActiveChildId, setLocation],
  );

  useEffect(() => {
    if (!location.startsWith("/")) return;
    const parsed = extractNotifyChildFromPath(location);
    if (parsed.childId) {
      setActiveChildId(parsed.childId);
    }
    if (parsed.path !== location) {
      setLocation(parsed.path, { replace: true });
    }
  }, [location, setActiveChildId, setLocation]);

  // Escuta mensagens do Service Worker para navegar sem reload (notificações)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NAVIGATE" && event.data?.url) {
        navigateFromNotification(
          String(event.data.url),
          event.data.childId,
        );
      }

      if (event.data?.type === "PUSH_RECEIVED") {
        setForegroundNotification({
          title: event.data.title,
          body: event.data.body,
          url: event.data.url,
          childId: resolveNotifyChildId(event.data.childId),
        });
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () =>
      navigator.serviceWorker?.removeEventListener("message", handler);
  }, [navigateFromNotification]);

  return (
    <>
      <PermissionPrompt />
      <NotificationPermissionBanner />
      <ForegroundNotificationCenter
        notification={foregroundNotification}
        onDismiss={() => setForegroundNotification(null)}
        onOpen={(notification) => {
          setForegroundNotification(null);
          navigateFromNotification(notification.url, notification.childId);
        }}
      />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/growth" component={GrowthRedirect} />
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

import { ThemeProvider } from "@/hooks/use-theme";
import React from "react";

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
