import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDiaryLikes, useToggleDiaryLike, useDiaryLikers } from "@/hooks/use-social";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DiaryLikeButtonProps {
  entryId: number;
  childId: number;
  size?: "sm" | "md";
  className?: string;
  initialCount?: number;
  initialLiked?: boolean;
}

function LikersList({ childId, entryId }: { childId: number; entryId: number }) {
  const { data: likers, isLoading } = useDiaryLikers(childId, entryId);

  if (isLoading) return <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>;
  if (!likers?.length) return <div className="p-4 text-center text-sm text-muted-foreground">Ninguém curtiu ainda.</div>;

  return (
    <div className="flex flex-col gap-3 py-2 max-h-[60vh] overflow-y-auto">
      {likers.map((user) => {
        const name = user.displayFirstName || user.firstName || "Usuário";
        const lastName = user.displayLastName || user.lastName || "";
        const photo = user.displayPhotoUrl || user.profileImageUrl;
        return (
          <div key={user.id} className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={photo || undefined} />
              <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{name} {lastName}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DiaryLikeButton({ 
  entryId, 
  childId, 
  size = "md", 
  className,
  initialCount = 0,
  initialLiked = false
}: DiaryLikeButtonProps) {
  const { data: likeStatus } = useDiaryLikes(childId, entryId);
  const toggle = useToggleDiaryLike(childId, entryId);

  // Usa o valor do cache/realtime ou o fallback inicial (vindo da paginação)
  const count = likeStatus?.count ?? initialCount;
  const liked = likeStatus?.userLiked ?? initialLiked;

  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "flex items-center gap-0 rounded-full transition-all duration-200",
        liked
          ? "bg-rose-50 text-rose-500"
          : "bg-muted/60 text-muted-foreground",
        className,
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggle.mutate();
        }}
        disabled={toggle.isPending}
        className={cn(
          "flex items-center gap-1 hover:opacity-70 transition-opacity",
          isSmall ? "py-1 pl-2 text-xs" : "py-1.5 pl-3 text-sm",
          count === 0 ? (isSmall ? "pr-2" : "pr-3") : (isSmall ? "pr-1" : "pr-1.5")
        )}
        aria-label={liked ? "Remover like" : "Curtir"}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={liked ? "liked" : "unliked"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Heart
              className={cn(
                isSmall ? "w-3 h-3" : "w-4 h-4",
                liked && "fill-rose-500",
              )}
            />
          </motion.div>
        </AnimatePresence>
      </button>

      {count > 0 && (
        <Dialog>
          <DialogTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "font-semibold hover:underline",
                isSmall ? "pr-2 py-1 text-xs" : "pr-3 py-1.5 text-sm"
              )}
            >
              <motion.span
                key={count}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="inline-block"
              >
                {count}
              </motion.span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xs" onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle className="text-base text-left">Curtidas</DialogTitle>
            </DialogHeader>
            <LikersList childId={childId} entryId={entryId} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
