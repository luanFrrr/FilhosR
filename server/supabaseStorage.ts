import sharp from "sharp";

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
  | "daily-photos"
  | "vaccine-photos";

/**
 * Faz upload de uma imagem base64 para o Supabase Storage redimensionando para
 * _original (max 1200px na real, pois frontend envia comprimido), _feed (800) e _thumb (300).
 * @param bucket  Nome do bucket (ex: "milestone-photos")
 * @param path    Caminho dentro do bucket (ex: "childId/milestoneId.jpg")
 * @param base64  String base64 da imagem (sem o prefixo data:...)
 * @param mimeType MIME type (ex: "image/jpeg")
 * @returns URL pública da imagem _original ou data URL como fallback
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

  // Helper para upload único
  const uploadSingle = async (uploadPath: string, uploadBuffer: Uint8Array) => {
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${uploadPath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": mimeType,
          "x-upsert": "true",
        },
        body: uploadBuffer as any,
      }
    );
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Supabase Storage upload failed for ${uploadPath}: ${errText}`);
    }
  };

  const isImage = mimeType.startsWith("image/") && !mimeType.includes("svg") && !mimeType.includes("gif");

  if (!isImage) {
    await uploadSingle(path, buffer);
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  }

  // Parse filename to append _original, _feed, _thumb
  const lastDotIdx = path.lastIndexOf(".");
  let basePath = path;
  let ext = "";
  if (lastDotIdx !== -1 && lastDotIdx > path.lastIndexOf("/")) {
    basePath = path.substring(0, lastDotIdx);
    ext = path.substring(lastDotIdx);
  } else {
    ext = mimeType === "image/png" ? ".png" : (mimeType === "image/webp" ? ".webp" : ".jpg");
  }

  const originalPath = `${basePath}_original${ext}`;
  const feedPath = `${basePath}_feed${ext}`;
  const thumbPath = `${basePath}_thumb${ext}`;

  let originalBuffer: Uint8Array = buffer;
  let feedBuffer: Uint8Array = buffer;
  let thumbBuffer: Uint8Array = buffer;

  try {
    const img = sharp(buffer);
    const metadata = await img.metadata();
    const width = metadata.width || 0;

    if (width > 800) {
      feedBuffer = new Uint8Array(await img.clone().resize({ width: 800, withoutEnlargement: true }).toBuffer());
    }
    if (width > 300) {
      thumbBuffer = new Uint8Array(await img.clone().resize({ width: 300, withoutEnlargement: true }).toBuffer());
    }
  } catch (err) {
    console.error("Error generating thumbnails using sharp:", err);
    // Keep buffers as original if sharp fails
  }

  // Upload concurrently
  await Promise.all([
    uploadSingle(originalPath, originalBuffer),
    uploadSingle(feedPath, feedBuffer),
    uploadSingle(thumbPath, thumbBuffer),
  ]);

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${originalPath}`;
}

/**
 * Deleta um arquivo do Supabase Storage pela URL pública.
 * Limpa tamém as variantes _feed e _thumb se o arquivo for o _original.
 * Silently fails se Storage não estiver configurado.
 */
export async function deleteFromStorage(publicUrl: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  if (!publicUrl.includes("/storage/v1/object/public/")) return;

  // Extrair bucket e path da URL
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return;

  const [, bucket, path] = match;

  const deleteSingle = async (delPath: string) => {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${delPath}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
    }).catch(() => {}); // silent fail
  };

  await deleteSingle(path);

  if (path.includes("_original.")) {
    const feedPath = path.replace("_original.", "_feed.");
    const thumbPath = path.replace("_original.", "_thumb.");
    await Promise.all([deleteSingle(feedPath), deleteSingle(thumbPath)]);
  }
}
