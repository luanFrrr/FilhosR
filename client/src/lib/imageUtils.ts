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

/**
 * Transforma uma URL pública do Supabase Storage para utilizar a API de Image Transformations.
 * Isso permite redimensionar, cortar e otimizar imagens on-the-fly.
 * 
 * @param originalUrl URL original do Supabase Storage
 * @param options Opções de transformação (width, height, resize, quality)
 * @returns URL transformada ou a original se não for uma URL do Supabase suportada
 */
export function getTransformedImageUrl(
  originalUrl: string | null | undefined,
  options: {
    width?: number;
    height?: number;
    resize?: "cover" | "contain" | "fill";
    quality?: number;
  }
): string {
  if (!originalUrl) return "";

  // Verifica se é uma URL válida do Supabase Storage (formato esperado)
  // Exemplo: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
  const supabaseUrlPattern = /\/storage\/v1\/object\/public\/(.+)/;
  
  if (!supabaseUrlPattern.test(originalUrl)) {
    return originalUrl; // Não é uma URL que sabemos transformar
  }

  // Substitui /object/public/ por /render/image/public/
  const transformedBaseUrl = originalUrl.replace(
    /\/storage\/v1\/object\/public\//,
    "/storage/v1/render/image/public/"
  );

  // Constrói a query string com os parâmetros
  const params = new URLSearchParams();
  if (options.width) params.append("width", options.width.toString());
  if (options.height) params.append("height", options.height.toString());
  if (options.resize) params.append("resize", options.resize);
  if (options.quality) params.append("quality", options.quality.toString());

  const queryString = params.toString();
  if (!queryString) return originalUrl; // Nenhuma opção aplicada

  // Se a URL já tinha query string, junta com &, senão usa ?
  const separator = transformedBaseUrl.includes("?") ? "&" : "?";
  
  return `${transformedBaseUrl}${separator}${queryString}`;
}
