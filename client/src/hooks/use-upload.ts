import { compressImage } from "@/lib/imageUtils";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useState } from "react";

export type UploadBucket =
  | "profile-photos"
  | "child-photos"
  | "milestone-photos"
  | "daily-photos"
  | "vaccine-photos";

interface UploadOptions {
  bucket: UploadBucket;
  /** Caminho dentro do bucket, ex: "42/photo.jpg" */
  path: string;
  /** Max px do lado maior. Default: 1200 */
  maxSize?: number;
  /** Qualidade 0-1. Default: 0.85 */
  quality?: number;
}

/**
 * Upload de imagem para o Supabase Storage via /api/upload.
 * Retorna a URL pública da imagem.
 */
export async function uploadImage(file: File, opts: UploadOptions): Promise<string> {
  const maxPx = opts.maxSize ?? 1200;
  const quality = opts.quality ?? 0.85;

  const compressed = await compressImage(file, maxPx, quality);
  const [header, base64] = compressed.split(",");
  const mimeType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ base64, mimeType, bucket: opts.bucket, path: opts.path }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Erro desconhecido" }));
    throw new Error(err.message ?? "Erro ao fazer upload");
  }

  const data = await res.json();
  return data.url as string;
}

/**
 * Hook utilitário para upload com estado de loading e toast de erro.
 */
export function useUpload() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (file: File, opts: UploadOptions): Promise<string | null> => {
      if (file.size > 15 * 1024 * 1024) {
        toast({
          title: "Imagem muito grande",
          description: "Escolha uma imagem menor que 15MB",
          variant: "destructive",
        });
        return null;
      }
      setIsUploading(true);
      try {
        const url = await uploadImage(file, opts);
        return url;
      } catch (err: any) {
        toast({
          title: "Erro ao enviar foto",
          description: err.message ?? "Tente novamente",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [toast]
  );

  return { upload, isUploading };
}
