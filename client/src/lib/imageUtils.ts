/**
 * Utilitários para manipulação de imagens, especialmente integração com
 * as transformações on-the-fly do Supabase Storage.
 */

/**
 * Gera uma URL de imagem transformada usando o serviço de renderização do Supabase.
 * @param originalUrl A URL pública original da imagem no Supabase Storage
 * @param options Opções de transformação (width, height, resize, quality)
 * @returns A URL transformada ou a original se não for uma URL do Supabase
 */
export function getTransformedImageUrl(
  originalUrl: string | null | undefined,
  options: {
    width?: number;
    height?: number;
    resize?: 'cover' | 'contain' | 'fill';
    quality?: number;
  } = {}
): string {
  if (!originalUrl) return "";
  
  // Verifica se é uma URL do Supabase Storage
  // Exemplo: https://[project-id].supabase.co/storage/v1/object/public/[bucket]/[path]
  if (!originalUrl.includes(".supabase.co/storage/v1/object/public/")) {
    return originalUrl;
  }

  const { width, height, resize = 'cover', quality = 80 } = options;
  
  // A transformação do Supabase usa /render/image/public/ em vez de /object/public/
  let transformedUrl = originalUrl.replace("/object/public/", "/render/image/public/");
  
  const params = new URLSearchParams();
  if (width) params.append("width", width.toString());
  if (height) params.append("height", height.toString());
  if (resize) params.append("resize", resize);
  if (quality) params.append("quality", quality.toString());
  
  const queryString = params.toString();
  return queryString ? `${transformedUrl}?${queryString}` : transformedUrl;
}

export async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
