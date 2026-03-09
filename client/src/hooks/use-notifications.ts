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
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${id}/read`);
      return (await res.json()) as InboxNotification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

