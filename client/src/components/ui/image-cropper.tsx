import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, X, RotateCw } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (croppedFile: File) => void;
  aspectRatio?: number;
  circularCrop?: boolean;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      { unit: "%", width: 80 },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

function rotateImageData(src: string, degrees: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      if (degrees === 90 || degrees === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.src = src;
  });
}

export function ImageCropper({
  imageSrc,
  open,
  onOpenChange,
  onCropComplete,
  aspectRatio = 1,
  circularCrop = true,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setDisplaySrc(imageSrc);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, [imageSrc]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerAspectCrop(width, height, aspectRatio);
    setCrop(initialCrop);
    const pixelWidth = (initialCrop.width / 100) * width;
    const pixelHeight = (initialCrop.height / 100) * height;
    const pixelX = (initialCrop.x / 100) * width;
    const pixelY = (initialCrop.y / 100) * height;
    setCompletedCrop({
      unit: "px",
      x: pixelX,
      y: pixelY,
      width: pixelWidth,
      height: pixelHeight,
    });
  }, [aspectRatio]);

  const handleRotate = useCallback(async () => {
    if (!displaySrc) return;
    const rotated = await rotateImageData(displaySrc, 90);
    setDisplaySrc(rotated);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, [displaySrc]);

  const getCroppedImage = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return;

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCrop = {
      x: completedCrop.x * scaleX,
      y: completedCrop.y * scaleY,
      width: completedCrop.width * scaleX,
      height: completedCrop.height * scaleY,
    };

    const outputSize = Math.min(pixelCrop.width, pixelCrop.height, 800);
    canvas.width = outputSize;
    canvas.height = outputSize;

    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      image,
      pixelCrop.x, pixelCrop.y,
      pixelCrop.width, pixelCrop.height,
      0, 0,
      outputSize, outputSize,
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "cropped-photo.jpg", { type: "image/jpeg" });
          onCropComplete(file);
          onOpenChange(false);
        }
      },
      "image/jpeg",
      0.9,
    );
  }, [completedCrop, onCropComplete, onOpenChange]);

  if (!displaySrc) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        setCrop(undefined);
        setCompletedCrop(undefined);
      }
      onOpenChange(o);
    }}>
      <DialogContent className="max-w-sm p-4 rounded-2xl">
        <DialogTitle className="text-center text-sm font-semibold">
          Ajustar foto
        </DialogTitle>
        <div className="flex flex-col items-center gap-3">
          <div className="w-full max-h-[60vh] overflow-hidden rounded-xl bg-muted/30 flex items-center justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              circularCrop={circularCrop}
              className="max-h-[60vh]"
            >
              <img
                ref={imgRef}
                src={displaySrc}
                alt="Foto para cortar"
                onLoad={onImageLoad}
                style={{
                  maxHeight: "60vh",
                  maxWidth: "100%",
                }}
                data-testid="img-crop-preview"
              />
            </ReactCrop>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={handleRotate}
            data-testid="button-rotate-photo"
          >
            <RotateCw className="w-4 h-4" /> Girar
          </Button>
        </div>
        <DialogFooter className="flex-row gap-2 sm:justify-center">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-crop"
          >
            <X className="w-4 h-4" /> Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1 gap-2"
            onClick={getCroppedImage}
            disabled={!completedCrop}
            data-testid="button-confirm-crop"
          >
            <Check className="w-4 h-4" /> Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
