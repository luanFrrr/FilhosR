import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ForegroundNotificationPayload = {
  title?: string;
  body?: string;
  url?: string;
  childId?: number | null;
};

export function ForegroundNotificationCenter({
  notification,
  onOpen,
  onDismiss,
}: {
  notification: ForegroundNotificationPayload | null;
  onOpen: (notification: ForegroundNotificationPayload) => void;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!notification) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timeoutId = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(onDismiss, 180);
    }, 6500);

    return () => window.clearTimeout(timeoutId);
  }, [notification, onDismiss]);

  if (!notification) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-[120] flex items-center justify-center px-4 transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-3xl border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Bell className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {notification.title || "Nova notificacao"}
            </p>
            {notification.body ? (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {notification.body}
              </p>
            ) : null}

            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => onOpen(notification)}
              >
                Abrir
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setVisible(false);
                  window.setTimeout(onDismiss, 180);
                }}
              >
                Agora nao
              </Button>
            </div>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full"
            onClick={() => {
              setVisible(false);
              window.setTimeout(onDismiss, 180);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
