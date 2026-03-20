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

const healthFollowUpBaseKey = (childId: number) => [
  "/api/children",
  childId,
  "health-follow-ups",
] as const;

const healthFollowUpKey = (
  childId: number,
  filters?: {
    startDate?: string;
    endDate?: string;
    category?: string;
  },
) =>
  [
    ...healthFollowUpBaseKey(childId),
    filters?.startDate ?? "",
    filters?.endDate ?? "",
    filters?.category ?? "",
  ] as const;

type HealthFollowUpsPage = {
  data: HealthFollowUpWithRelations[];
  nextCursor: string | null;
};

function compareFollowUps(
  left: Pick<HealthFollowUpWithRelations, "followUpDate" | "id">,
  right: Pick<HealthFollowUpWithRelations, "followUpDate" | "id">,
) {
  const dateDiff =
    new Date(right.followUpDate).getTime() - new Date(left.followUpDate).getTime();
  if (dateDiff !== 0) return dateDiff;
  return right.id - left.id;
}

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

function insertHealthFollowUpIntoCache(
  previous:
    | InfiniteData<HealthFollowUpsPage, string | undefined>
    | undefined,
  followUp: HealthFollowUpWithRelations,
) {
  if (!previous) return previous;

  if (previous.pages.length === 0) {
    return {
      pageParams: previous.pageParams,
      pages: [{ data: [followUp], nextCursor: null }],
    };
  }

  return {
    ...previous,
    pages: previous.pages.map((page, index) =>
      index === 0
        ? {
            ...page,
            data: [...page.data, followUp].sort(compareFollowUps),
          }
        : page,
    ),
  };
}

function removeHealthFollowUpFromCache(
  previous:
    | InfiniteData<HealthFollowUpsPage, string | undefined>
    | undefined,
  id: number,
) {
  if (!previous) return previous;

  return {
    ...previous,
    pages: previous.pages.map((page) => ({
      ...page,
      data: page.data.filter((followUp) => followUp.id !== id),
    })),
  };
}

export function useHealthFollowUps(
  childId: number,
  filters?: {
    startDate?: string;
    endDate?: string;
    category?: string;
  },
) {
  return useInfiniteQuery<HealthFollowUpsPage>({
    queryKey: healthFollowUpKey(childId, filters),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (pageParam) params.set("cursor", pageParam as string);
      if (filters?.startDate) params.set("startDate", filters.startDate);
      if (filters?.endDate) params.set("endDate", filters.endDate);
      if (filters?.category) params.set("category", filters.category);

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

export function useCreateHealthFollowUp(filters?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}) {
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
    onMutate: async (variables) => {
      const scopedQueryKey = healthFollowUpKey(variables.childId, filters);
      await queryClient.cancelQueries({
        queryKey: healthFollowUpBaseKey(variables.childId),
      });

      const previous = queryClient.getQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(scopedQueryKey);

      const optimisticFollowUp: HealthFollowUpWithRelations = {
        id: -Date.now(),
        childId: variables.childId,
        createdBy: null,
        category: variables.category,
        title: variables.title,
        description: variables.description ?? null,
        followUpDate: variables.followUpDate,
        sourceType: null,
        sourceId: null,
        createdAt: new Date(),
        neonatalScreenings: [],
        developmentMilestones: [],
        healthExams: [],
      };

      const matchesCategory =
        !filters?.category || filters.category === variables.category;
      const matchesStartDate =
        !filters?.startDate || variables.followUpDate >= filters.startDate;
      const matchesEndDate =
        !filters?.endDate || variables.followUpDate <= filters.endDate;
      const shouldInsert =
        matchesCategory && matchesStartDate && matchesEndDate;

      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(scopedQueryKey, (current) =>
        shouldInsert
          ? insertHealthFollowUpIntoCache(current, optimisticFollowUp)
          : current,
      );

      return {
        previous,
        queryKey: scopedQueryKey,
        optimisticId: optimisticFollowUp.id,
      };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSuccess: (data, variables, context) => {
      const hydrated: HealthFollowUpWithRelations = {
        ...data,
        neonatalScreenings: [],
        developmentMilestones: [],
        healthExams: [],
      };

      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(healthFollowUpKey(variables.childId, filters), (current) => {
        if (!current) return current;

        return {
          ...current,
          pages: current.pages.map((page, index) =>
            index === 0
              ? {
                  ...page,
                  data: page.data
                    .map((followUp) =>
                      followUp.id === context?.optimisticId ? hydrated : followUp,
                    )
                    .sort(compareFollowUps),
                }
              : page,
          ),
        };
      });
      queryClient.invalidateQueries({
        queryKey: healthFollowUpBaseKey(variables.childId),
      });
    },
  });
}

export function useUpdateHealthFollowUp(filters?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}) {
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
    onMutate: async (variables) => {
      const baseQueryKey = healthFollowUpBaseKey(variables.childId);
      const queryKey = healthFollowUpKey(variables.childId, filters);
      await queryClient.cancelQueries({ queryKey: baseQueryKey });

      const previous = queryClient.getQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(queryKey);

      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(queryKey, (current) =>
        updateHealthFollowUpsCache(current, (followUp) =>
          followUp.id === variables.id
            ? {
                ...followUp,
                category: variables.category ?? followUp.category,
                title: variables.title ?? followUp.title,
                description:
                  variables.description !== undefined
                    ? variables.description ?? null
                    : followUp.description,
                followUpDate: variables.followUpDate ?? followUp.followUpDate,
              }
            : followUp,
        ),
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
      >(healthFollowUpKey(variables.childId, filters), (current) =>
        updateHealthFollowUpsCache(current, (followUp) =>
          followUp.id === variables.id ? { ...followUp, ...data } : followUp,
        ),
      );
      queryClient.invalidateQueries({
        queryKey: healthFollowUpBaseKey(variables.childId),
      });
    },
  });
}

export function useDeleteHealthFollowUp(filters?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, childId }: { id: number; childId: number }) => {
      await apiRequest("DELETE", `/api/health-follow-ups/${id}`);
      return { id, childId };
    },
    onMutate: async (variables) => {
      const baseQueryKey = healthFollowUpBaseKey(variables.childId);
      const queryKey = healthFollowUpKey(variables.childId, filters);
      await queryClient.cancelQueries({ queryKey: baseQueryKey });

      const previous = queryClient.getQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(queryKey);

      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(queryKey, (current) =>
        removeHealthFollowUpFromCache(current, variables.id),
      );

      return { previous, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: healthFollowUpBaseKey(variables.childId),
      });
    },
  });
}

export function useUpdateNeonatalScreening(filters?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}) {
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
      const scopedQueryKey = healthFollowUpKey(variables.childId, filters);
      await queryClient.cancelQueries({
        queryKey: healthFollowUpBaseKey(variables.childId),
      });

      const previous = queryClient.getQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(scopedQueryKey);

      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(scopedQueryKey, (current) =>
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

      return { previous, queryKey: scopedQueryKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(healthFollowUpKey(variables.childId, filters), (current) =>
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
      queryClient.invalidateQueries({
        queryKey: healthFollowUpBaseKey(variables.childId),
      });
    },
  });
}

export function useUpdateDevelopmentMilestone(filters?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}) {
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
      const scopedQueryKey = healthFollowUpKey(variables.childId, filters);
      await queryClient.cancelQueries({
        queryKey: healthFollowUpBaseKey(variables.childId),
      });

      const previous = queryClient.getQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(scopedQueryKey);

      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(scopedQueryKey, (current) =>
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

      return { previous, queryKey: scopedQueryKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(healthFollowUpKey(variables.childId, filters), (current) =>
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
      queryClient.invalidateQueries({
        queryKey: healthFollowUpBaseKey(variables.childId),
      });
    },
  });
}

interface FileInput {
  fileBase64: string;
  fileMimeType: string;
  fileName: string;
}

export function useCreateHealthExam(filters?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}) {
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
      queryClient.invalidateQueries({
        queryKey: healthFollowUpBaseKey(variables.childId),
      });
    },
  });
}

export function useUpdateHealthExam(filters?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}) {
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
      queryClient.invalidateQueries({
        queryKey: healthFollowUpBaseKey(variables.childId),
      });
    },
  });
}

export function useDeleteHealthExam(filters?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, childId }: { id: number; childId: number }) => {
      await apiRequest("DELETE", `/api/health-exams/${id}`);
      return { childId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: healthFollowUpBaseKey(variables.childId),
      });
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
