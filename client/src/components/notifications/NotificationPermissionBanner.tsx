import { useState, useEffect, useRef } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const DISMISSED_KEY = "notif_permission_dismissed_v1";
const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas
const PERMISSIONS_COMPLETED_KEY = "filhos_permissions_completed_v1";

export function NotificationPermissionBanner() {
  const { isSubscribed, isSupported, subscribe, isLoading } =
    usePushNotifications();
  const [visible, setVisible] = useState(false);
  const hasAttemptedAutoSubscribe = useRef(false);

  useEffect(() => {
    if (!isSupported || isLoading) return;
    if (isSubscribed) return;
    if (Notification.permission === "denied") return;
    if (!localStorage.getItem(PERMISSIONS_COMPLETED_KEY)) return;
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < SNOOZE_DURATION_MS) return;
    }
    if (Notification.permission === "granted") {
      if (!hasAttemptedAutoSubscribe.current) {
        hasAttemptedAutoSubscribe.current = true;
        subscribe();
      }
      return;
    }
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, isLoading, subscribe]);

  const handleActivate = async () => {
    setVisible(false);
    await subscribe();
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 max-w-md mx-auto"
        >
          <div className="m-3 bg-card rounded-2xl border border-primary/20 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 pt-4 pb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground">
                    Ative as notificações 🔔
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Receba avisos de vacinas, novos marcos e comentários da
                    família — em tempo real.
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                  aria-label="Dispensar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="flex-1 h-9 rounded-xl font-semibold text-sm"
                  onClick={handleActivate}
                >
                  Ativar agora
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 rounded-xl text-muted-foreground text-xs"
                  onClick={handleDismiss}
                >
                  Depois
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
