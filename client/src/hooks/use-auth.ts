import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type User, type Gamification } from "@shared/schema";

export function useUser() {
  return useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path);
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.auth.me.responses[200].parse(await res.json());
    },
    retry: false,
  });
}

export function useGamification() {
  return useQuery({
    queryKey: [api.auth.gamification.path],
    queryFn: async () => {
      const res = await fetch(api.auth.gamification.path);
      if (!res.ok) throw new Error("Failed to fetch gamification");
      return api.auth.gamification.responses[200].parse(await res.json());
    },
  });
}
