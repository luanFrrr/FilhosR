/**
 * Utilitário de upload para Supabase Storage
 * Aceita base64 + mimeType, faz upload e retorna URL pública.
 * Se as variáveis SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não estiverem
 * configuradas, retorna a string base64 como data URL (fallback).
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type UploadBucket =
  | "profile-photos"
  | "child-photos"
  | "milestone-photos"
  | "daily-photos";

/**
 * Faz upload de uma imagem base64 para o Supabase Storage.
 * @param bucket  Nome do bucket (ex: "milestone-photos")
 * @param path    Caminho dentro do bucket (ex: "childId/milestoneId.jpg")
 * @param base64  String base64 da imagem (sem o prefixo data:...)
 * @param mimeType MIME type (ex: "image/jpeg")
 * @returns URL pública da imagem ou data URL como fallback
 */
export async function uploadToStorage(
  bucket: UploadBucket,
  path: string,
  base64: string,
  mimeType: string
): Promise<string> {
  // Fallback: sem Supabase configurado, retorna data URL
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return `data:${mimeType};base64,${base64}`;
  }

  const buffer = Buffer.from(base64, "base64");

  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": mimeType,
        "x-upsert": "true",
      },
      body: buffer,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Supabase Storage upload failed: ${errText}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Deleta um arquivo do Supabase Storage pela URL pública.
 * Silently fails se Storage não estiver configurado.
 */
export async function deleteFromStorage(publicUrl: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  if (!publicUrl.includes("/storage/v1/object/public/")) return;

  // Extrair bucket e path da URL
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return;

  const [, bucket, path] = match;

  await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
  }).catch(() => {}); // silent fail
}
