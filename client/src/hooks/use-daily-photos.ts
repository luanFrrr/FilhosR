import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import type { DailyPhoto } from "@shared/schema";

export function useDailyPhotos(childId: number) {
  return useQuery<DailyPhoto[]>({
    queryKey: [api.dailyPhotos.list.path, childId],
    queryFn: async () => {
      const url = buildUrl(api.dailyPhotos.list.path, { childId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch daily photos");
      return res.json();
    },
    enabled: !!childId,
  });
}

type DailyPhotosPage = {
  data: DailyPhoto[];
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export function useDailyPhotosPaged(childId: number, pageSize = 30) {
  return useInfiniteQuery({
    queryKey: [api.dailyPhotos.paged.path, childId, "cursor", pageSize],
    queryFn: async ({ pageParam = { cursor: null as string | null } }) => {
      const params = new URLSearchParams();
      params.set("pageSize", String(pageSize));
      if (pageParam.cursor) {
        params.set("cursor", pageParam.cursor);
      }
      const url = `${buildUrl(api.dailyPhotos.paged.path, { childId })}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch paged daily photos");
      return api.dailyPhotos.paged.responses[200].parse(
        (await res.json()) as DailyPhotosPage,
      );
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore && lastPage.nextCursor) {
        return { cursor: lastPage.nextCursor };
      }
      return undefined;
    },
    initialPageParam: { cursor: null as string | null },
    enabled: !!childId,
  });
}

export function useTodayPhoto(childId: number) {
  return useQuery<DailyPhoto | null>({
    queryKey: [api.dailyPhotos.today.path, childId],
    queryFn: async () => {
      const url = buildUrl(api.dailyPhotos.today.path, { childId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch today's photo");
      return res.json();
    },
    enabled: !!childId,
  });
}

export function useCreateDailyPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ childId, date, photoUrl }: { childId: number; date: string; photoUrl: string }) => {
      const url = buildUrl(api.dailyPhotos.create.path, { childId });
      const res = await apiRequest("POST", url, { date, photoUrl });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.dailyPhotos.list.path, variables.childId] });
      queryClient.invalidateQueries({ queryKey: [api.dailyPhotos.paged.path, variables.childId] });
      queryClient.invalidateQueries({ queryKey: [api.dailyPhotos.today.path, variables.childId] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification"] });
    },
  });
}

export function useDeleteDailyPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, childId }: { id: number; childId: number }) => {
      const url = buildUrl(api.dailyPhotos.delete.path, { id });
      await apiRequest("DELETE", url);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.dailyPhotos.list.path, variables.childId] });
      queryClient.invalidateQueries({ queryKey: [api.dailyPhotos.paged.path, variables.childId] });
      queryClient.invalidateQueries({ queryKey: [api.dailyPhotos.today.path, variables.childId] });
    },
  });
}
