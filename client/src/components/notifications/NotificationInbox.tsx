import { useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationsCount,
} from "@/hooks/use-notifications";
import { useChildContext } from "@/hooks/use-child-context";
import { normalizeNotificationTarget } from "@/lib/notification-navigation";
import { cn } from "@/lib/utils";

function formatRelativeDate(value: string | null): string {
  if (!value) return "";
  try {
    return formatDistanceToNow(new Date(value), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    return "";
  }
}

export function NotificationInbox() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { setActiveChildId } = useChildContext();
  const { data: unreadData } = useUnreadNotificationsCount();
  const unreadCount = unreadData?.count ?? 0;
  const { data: notifications, isLoading } = useNotifications({
    limit: 60,
    offset: 0,
    enabled: open,
  });
  const markRead = useMarkNotificationAsRead();
  const markAllRead = useMarkAllNotificationsAsRead();

  const hasUnreadInList = useMemo(
    () => (notifications || []).some((item) => !item.readAt),
    [notifications],
  );

  const handleOpenNotification = (notification: {
    id: number;
    childId: number;
    deepLink: string;
    readAt: string | null;
  }) => {
    if (!notification.readAt) {
      markRead.mutate(notification.id);
    }

    if (notification.childId > 0) {
      setActiveChildId(notification.childId);
    }

    setOpen(false);
    const { target, isInternal } = normalizeNotificationTarget(
      notification.deepLink,
    );
    if (isInternal) {
      setLocation(target);
      return;
    }
    window.location.assign(target);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-foreground transition-colors hover:bg-muted/60"
          aria-label="Abrir notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[92vw] max-w-md p-0">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SheetTitle>Notificações</SheetTitle>
              <SheetDescription>
                Interações recentes dos cuidadores
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={!hasUnreadInList || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Lidas
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-88px)] px-3 py-3">
          {isLoading && (
            <div className="space-y-3 px-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="rounded-xl border border-border/60 p-3">
                  <Skeleton className="mb-2 h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && (!notifications || notifications.length === 0) && (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Sem notificações por enquanto.
            </div>
          )}

          {!isLoading && notifications && notifications.length > 0 && (
            <div className="space-y-2 pb-4">
              {notifications.map((notification) => {
                const unread = !notification.readAt;
                return (
                  <button
                    key={notification.id}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                      unread
                        ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                        : "border-border/70 bg-card hover:bg-muted/50",
                    )}
                    onClick={() => handleOpenNotification(notification)}
                  >
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">
                        {notification.title}
                      </p>
                      {unread && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {formatRelativeDate(notification.createdAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
