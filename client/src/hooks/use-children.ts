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

export function useChildrenWithRoles() {
  return useQuery({
    queryKey: [api.children.listWithRoles.path],
    queryFn: async () => {
      const res = await fetch(api.children.listWithRoles.path);
      if (!res.ok) throw new Error("Failed to fetch children with roles");
      return res.json();
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.children.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.children.listWithRoles.path] });
      queryClient.invalidateQueries({ queryKey: [api.auth.gamification.path] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.children.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.children.listWithRoles.path] });
    },
  });
}

export function useDeleteChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.children.delete.path, { id });
      const res = await fetch(url, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to delete child");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.children.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.children.listWithRoles.path] });
    },
  });
}

export function useCaregivers(childId: number) {
  return useQuery({
    queryKey: [api.invites.caregivers.path, childId],
    queryFn: async () => {
      const url = buildUrl(api.invites.caregivers.path, { childId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch caregivers");
      return res.json() as Promise<Array<{
        id: number;
        userId: string;
        relationship: string;
        role: string;
        userFirstName: string | null;
        userLastName: string | null;
        userEmail: string | null;
      }>>;
    },
    enabled: !!childId,
  });
}

export function useRemoveCaregiver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ childId, caregiverId }: { childId: number; caregiverId: number }) => {
      const url = buildUrl(api.invites.removeCareiver.path, { childId, caregiverId });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Erro ao remover cuidador");
      }
    },
    onSuccess: (_, { childId }) => {
      queryClient.invalidateQueries({ queryKey: [api.invites.caregivers.path, childId] });
    },
  });
}

export function useLeaveChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (childId: number) => {
      const url = buildUrl(api.invites.leaveChild.path, { childId });
      const res = await fetch(url, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Erro ao sair");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.children.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.children.listWithRoles.path] });
    },
  });
}
