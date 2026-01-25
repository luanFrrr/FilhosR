import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertChild } from "@shared/routes";

export function useChildren() {
  return useQuery({
    queryKey: [api.children.list.path],
    queryFn: async () => {
      const res = await fetch(api.children.list.path);
      if (!res.ok) throw new Error("Failed to fetch children");
      return api.children.list.responses[200].parse(await res.json());
    },
  });
}

export function useChild(id: number) {
  return useQuery({
    queryKey: [api.children.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.children.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch child");
      return api.children.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertChild) => {
      const res = await fetch(api.children.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create child");
      return api.children.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.children.list.path] }),
  });
}

export function useUpdateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertChild>) => {
      const url = buildUrl(api.children.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update child");
      return api.children.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.children.list.path] }),
  });
}
