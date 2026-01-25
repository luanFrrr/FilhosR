import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertGrowthRecord } from "@shared/schema";

export function useGrowthRecords(childId: number) {
  return useQuery({
    queryKey: [api.growth.list.path, childId],
    queryFn: async () => {
      const url = buildUrl(api.growth.list.path, { childId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch growth records");
      return api.growth.list.responses[200].parse(await res.json());
    },
    enabled: !!childId,
  });
}

export function useCreateGrowthRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ childId, ...data }: { childId: number } & Omit<InsertGrowthRecord, "childId">) => {
      const url = buildUrl(api.growth.create.path, { childId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create growth record");
      return api.growth.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.growth.list.path, variables.childId] });
      queryClient.invalidateQueries({ queryKey: [api.auth.gamification.path] });
    },
  });
}

export function useUpdateGrowthRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, childId, ...data }: { id: number; childId: number } & Partial<Omit<InsertGrowthRecord, "childId">>) => {
      const url = buildUrl(api.growth.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update growth record");
      return api.growth.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.growth.list.path, variables.childId] });
    },
  });
}

export function useArchiveGrowthRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, childId }: { id: number; childId: number }) => {
      const url = buildUrl(api.growth.archive.path, { id });
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Failed to archive growth record");
      return api.growth.archive.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.growth.list.path, variables.childId] });
    },
  });
}
