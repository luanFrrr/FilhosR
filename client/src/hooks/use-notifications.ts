import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type InboxNotification = {
  id: number;
  recipientUserId: string;
  actorUserId: string | null;
  actorName: string | null;
  actorAvatar: string | null;
  childId: number;
  type: string;
  title: string;
  body: string;
  deepLink: string;
  recordType: string | null;
  recordId: number | null;
  commentId: number | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string | null;
};

const notificationsKeys = {
  list: (limit: number, offset: number) => ["notifications", limit, offset],
  unreadCount: ["notifications", "unread-count"] as const,
};

export function useNotifications(options?: {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const enabled = options?.enabled ?? true;

  return useQuery<InboxNotification[]>({
    queryKey: notificationsKeys.list(limit, offset),
    queryFn: async () => {
      const res = await fetch(
        `/api/notifications?limit=${limit}&offset=${offset}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Erro ao buscar notificações");
      return res.json();
    },
    staleTime: 15_000,
    enabled,
  });
}

export function useUnreadNotificationsCount() {
  return useQuery<{ count: number }>({
    queryKey: notificationsKeys.unreadCount,
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread-count", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao buscar contador de notificações");
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 60_000
        : false,
    refetchOnWindowFocus: false,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${id}/read`);
      return (await res.json()) as InboxNotification;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousLists = queryClient.getQueriesData<InboxNotification[]>({
        queryKey: ["notifications"],
      });
      const previousUnread = queryClient.getQueryData<{ count: number }>(
        notificationsKeys.unreadCount,
      );

      for (const [key, value] of previousLists) {
        if (!Array.isArray(value)) continue;
        queryClient.setQueryData<InboxNotification[]>(key, (current = []) =>
          current.map((notification) =>
            notification.id === id && !notification.readAt
              ? { ...notification, readAt: new Date().toISOString() }
              : notification,
          ),
        );
      }

      if (previousUnread) {
        queryClient.setQueryData(notificationsKeys.unreadCount, {
          count: Math.max(0, previousUnread.count - 1),
        });
      }

      return { previousLists, previousUnread };
    },
    onError: (_error, _id, context) => {
      context?.previousLists?.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      if (context?.previousUnread) {
        queryClient.setQueryData(
          notificationsKeys.unreadCount,
          context.previousUnread,
        );
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueriesData<InboxNotification[]>(
        { queryKey: ["notifications"] },
        (current = []) =>
          current.map((notification) =>
            notification.id === updated.id ? updated : notification,
          ),
      );
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/notifications/read-all");
      return (await res.json()) as { updated: number };
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousLists = queryClient.getQueriesData<InboxNotification[]>({
        queryKey: ["notifications"],
      });
      const previousUnread = queryClient.getQueryData<{ count: number }>(
        notificationsKeys.unreadCount,
      );

      for (const [key, value] of previousLists) {
        if (!Array.isArray(value)) continue;
        queryClient.setQueryData<InboxNotification[]>(key, (current = []) =>
          current.map((notification) =>
            notification.readAt
              ? notification
              : { ...notification, readAt: new Date().toISOString() },
          ),
        );
      }

      queryClient.setQueryData(notificationsKeys.unreadCount, { count: 0 });

      return { previousLists, previousUnread };
    },
    onError: (_error, _variables, context) => {
      context?.previousLists?.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      if (context?.previousUnread) {
        queryClient.setQueryData(
          notificationsKeys.unreadCount,
          context.previousUnread,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
