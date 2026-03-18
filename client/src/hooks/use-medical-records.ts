import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { MedicalRecord } from "@shared/schema";

export function useMedicalRecords(
  childId: number,
  filters?: { startDate?: string; endDate?: string },
) {
  return useInfiniteQuery<{ data: MedicalRecord[]; nextCursor: string | null }>({
    queryKey: ["/api/children", childId, "medical-records", filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam as string);
      params.set("limit", "20");
      if (filters?.startDate) params.set("startDate", filters.startDate);
      if (filters?.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/children/${childId}/medical-records?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao carregar registros");
      return res.json();
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: childId > 0,
  });
}

interface CreateMedicalRecordInput {
  childId: number;
  type: string;
  title: string;
  description?: string;
  examDate: string;
  fileBase64?: string;
  fileMimeType?: string;
  fileName?: string;
}

export function useCreateMedicalRecord() {
  return useMutation({
    mutationFn: async (input: CreateMedicalRecordInput) => {
      const res = await apiRequest(
        "POST",
        `/api/children/${input.childId}/medical-records`,
        {
          type: input.type,
          title: input.title,
          description: input.description,
          examDate: input.examDate,
          fileBase64: input.fileBase64,
          fileMimeType: input.fileMimeType,
          fileName: input.fileName,
        },
      );
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/children", variables.childId, "medical-records"],
      });
    },
  });
}

interface UpdateMedicalRecordInput extends Partial<CreateMedicalRecordInput> {
  id: number;
  childId: number;
  removeFile?: boolean;
}

export function useUpdateMedicalRecord() {
  return useMutation({
    mutationFn: async (input: UpdateMedicalRecordInput) => {
      const payload: Record<string, any> = {};
      if (input.type) payload.type = input.type;
      if (input.title) payload.title = input.title;
      if (input.description !== undefined) payload.description = input.description;
      if (input.examDate) payload.examDate = input.examDate;
      if (input.removeFile) {
        payload.removeFile = true;
      } else if (input.fileBase64) {
        payload.fileBase64 = input.fileBase64;
        payload.fileMimeType = input.fileMimeType;
        payload.fileName = input.fileName;
      }

      const res = await apiRequest(
        "PATCH",
        `/api/medical-records/${input.id}`,
        payload,
      );
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/children", variables.childId, "medical-records"],
      });
    },
  });
}

export function useDeleteMedicalRecord() {
  return useMutation({
    mutationFn: async ({ id, childId }: { id: number; childId: number }) => {
      await apiRequest("DELETE", `/api/medical-records/${id}`);
      return { childId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/children", variables.childId, "medical-records"],
      });
    },
  });
}

export async function getMedicalFileUrl(recordId: number): Promise<string> {
  const res = await fetch(`/api/medical-records/${recordId}/file-url`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao obter URL do arquivo");
  const data = await res.json();
  return data.url;
}
