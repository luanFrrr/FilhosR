import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMilestoneLikes, useToggleLike } from "@/hooks/use-social";

interface LikeButtonProps {
  milestoneId: number;
  childId: number;
  size?: "sm" | "md";
  className?: string;
}

export function LikeButton({ milestoneId, childId, size = "md", className }: LikeButtonProps) {
  const { data: likeStatus } = useMilestoneLikes(milestoneId);
  const toggle = useToggleLike(childId, milestoneId);

  const count = likeStatus?.count ?? 0;
  const liked = likeStatus?.userLiked ?? false;

  const isSmall = size === "sm";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggle.mutate();
      }}
      disabled={toggle.isPending}
      className={cn(
        "flex items-center gap-1 rounded-full transition-all duration-200",
        isSmall ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        liked
          ? "bg-rose-50 text-rose-500 hover:bg-rose-100"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
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
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 1.4 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="font-semibold"
        >
          {count}
        </motion.span>
      )}
    </button>
  );
}
