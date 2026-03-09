type RetrospectiveFrame = {
  src: string;
};

type BuildRetrospectiveVideoOptions = {
  frames: RetrospectiveFrame[];
  frameDurationMs: number;
  width?: number;
  height?: number;
  onProgress?: (progress: number) => void;
};

const MIME_TYPES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function pickSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mimeType of MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return null;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
  const drawWidth = img.naturalWidth * scale;
  const drawHeight = img.naturalHeight * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  ctx.drawImage(img, x, y, drawWidth, drawHeight);
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const drawWidth = img.naturalWidth * scale;
  const drawHeight = img.naturalHeight * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  ctx.drawImage(img, x, y, drawWidth, drawHeight);
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.24;
  drawCover(ctx, image, width, height);
  ctx.restore();

  ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
  ctx.fillRect(0, 0, width, height);

  drawContain(ctx, image, width, height);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Nao foi possivel carregar imagem para video: ${src}`));
    img.src = src;
  });
}

export function isRetrospectiveVideoSupported() {
  return (
    typeof window !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!pickSupportedMimeType()
  );
}

export function getRetrospectiveFrameDurationMs(photoCount: number) {
  if (photoCount >= 25) return 260;
  if (photoCount >= 15) return 420;
  return 650;
}

export async function buildRetrospectiveVideo({
  frames,
  frameDurationMs,
  width = 720,
  height = 1280,
  onProgress,
}: BuildRetrospectiveVideoOptions) {
  if (frames.length === 0) {
    throw new Error("Nenhuma imagem para gerar video");
  }

  const mimeType = pickSupportedMimeType();
  if (!mimeType) {
    throw new Error("Seu navegador nao suporta geracao de video");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Nao foi possivel iniciar o renderizador de video");
  }

  const stream = canvas.captureStream(30);
  const chunks: BlobPart[] = [];

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
  });

  const stopPromise = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onerror = () =>
      reject(new Error("Falha ao gravar o video da retrospectiva"));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  recorder.start(150);

  try {
    for (let i = 0; i < frames.length; i += 1) {
      const image = await loadImage(frames[i].src);
      drawFrame(ctx, image, width, height);
      onProgress?.((i + 1) / frames.length);
      await wait(frameDurationMs);
    }
  } finally {
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  const blob = await stopPromise;
  stream.getTracks().forEach((track) => track.stop());

  const extension = mimeType.includes("webm") ? "webm" : "mp4";
  return new File([blob], `retrospectiva-${Date.now()}.${extension}`, {
    type: mimeType,
  });
}
