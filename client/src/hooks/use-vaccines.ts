import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { SusVaccine, VaccineRecord, InsertVaccineRecord } from "@shared/schema";

export function useSusVaccines() {
  return useQuery<SusVaccine[]>({
    queryKey: [api.susVaccines.list.path],
    queryFn: async () => {
      const res = await fetch(api.susVaccines.list.path);
      if (!res.ok) throw new Error("Failed to fetch SUS vaccines");
      return res.json();
    },
  });
}

export function useVaccineRecords(childId: number) {
  return useQuery<VaccineRecord[]>({
    queryKey: [api.vaccineRecords.list.path, childId],
    queryFn: async () => {
      const url = buildUrl(api.vaccineRecords.list.path, { childId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch vaccine records");
      return res.json();
    },
    enabled: !!childId,
  });
}

export function useCreateVaccineRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ childId, ...data }: { childId: number } & Omit<InsertVaccineRecord, "childId">) => {
      const url = buildUrl(api.vaccineRecords.create.path, { childId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create vaccine record");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.vaccineRecords.list.path, variables.childId] });
      queryClient.invalidateQueries({ queryKey: [api.auth.gamification.path] });
    },
  });
}

export function useUpdateVaccineRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, childId, ...data }: { id: number; childId: number } & Partial<InsertVaccineRecord>) => {
      const url = buildUrl(api.vaccineRecords.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update vaccine record");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.vaccineRecords.list.path, variables.childId] });
    },
  });
}

export function useDeleteVaccineRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, childId }: { id: number; childId: number }) => {
      const url = buildUrl(api.vaccineRecords.delete.path, { id });
      const res = await fetch(url, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete vaccine record");
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.vaccineRecords.list.path, variables.childId] });
    },
  });
}
