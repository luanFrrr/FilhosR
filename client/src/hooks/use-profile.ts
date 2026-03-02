import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageUtils";

type ProfileUpdateData = {
  displayFirstName?: string | null;
  displayLastName?: string | null;
};

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar perfil");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Perfil atualizado!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });
}

export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      // Comprimir imagem antes de enviar (max 600px, qualidade 0.85)
      const compressed = await compressImage(file, 600, 0.85);

      // Extrair base64 e mimeType
      const [header, base64] = compressed.split(",");
      const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";

      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ base64, mimeType }),
      });
      if (!res.ok) throw new Error("Erro ao fazer upload da foto");
      return res.json() as Promise<{ url: string; user: any }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Foto de perfil atualizada!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao enviar foto", description: err.message, variant: "destructive" });
    },
  });
}

// Helper: retorna o nome a exibir de um usuário, priorizando campos display_*
export function getDisplayName(user: {
  displayFirstName?: string | null;
  displayLastName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
} | null | undefined): string {
  if (!user) return "Usuário";
  const first = user.displayFirstName || user.firstName || "";
  const last = user.displayLastName || user.lastName || "";
  return [first, last].filter(Boolean).join(" ") || "Usuário";
}

export function getDisplayFirstName(user: {
  displayFirstName?: string | null;
  firstName?: string | null;
} | null | undefined): string {
  if (!user) return "Usuário";
  return user.displayFirstName || user.firstName || "Usuário";
}

export function getDisplayPhotoUrl(user: {
  displayPhotoUrl?: string | null;
  profileImageUrl?: string | null;
} | null | undefined): string | null {
  if (!user) return null;
  return user.displayPhotoUrl || user.profileImageUrl || null;
}
