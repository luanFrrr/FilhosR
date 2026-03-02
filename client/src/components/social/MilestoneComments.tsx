import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useComments, useCreateComment, useDeleteComment } from "@/hooks/use-social";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

interface MilestoneCommentsProps {
  childId: number;
  milestoneId: number;
}

export function MilestoneComments({ childId, milestoneId }: MilestoneCommentsProps) {
  const { user } = useAuth();
  const { data: comments, isLoading } = useComments(childId, "milestone", milestoneId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    createComment.mutate(
      {
        childId,
        recordType: "milestone",
        recordId: milestoneId,
        text: text.trim(),
      },
      {
        onSuccess: () => setText(""),
      },
    );
  };

  const handleDelete = (commentId: number) => {
    deleteComment.mutate({
      commentId,
      childId,
      recordType: "milestone",
      recordId: milestoneId,
    });
  };

  const formatAuthor = (firstName: string | null, lastName: string | null) => {
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    return "Alguém";
  };

  const formatTime = (createdAt: string | null) => {
    if (!createdAt) return "";
    try {
      return format(new Date(createdAt), "dd 'de' MMM 'às' HH:mm", { locale: ptBR });
    } catch {
      return "";
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-muted-foreground">
          Comentários {comments && comments.length > 0 ? `(${comments.length})` : ""}
        </span>
      </div>

      {/* Lista de comentários */}
      <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-4/5 rounded-xl" />
          </div>
        )}

        {!isLoading && comments?.length === 0 && (
          <p className="text-xs text-muted-foreground italic text-center py-2">
            Seja o primeiro a comentar neste momento especial
          </p>
        )}

        <AnimatePresence initial={false}>
          {comments?.map((comment) => {
            const isOwn = comment.userId === user?.id;
            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bg-muted/40 rounded-xl px-3 py-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-primary">
                      {formatAuthor(comment.userFirstName, comment.userLastName)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatTime(comment.createdAt)}
                    </span>
                    <p className="text-sm text-foreground mt-0.5 break-words">{comment.text}</p>
                  </div>
                  {isOwn && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deleteComment.isPending}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                      aria-label="Excluir comentário"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Input de novo comentário */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva um comentário..."
          rows={1}
          className="resize-none text-sm rounded-xl min-h-[38px] py-2"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as any);
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!text.trim() || createComment.isPending}
          className="rounded-xl h-9 w-9 shrink-0"
          aria-label="Enviar comentário"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
