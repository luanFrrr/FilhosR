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

// ============================================================
// COMMENTS
// ============================================================

export function useComments(childId: number, recordType: string, recordId: number) {
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
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
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
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.childId, variables.recordType, variables.recordId],
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
      if (!res.ok && res.status !== 204) throw new Error("Erro ao excluir comentário");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.childId, variables.recordType, variables.recordId],
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
    // Otimistic update: muda o UI antes da resposta do servidor
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["milestone-likes", milestoneId] });
      const previous = queryClient.getQueryData<LikeStatus>(["milestone-likes", milestoneId]);
      if (previous) {
        queryClient.setQueryData<LikeStatus>(["milestone-likes", milestoneId], {
          count: previous.userLiked ? previous.count - 1 : previous.count + 1,
          userLiked: !previous.userLiked,
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Reverte em caso de erro
      if (context?.previous) {
        queryClient.setQueryData(["milestone-likes", milestoneId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["milestone-likes", milestoneId] });
      // Invalidar a listagem para atualizar os contadores nos cards
      queryClient.invalidateQueries({ queryKey: ["milestones-social", childId] });
    },
  });
}

// Hook para buscar milestones com contadores sociais
export function useMilestonesWithSocial(childId: number) {
  return useQuery<Array<{
    id: number;
    childId: number;
    date: string;
    title: string;
    description: string | null;
    photoUrl: string | null;
    createdAt: string | null;
    likeCount: number;
    commentCount: number;
  }>>({
    queryKey: ["milestones-social", childId],
    queryFn: async () => {
      const res = await fetch(`/api/children/${childId}/milestones/social`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao buscar marcos");
      return res.json();
    },
    enabled: !!childId,
  });
}
