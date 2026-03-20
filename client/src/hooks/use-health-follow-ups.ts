import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type {
  HealthFollowUp,
  HealthFollowUpWithRelations,
  HealthExam,
  NeonatalScreening,
  DevelopmentMilestone,
} from "@shared/schema";

const healthFollowUpKey = (childId: number) => [
  "/api/children",
  childId,
  "health-follow-ups",
] as const;

type HealthFollowUpsPage = {
  data: HealthFollowUpWithRelations[];
  nextCursor: string | null;
};

function updateHealthFollowUpsCache(
  previous:
    | InfiniteData<HealthFollowUpsPage, string | undefined>
    | undefined,
  updater: (followUp: HealthFollowUpWithRelations) => HealthFollowUpWithRelations,
) {
  if (!previous) return previous;

  return {
    ...previous,
    pages: previous.pages.map((page) => ({
      ...page,
      data: page.data.map(updater),
    })),
  };
}

export function useHealthFollowUps(childId: number) {
  return useInfiniteQuery<HealthFollowUpsPage>({
    queryKey: healthFollowUpKey(childId),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (pageParam) params.set("cursor", pageParam as string);

      const res = await fetch(
        `/api/children/${childId}/health-follow-ups?${params.toString()}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Erro ao carregar acompanhamentos");
      return res.json();
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: childId > 0,
  });
}

export function useCreateHealthFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      ...data
    }: {
      childId: number;
      category: string;
      title: string;
      description?: string;
      followUpDate: string;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/children/${childId}/health-follow-ups`,
        data,
      );
      return (await res.json()) as HealthFollowUp;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: healthFollowUpKey(variables.childId) });
    },
  });
}

export function useUpdateHealthFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      childId,
      ...data
    }: {
      id: number;
      childId: number;
      category?: string;
      title?: string;
      description?: string;
      followUpDate?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/health-follow-ups/${id}`, data);
      return (await res.json()) as HealthFollowUp;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: healthFollowUpKey(variables.childId) });
    },
  });
}

export function useDeleteHealthFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, childId }: { id: number; childId: number }) => {
      await apiRequest("DELETE", `/api/health-follow-ups/${id}`);
      return { childId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: healthFollowUpKey(variables.childId) });
    },
  });
}

export function useUpdateNeonatalScreening() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      followUpId,
      screeningType,
      ...data
    }: {
      childId: number;
      followUpId: number;
      screeningType: string;
      isCompleted?: boolean;
      completedAt?: string | null;
      notes?: string | null;
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/health-follow-ups/${followUpId}/neonatal-screenings/${screeningType}`,
        data,
      );
      return (await res.json()) as NeonatalScreening;
    },
    onMutate: async (variables) => {
      const queryKey = healthFollowUpKey(variables.childId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(queryKey);

      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(queryKey, (current) =>
        updateHealthFollowUpsCache(current, (followUp) => {
          if (followUp.id !== variables.followUpId) return followUp;

          return {
            ...followUp,
            neonatalScreenings: followUp.neonatalScreenings.map((screening) =>
              screening.screeningType === variables.screeningType
                ? {
                    ...screening,
                    isCompleted: variables.isCompleted ?? false,
                    completedAt: variables.completedAt ?? null,
                    notes:
                      variables.notes !== undefined
                        ? variables.notes
                        : screening.notes,
                  }
                : screening,
            ),
          };
        }),
      );

      return { previous, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(healthFollowUpKey(variables.childId), (current) =>
        updateHealthFollowUpsCache(current, (followUp) => {
          if (followUp.id !== variables.followUpId) return followUp;

          const hasScreening = followUp.neonatalScreenings.some(
            (screening) => screening.screeningType === data.screeningType,
          );

          return {
            ...followUp,
            neonatalScreenings: hasScreening
              ? followUp.neonatalScreenings.map((screening) =>
                  screening.screeningType === data.screeningType
                    ? data
                    : screening,
                )
              : [...followUp.neonatalScreenings, data],
          };
        }),
      );
    },
  });
}

export function useUpdateDevelopmentMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      followUpId,
      milestoneKey,
      ...data
    }: {
      childId: number;
      followUpId: number;
      milestoneKey: string;
      status?: string;
      checkedAt?: string | null;
      notes?: string | null;
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/health-follow-ups/${followUpId}/development-milestones/${milestoneKey}`,
        data,
      );
      return (await res.json()) as DevelopmentMilestone;
    },
    onMutate: async (variables) => {
      const queryKey = healthFollowUpKey(variables.childId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(queryKey);

      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(queryKey, (current) =>
        updateHealthFollowUpsCache(current, (followUp) => {
          if (followUp.id !== variables.followUpId) return followUp;

          return {
            ...followUp,
            developmentMilestones: followUp.developmentMilestones.map((milestone) =>
              milestone.milestoneKey === variables.milestoneKey
                ? {
                    ...milestone,
                    status: variables.status ?? milestone.status,
                    checkedAt:
                      variables.checkedAt !== undefined
                        ? variables.checkedAt
                        : milestone.checkedAt,
                    notes:
                      variables.notes !== undefined
                        ? variables.notes
                        : milestone.notes,
                  }
                : milestone,
            ),
          };
        }),
      );

      return { previous, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(healthFollowUpKey(variables.childId), (current) =>
        updateHealthFollowUpsCache(current, (followUp) => {
          if (followUp.id !== variables.followUpId) return followUp;

          const hasMilestone = followUp.developmentMilestones.some(
            (milestone) => milestone.milestoneKey === data.milestoneKey,
          );

          return {
            ...followUp,
            developmentMilestones: hasMilestone
              ? followUp.developmentMilestones.map((milestone) =>
                  milestone.milestoneKey === data.milestoneKey
                    ? data
                    : milestone,
                )
              : [...followUp.developmentMilestones, data],
          };
        }),
      );
    },
  });
}

interface FileInput {
  fileBase64: string;
  fileMimeType: string;
  fileName: string;
}

export function useCreateHealthExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      childId,
      followUpId,
      ...data
    }: {
      childId: number;
      followUpId: number;
      title: string;
      examDate: string;
      notes?: string;
      files?: FileInput[];
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/health-follow-ups/${followUpId}/exams`,
        data,
      );
      return (await res.json()) as HealthExam;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: healthFollowUpKey(variables.childId) });
    },
  });
}

export function useUpdateHealthExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      childId,
      ...data
    }: {
      id: number;
      childId: number;
      title?: string;
      examDate?: string;
      notes?: string;
      newFiles?: FileInput[];
      removeFilePaths?: string[];
    }) => {
      const res = await apiRequest("PATCH", `/api/health-exams/${id}`, data);
      return (await res.json()) as HealthExam;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: healthFollowUpKey(variables.childId) });
    },
  });
}

export function useDeleteHealthExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, childId }: { id: number; childId: number }) => {
      await apiRequest("DELETE", `/api/health-exams/${id}`);
      return { childId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: healthFollowUpKey(variables.childId) });
    },
  });
}

export async function getHealthExamFileUrl(
  examId: number,
  index: number = 0,
): Promise<string> {
  const res = await fetch(`/api/health-exams/${examId}/file-url?index=${index}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao obter URL do arquivo");
  const data = await res.json();
  return data.url;
}
