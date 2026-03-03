import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

type Comment = {
  id: number;
  childId: number;
  recordType: string;
  recordId: number;
  userId: string;
  text: string;
  createdAt: string | null;
  userFirstName: string | null;
  userLastName: string | null;
};

type LikeStatus = {
  count: number;
  userLiked: boolean;
};

type MilestoneWithSocial = {
  id: number;
  childId: number;
  date: string;
  title: string;
  description: string | null;
  photoUrl: string | null;
  createdAt: string | null;
  likeCount: number;
  commentCount: number;
  userLiked: boolean;
};

// ============================================================
// COMMENTS
// ============================================================

export function useComments(
  childId: number,
  recordType: string,
  recordId: number,
) {
  return useQuery<Comment[]>({
    queryKey: ["comments", childId, recordType, recordId],
    queryFn: async () => {
      const res = await fetch(
        `/api/children/${childId}/comments/${recordType}/${recordId}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Erro ao buscar comentários");
      return res.json();
    },
    enabled: !!childId && !!recordId,
    staleTime: 10_000, // 10s — comentários mudam com pouca frequência
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      childId,
      recordType,
      recordId,
      text,
    }: {
      childId: number;
      recordType: string;
      recordId: number;
      text: string;
    }) => {
      const res = await fetch(`/api/children/${childId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recordType, recordId, text }),
      });
      if (!res.ok) throw new Error("Erro ao criar comentário");
      return res.json() as Promise<Comment>;
    },

    // Optimistic update: adiciona o comentário imediatamente na UI
    onMutate: async ({ childId, recordType, recordId, text }) => {
      const queryKey = ["comments", childId, recordType, recordId];
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Comment[]>(queryKey);

      // Cria versão otimista do comentário
      const optimisticComment: Comment = {
        id: -Date.now(), // ID temporário negativo
        childId,
        recordType,
        recordId,
        userId: user?.id ?? "",
        text,
        createdAt: new Date().toISOString(),
        userFirstName: (user as any)?.firstName ?? null,
        userLastName: (user as any)?.lastName ?? null,
      };

      queryClient.setQueryData<Comment[]>(queryKey, (old) => [
        ...(old ?? []),
        optimisticComment,
      ]);

      return { previous, queryKey };
    },

    onError: (_err, _vars, context) => {
      // Reverte em caso de erro
      if (context?.previous !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },

    onSettled: (_data, _err, variables) => {
      // Sincroniza com o servidor (remove o ID temporário)
      queryClient.invalidateQueries({
        queryKey: [
          "comments",
          variables.childId,
          variables.recordType,
          variables.recordId,
        ],
      });
      // Atualiza o contador de comentários na timeline
      queryClient.invalidateQueries({
        queryKey: ["milestones-social", variables.childId],
      });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      commentId,
      text,
    }: {
      commentId: number;
      text: string;
      childId: number;
      recordType: string;
      recordId: number;
    }) => {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Erro ao editar comentário");
      return res.json() as Promise<Comment>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "comments",
          variables.childId,
          variables.recordType,
          variables.recordId,
        ],
      });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      commentId,
      childId,
      recordType,
      recordId,
    }: {
      commentId: number;
      childId: number;
      recordType: string;
      recordId: number;
    }) => {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204)
        throw new Error("Erro ao excluir comentário");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "comments",
          variables.childId,
          variables.recordType,
          variables.recordId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["milestones-social", variables.childId],
      });
    },
  });
}

// ============================================================
// MILESTONE LIKES
// ============================================================

export function useMilestoneLikes(milestoneId: number) {
  return useQuery<LikeStatus>({
    queryKey: ["milestone-likes", milestoneId],
    queryFn: async () => {
      const res = await fetch(`/api/milestones/${milestoneId}/likes`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao buscar likes");
      return res.json();
    },
    enabled: !!milestoneId,
    staleTime: 5_000, // 5s — com Realtime, o dado é invalidado automaticamente
  });
}

export function useToggleLike(childId: number, milestoneId: number) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/milestones/${milestoneId}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao reagir ao marco");
      return res.json() as Promise<LikeStatus>;
    },
    // Optimistic update: UI responde imediatamente
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["milestone-likes", milestoneId],
      });
      const previous = queryClient.getQueryData<LikeStatus>([
        "milestone-likes",
        milestoneId,
      ]);
      if (previous) {
        queryClient.setQueryData<LikeStatus>(["milestone-likes", milestoneId], {
          count: previous.userLiked ? previous.count - 1 : previous.count + 1,
          userLiked: !previous.userLiked,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["milestone-likes", milestoneId],
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["milestone-likes", milestoneId],
      });
      queryClient.invalidateQueries({
        queryKey: ["milestones-social", childId],
      });
    },
  });
}

// ============================================================
// MILESTONES COM CONTADORES SOCIAIS
// ============================================================

export function useMilestonesWithSocial(childId: number) {
  const queryClient = useQueryClient();

  return useQuery<MilestoneWithSocial[]>({
    queryKey: ["milestones-social", childId],
    queryFn: async () => {
      const res = await fetch(`/api/children/${childId}/milestones/social`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao buscar marcos");
      const data: MilestoneWithSocial[] = await res.json();

      // Pré-popula o cache de likes por marco com userLiked já carregado
      // → elimina roundtrip extra ao abrir o detalhe de qualquer marco
      data.forEach((milestone) => {
        queryClient.setQueryData<LikeStatus>(
          ["milestone-likes", milestone.id],
          { count: milestone.likeCount, userLiked: milestone.userLiked },
        );
      });

      return data;
    },
    enabled: !!childId,
    staleTime: 5_000, // 5s — evita refetches desnecessários em troca de abas
  });
}
