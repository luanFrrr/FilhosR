import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@shared/routes";
import { type User } from "@shared/schema";

// Hook for authentication with Replit Auth (OIDC)
export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user");
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto sync Google profile data (name + photo) once per session
  // The sync-profile endpoint reads Replit proxy headers present on every request
  useEffect(() => {
    if (!user) return;

    const syncKey = `profile_synced_${user.id}`;
    if (sessionStorage.getItem(syncKey)) return;

    sessionStorage.setItem(syncKey, "1");

    fetch("/api/auth/sync-profile")
      .then((res) => {
        if (res.ok) {
          // Refresh user data so UI updates with new name/photo
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
      })
      .catch(() => {
        // Silent fail — sync is best-effort
        sessionStorage.removeItem(syncKey);
      });
  }, [user?.id, queryClient]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}

// Legacy useUser for compatibility
export function useUser() {
  const { user, isLoading } = useAuth();
  return {
    data: user,
    isLoading,
    error: null,
  };
}

export function useGamification(childId: number | null) {
  return useQuery({
    queryKey: [api.auth.gamification.path, childId],
    queryFn: async () => {
      if (!childId) return { points: 0, level: 'Iniciante' };
      const res = await fetch(`${api.auth.gamification.path}?childId=${childId}`);
      if (res.status === 401) return { points: 0, level: 'Iniciante' };
      if (!res.ok) throw new Error("Failed to fetch gamification");
      return api.auth.gamification.responses[200].parse(await res.json());
    },
    enabled: childId !== null,
  });
}
