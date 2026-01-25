import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface PhotoViewProps {
  src: string | null;
  alt?: string;
  children: React.ReactNode;
  triggerClassName?: string;
}

export function PhotoView({ src, alt, children, triggerClassName }: PhotoViewProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!src) return <>{children}</>;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <DialogPrimitive.Trigger asChild>
        <button className={cn("focus:outline-none", triggerClassName)} data-testid="button-photo-trigger">
          {children}
        </button>
      </DialogPrimitive.Trigger>
      <AnimatePresence>
        {isOpen && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild>
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="relative w-full max-w-lg aspect-square"
                >
                  <img
                    src={src}
                    alt={alt || "Foto de perfil"}
                    className="w-full h-full object-contain rounded-lg shadow-2xl"
                  />
                  <DialogPrimitive.Close className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors focus:outline-none">
                    <X className="w-8 h-8" />
                    <span className="sr-only">Fechar</span>
                  </DialogPrimitive.Close>
                </motion.div>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
