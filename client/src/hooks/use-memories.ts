import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertMilestone, InsertDiaryEntry } from "@shared/schema";

// --- MILESTONES ---

export function useMilestones(childId: number) {
  return useQuery({
    queryKey: [api.milestones.list.path, childId],
    queryFn: async () => {
      const url = buildUrl(api.milestones.list.path, { childId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch milestones");
      return api.milestones.list.responses[200].parse(await res.json());
    },
    enabled: !!childId,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ childId, ...data }: { childId: number } & Omit<InsertMilestone, "childId">) => {
      const url = buildUrl(api.milestones.create.path, { childId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create milestone");
      return api.milestones.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.milestones.list.path, variables.childId] });
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ childId, milestoneId, ...data }: { childId: number; milestoneId: number } & Partial<Omit<InsertMilestone, "childId">>) => {
      const url = buildUrl(api.milestones.update.path, { childId, milestoneId });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update milestone");
      return api.milestones.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.milestones.list.path, variables.childId] });
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ childId, milestoneId }: { childId: number; milestoneId: number }) => {
      const url = buildUrl(api.milestones.delete.path, { childId, milestoneId });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete milestone");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.milestones.list.path, variables.childId] });
    },
  });
}

// --- DIARY ---

export function useDiary(childId: number) {
  return useQuery({
    queryKey: [api.diary.list.path, childId],
    queryFn: async () => {
      const url = buildUrl(api.diary.list.path, { childId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch diary entries");
      return api.diary.list.responses[200].parse(await res.json());
    },
    enabled: !!childId,
  });
}

export function useCreateDiaryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ childId, ...data }: { childId: number } & Omit<InsertDiaryEntry, "childId">) => {
      const url = buildUrl(api.diary.create.path, { childId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create diary entry");
      return api.diary.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.diary.list.path, variables.childId] });
    },
  });
}
