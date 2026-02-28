import { useRef, useState, useCallback } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { ImageCropper } from "@/components/ui/image-cropper";

interface PhotoPickerProps {
  onPhotoSelected: (file: File) => void;
  children: (openPicker: () => void) => React.ReactNode;
  enableCrop?: boolean;
}

export function PhotoPicker({ onPhotoSelected, children, enableCrop = true }: PhotoPickerProps) {
  const [open, setOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const openPicker = useCallback(() => {
    setOpen(true);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (enableCrop) {
          const reader = new FileReader();
          reader.onload = () => {
            setCropSrc(reader.result as string);
            setCropOpen(true);
          };
          reader.readAsDataURL(file);
        } else {
          onPhotoSelected(file);
        }
      }
      e.target.value = "";
      setOpen(false);
    },
    [onPhotoSelected, enableCrop]
  );

  const handleCropComplete = useCallback(
    (croppedFile: File) => {
      onPhotoSelected(croppedFile);
      setCropSrc(null);
    },
    [onPhotoSelected]
  );

  return (
    <>
      {children(openPicker)}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-camera-capture"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-gallery-select"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[280px] rounded-2xl p-6">
          <VisuallyHidden.Root>
            <DialogTitle>Escolher foto</DialogTitle>
          </VisuallyHidden.Root>
          <div className="flex flex-col gap-3">
            <p className="text-center text-sm font-medium text-foreground mb-1">
              Como deseja adicionar a foto?
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-auto justify-start gap-3 p-4 rounded-xl"
              onClick={() => {
                setOpen(false);
                setTimeout(() => cameraInputRef.current?.click(), 100);
              }}
              data-testid="button-pick-camera"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Câmera</p>
                <p className="text-xs text-muted-foreground font-normal">Tirar uma foto agora</p>
              </div>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto justify-start gap-3 p-4 rounded-xl"
              onClick={() => {
                setOpen(false);
                setTimeout(() => galleryInputRef.current?.click(), 100);
              }}
              data-testid="button-pick-gallery"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <ImagePlus className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Galeria</p>
                <p className="text-xs text-muted-foreground font-normal">Escolher da galeria de fotos</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCropper
        imageSrc={cropSrc}
        open={cropOpen}
        onOpenChange={(o) => {
          setCropOpen(o);
          if (!o) setCropSrc(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
