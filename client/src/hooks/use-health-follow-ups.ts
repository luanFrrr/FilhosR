import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type {
  DevelopmentMilestone,
  HealthExam,
  HealthFollowUp,
  HealthFollowUpWithRelations,
  NeonatalScreening,
} from "@shared/schema";

type HealthFollowUpFilters = {
  startDate?: string;
  endDate?: string;
  category?: string;
  limit?: number;
};

type HealthFollowUpStructure = {
  neonatal: HealthFollowUpWithRelations | null;
  development: HealthFollowUpWithRelations[];
};

type HealthFollowUpsPage = {
  data: HealthFollowUpWithRelations[];
  nextCursor: string | null;
  totalCount: number;
};

interface FileInput {
  fileBase64: string;
  fileMimeType: string;
  fileName: string;
}

export async function signHealthExamUploads(
  childId: number,
  files: Array<{ fileName: string; fileMimeType: string }>,
): Promise<Array<{ path: string; token: string; signedUrl: string }>> {
  const res = await apiRequest(
    "POST",
    `/api/children/${childId}/health-exam-uploads/sign`,
    { files },
  );
  const data = (await res.json()) as {
    uploads: Array<{ path: string; token: string; signedUrl: string }>;
  };
  return data.uploads;
}

export async function cleanupHealthExamUploads(
  childId: number,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  await apiRequest("POST", `/api/children/${childId}/health-exam-uploads/cleanup`, {
    paths,
  });
}

const healthFollowUpBaseKey = (childId: number) => [
  "/api/children",
  childId,
  "health-follow-ups",
] as const;

const healthFollowUpStructureKey = (childId: number) => [
  ...healthFollowUpBaseKey(childId),
  "structure",
] as const;

const healthFollowUpTimelineBaseKey = (childId: number) => [
  ...healthFollowUpBaseKey(childId),
  "timeline",
] as const;

const healthFollowUpTimelineKey = (
  childId: number,
  filters?: HealthFollowUpFilters,
) =>
    [
      ...healthFollowUpTimelineBaseKey(childId),
      filters?.startDate ?? "",
      filters?.endDate ?? "",
      filters?.category ?? "",
      filters?.limit ?? 20,
    ] as const;

function compareFollowUps(
  left: Pick<HealthFollowUpWithRelations, "followUpDate" | "id">,
  right: Pick<HealthFollowUpWithRelations, "followUpDate" | "id">,
) {
  const dateDiff =
    new Date(right.followUpDate).getTime() - new Date(left.followUpDate).getTime();
  if (dateDiff !== 0) return dateDiff;
  return right.id - left.id;
}

function compareExams(
  left: Pick<HealthExam, "examDate" | "id">,
  right: Pick<HealthExam, "examDate" | "id">,
) {
  const dateDiff =
    new Date(right.examDate).getTime() - new Date(left.examDate).getTime();
  if (dateDiff !== 0) return dateDiff;
  return right.id - left.id;
}

function matchesTimelineFilters(
  followUp: Pick<HealthFollowUpWithRelations, "category" | "followUpDate">,
  filters?: HealthFollowUpFilters,
) {
  const matchesCategory =
    !filters?.category || filters.category === followUp.category;
  const matchesStartDate =
    !filters?.startDate || followUp.followUpDate >= filters.startDate;
  const matchesEndDate =
    !filters?.endDate || followUp.followUpDate <= filters.endDate;

  return matchesCategory && matchesStartDate && matchesEndDate;
}

function updateTimelineCache(
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

function insertTimelineFollowUp(
  previous:
    | InfiniteData<HealthFollowUpsPage, string | undefined>
    | undefined,
  followUp: HealthFollowUpWithRelations,
) {
  if (!previous) return previous;

  if (previous.pages.length === 0) {
    return {
      pageParams: previous.pageParams,
      pages: [{ data: [followUp], nextCursor: null, totalCount: 1 }],
    };
  }

  return {
    ...previous,
    pages: previous.pages.map((page, index) =>
      index === 0
        ? {
            ...page,
            totalCount: page.totalCount + 1,
            data: [...page.data, followUp].sort(compareFollowUps),
          }
        : { ...page, totalCount: page.totalCount + 1 },
    ),
  };
}

function removeTimelineFollowUp(
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
      totalCount: Math.max(0, page.totalCount - 1),
      data: page.data.filter((followUp) => followUp.id !== id),
    })),
  };
}

function updateTimelineExam(
  previous:
    | InfiniteData<HealthFollowUpsPage, string | undefined>
    | undefined,
  followUpId: number,
  updater: (exams: HealthExam[]) => HealthExam[],
) {
  if (!previous) return previous;

  return {
    ...previous,
    pages: previous.pages.map((page) => ({
      ...page,
      data: page.data.map((followUp) =>
        followUp.id === followUpId
          ? {
              ...followUp,
              healthExams: updater(followUp.healthExams).sort(compareExams),
            }
          : followUp,
      ),
    })),
  };
}

function updateStructureCache(
  previous: HealthFollowUpStructure | undefined,
  updater: (followUp: HealthFollowUpWithRelations) => HealthFollowUpWithRelations,
) {
  if (!previous) return previous;

  return {
    neonatal: previous.neonatal ? updater(previous.neonatal) : null,
    development: previous.development.map(updater),
  };
}

export function useHealthFollowUpStructure(childId: number) {
  return useQuery<HealthFollowUpStructure>({
    queryKey: healthFollowUpStructureKey(childId),
    queryFn: async () => {
      const res = await fetch(
        `/api/children/${childId}/health-follow-ups/structure`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Erro ao carregar estrutura de acompanhamento");
      return res.json();
    },
    enabled: childId > 0,
  });
}

export function useHealthFollowUps(
  childId: number,
  filters?: HealthFollowUpFilters,
) {
  return useInfiniteQuery<HealthFollowUpsPage>({
    queryKey: healthFollowUpTimelineKey(childId, filters),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("limit", String(filters?.limit ?? 20));
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
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateHealthFollowUp(filters?: HealthFollowUpFilters) {
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
      const scopedQueryKey = healthFollowUpTimelineKey(variables.childId, filters);
      await queryClient.cancelQueries({
        queryKey: healthFollowUpTimelineBaseKey(variables.childId),
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

      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(scopedQueryKey, (current) =>
        matchesTimelineFilters(optimisticFollowUp, filters)
          ? insertTimelineFollowUp(current, optimisticFollowUp)
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
      >(healthFollowUpTimelineKey(variables.childId, filters), (current) => {
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
        queryKey: healthFollowUpTimelineBaseKey(variables.childId),
      });
    },
  });
}

export function useUpdateHealthFollowUp(filters?: HealthFollowUpFilters) {
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
      const queryKey = healthFollowUpTimelineKey(variables.childId, filters);
      await queryClient.cancelQueries({
        queryKey: healthFollowUpTimelineBaseKey(variables.childId),
      });

      const previous = queryClient.getQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(queryKey);

      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(queryKey, (current) => {
        if (!current) return current;

        const existing = current.pages
          .flatMap((page) => page.data)
          .find((followUp) => followUp.id === variables.id);

        if (!existing) return current;

        const updatedCandidate: HealthFollowUpWithRelations = {
          ...existing,
          category: variables.category ?? existing.category,
          title: variables.title ?? existing.title,
          description:
            variables.description !== undefined
              ? variables.description ?? null
              : existing.description,
          followUpDate: variables.followUpDate ?? existing.followUpDate,
        };

        if (!matchesTimelineFilters(updatedCandidate, filters)) {
          return removeTimelineFollowUp(current, variables.id);
        }

        return updateTimelineCache(current, (followUp) =>
          followUp.id === variables.id ? updatedCandidate : followUp,
        );
      });

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
      >(healthFollowUpTimelineKey(variables.childId, filters), (current) => {
        if (!current) return current;

        const existing = current.pages
          .flatMap((page) => page.data)
          .find((followUp) => followUp.id === variables.id);

        if (!existing) return current;

        const hydrated: HealthFollowUpWithRelations = {
          ...existing,
          ...data,
        };

        if (!matchesTimelineFilters(hydrated, filters)) {
          return removeTimelineFollowUp(current, variables.id);
        }

        return updateTimelineCache(current, (followUp) =>
          followUp.id === variables.id ? hydrated : followUp,
        );
      });

      queryClient.invalidateQueries({
        queryKey: healthFollowUpTimelineBaseKey(variables.childId),
      });
    },
  });
}

export function useDeleteHealthFollowUp(filters?: HealthFollowUpFilters) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, childId }: { id: number; childId: number }) => {
      await apiRequest("DELETE", `/api/health-follow-ups/${id}`);
      return { id, childId };
    },
    onMutate: async (variables) => {
      const queryKey = healthFollowUpTimelineKey(variables.childId, filters);
      await queryClient.cancelQueries({
        queryKey: healthFollowUpTimelineBaseKey(variables.childId),
      });

      const previous = queryClient.getQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(queryKey);

      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(queryKey, (current) => removeTimelineFollowUp(current, variables.id));

      return { previous, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: healthFollowUpTimelineBaseKey(variables.childId),
      });
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
      const queryKey = healthFollowUpStructureKey(variables.childId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<HealthFollowUpStructure>(queryKey);

      queryClient.setQueryData<HealthFollowUpStructure>(queryKey, (current) =>
        updateStructureCache(current, (followUp) => {
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
      queryClient.setQueryData<HealthFollowUpStructure>(
        healthFollowUpStructureKey(variables.childId),
        (current) =>
          updateStructureCache(current, (followUp) => {
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
      const queryKey = healthFollowUpStructureKey(variables.childId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<HealthFollowUpStructure>(queryKey);

      queryClient.setQueryData<HealthFollowUpStructure>(queryKey, (current) =>
        updateStructureCache(current, (followUp) => {
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
      queryClient.setQueryData<HealthFollowUpStructure>(
        healthFollowUpStructureKey(variables.childId),
        (current) =>
          updateStructureCache(current, (followUp) => {
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

export function useCreateHealthExam(filters?: HealthFollowUpFilters) {
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
      uploadedFilePaths?: string[];
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/health-follow-ups/${followUpId}/exams`,
        data,
      );
      return (await res.json()) as HealthExam;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(healthFollowUpTimelineKey(variables.childId, filters), (current) =>
        updateTimelineExam(current, variables.followUpId, (exams) => [...exams, data]),
      );
    },
  });
}

export function useUpdateHealthExam(filters?: HealthFollowUpFilters) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      childId,
      followUpId,
      ...data
    }: {
      id: number;
      childId: number;
      followUpId: number;
      title?: string;
      examDate?: string;
      notes?: string;
      newFiles?: FileInput[];
      removeFilePaths?: string[];
      newFilePaths?: string[];
    }) => {
      const res = await apiRequest("PATCH", `/api/health-exams/${id}`, data);
      return (await res.json()) as HealthExam;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(healthFollowUpTimelineKey(variables.childId, filters), (current) =>
        updateTimelineExam(current, variables.followUpId, (exams) =>
          exams.map((exam) => (exam.id === data.id ? data : exam)),
        ),
      );
    },
  });
}

export function useDeleteHealthExam(filters?: HealthFollowUpFilters) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      childId,
      followUpId,
    }: {
      id: number;
      childId: number;
      followUpId: number;
    }) => {
      await apiRequest("DELETE", `/api/health-exams/${id}`);
      return { id, childId, followUpId };
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueryData<
        InfiniteData<HealthFollowUpsPage, string | undefined>
      >(healthFollowUpTimelineKey(variables.childId, filters), (current) =>
        updateTimelineExam(current, variables.followUpId, (exams) =>
          exams.filter((exam) => exam.id !== variables.id),
        ),
      );
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
