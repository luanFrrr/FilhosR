import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertVaccine, InsertHealthRecord } from "@shared/schema";

// --- VACCINES ---

export function useVaccines(childId: number) {
  return useQuery({
    queryKey: [api.vaccines.list.path, childId],
    queryFn: async () => {
      const url = buildUrl(api.vaccines.list.path, { childId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch vaccines");
      return api.vaccines.list.responses[200].parse(await res.json());
    },
    enabled: !!childId,
  });
}

export function useCreateVaccine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ childId, ...data }: { childId: number } & Omit<InsertVaccine, "childId">) => {
      const url = buildUrl(api.vaccines.create.path, { childId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create vaccine");
      return api.vaccines.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.vaccines.list.path, variables.childId] });
    },
  });
}

export function useUpdateVaccine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, childId, ...data }: { id: number, childId: number } & Partial<InsertVaccine>) => {
      const url = buildUrl(api.vaccines.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update vaccine");
      return api.vaccines.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.vaccines.list.path, variables.childId] });
    },
  });
}

// --- HEALTH RECORDS ---

export function useHealthRecords(childId: number) {
  return useQuery({
    queryKey: [api.health.list.path, childId],
    queryFn: async () => {
      const url = buildUrl(api.health.list.path, { childId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch health records");
      return api.health.list.responses[200].parse(await res.json());
    },
    enabled: !!childId,
  });
}

export function useCreateHealthRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ childId, ...data }: { childId: number } & Omit<InsertHealthRecord, "childId">) => {
      const url = buildUrl(api.health.create.path, { childId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create health record");
      return api.health.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.health.list.path, variables.childId] });
      queryClient.invalidateQueries({ queryKey: [api.auth.gamification.path] });
    },
  });
}

export function useUpdateHealthRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, childId, ...data }: { id: number; childId: number } & Partial<InsertHealthRecord>) => {
      const url = buildUrl(api.health.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update health record");
      return api.health.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.health.list.path, variables.childId] });
    },
  });
}

export function useArchiveHealthRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, childId }: { id: number; childId: number }) => {
      const url = buildUrl(api.health.archive.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to archive health record");
      return api.health.archive.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.health.list.path, variables.childId] });
    },
  });
}
