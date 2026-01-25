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
      queryClient.invalidateQueries({ queryKey: ["/api/gamification"] });
    },
  });
}
