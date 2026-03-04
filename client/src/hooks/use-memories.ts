import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertMilestone, InsertDiaryEntry } from "@shared/schema";

const FETCH_OPTS: RequestInit = {
  credentials: "include",
};

// ──────────────────────────────────────────────────────────────
// MILESTONES
// ──────────────────────────────────────────────────────────────

export function useMilestones(childId: number) {
  return useQuery({
    queryKey: [api.milestones.list.path, childId],
    queryFn: async () => {
      const url = buildUrl(api.milestones.list.path, { childId });
      const res = await fetch(url, FETCH_OPTS);
      if (!res.ok) throw new Error("Erro ao buscar marcos");
      return api.milestones.list.responses[200].parse(await res.json());
    },
    enabled: !!childId,
    staleTime: 5_000, // 5s — evita refetches em troca de abas
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      ...data
    }: { childId: number } & Omit<InsertMilestone, "childId">) => {
      const url = buildUrl(api.milestones.create.path, { childId });
      const res = await fetch(url, {
        ...FETCH_OPTS,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao criar marco");
      return api.milestones.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.milestones.list.path, variables.childId] });
      queryClient.invalidateQueries({ queryKey: ["milestones-social", variables.childId] });
      queryClient.invalidateQueries({ queryKey: [api.auth.gamification.path] });
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      milestoneId,
      ...data
    }: { childId: number; milestoneId: number } & Partial<Omit<InsertMilestone, "childId">>) => {
      const url = buildUrl(api.milestones.update.path, { childId, milestoneId });
      const res = await fetch(url, {
        ...FETCH_OPTS,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar marco");
      return api.milestones.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.milestones.list.path, variables.childId] });
      queryClient.invalidateQueries({ queryKey: ["milestones-social", variables.childId] });
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      milestoneId,
    }: {
      childId: number;
      milestoneId: number;
    }) => {
      const url = buildUrl(api.milestones.delete.path, { childId, milestoneId });
      const res = await fetch(url, { ...FETCH_OPTS, method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir marco");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.milestones.list.path, variables.childId] });
      queryClient.invalidateQueries({ queryKey: ["milestones-social", variables.childId] });
    },
  });
}

// ──────────────────────────────────────────────────────────────
// DIARY
// ──────────────────────────────────────────────────────────────

export function useDiary(childId: number, pageSize = 30) {
  return useInfiniteQuery({
    queryKey: [api.diary.list.path, childId],
    queryFn: async ({ pageParam = 1 }) => {
      // Append query string values for page and pageSize
      const url = `${buildUrl(api.diary.list.path, { childId })}?page=${pageParam}&pageSize=${pageSize}`;
      const res = await fetch(url, FETCH_OPTS);
      if (!res.ok) throw new Error("Erro ao buscar diário");
      return api.diary.list.responses[200].parse(await res.json());
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!childId,
    staleTime: 5_000,
  });
}

export function useCreateDiaryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      ...data
    }: { childId: number } & Omit<InsertDiaryEntry, "childId">) => {
      const url = buildUrl(api.diary.create.path, { childId });
      const res = await fetch(url, {
        ...FETCH_OPTS,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao criar entrada no diário");
      return api.diary.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.diary.list.path, variables.childId] });
      queryClient.invalidateQueries({ queryKey: [api.auth.gamification.path] });
    },
  });
}

export function useUpdateDiaryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      entryId,
      ...data
    }: {
      childId: number;
      entryId: number;
    } & Partial<Omit<InsertDiaryEntry, "childId">>) => {
      const url = buildUrl(api.diary.update.path, { childId, entryId });
      const res = await fetch(url, {
        ...FETCH_OPTS,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar entrada");
      return api.diary.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.diary.list.path, variables.childId] });
    },
  });
}

export function useDeleteDiaryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      entryId,
    }: {
      childId: number;
      entryId: number;
    }) => {
      const url = buildUrl(api.diary.delete.path, { childId, entryId });
      const res = await fetch(url, { ...FETCH_OPTS, method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir entrada");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.diary.list.path, variables.childId] });
    },
  });
}
