import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { MedicalRecord } from "@shared/schema";

export function useMedicalRecords(childId: number) {
  return useQuery<{ data: MedicalRecord[]; nextCursor: string | null }>({
    queryKey: ["/api/children", childId, "medical-records"],
    queryFn: async () => {
      const res = await fetch(`/api/children/${childId}/medical-records`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao carregar registros");
      return res.json();
    },
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
