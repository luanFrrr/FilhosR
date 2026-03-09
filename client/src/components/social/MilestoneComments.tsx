import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Trash2, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from "@/hooks/use-social";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

interface MilestoneCommentsProps {
  childId: number;
  milestoneId: number;
  highlightCommentId?: number | null;
}

export function MilestoneComments({
  childId,
  milestoneId,
  highlightCommentId = null,
}: MilestoneCommentsProps) {
  const { user } = useAuth();
  const { data: comments, isLoading } = useComments(
    childId,
    "milestone",
    milestoneId,
  );
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const updateComment = useUpdateComment();
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleStartEdit = (commentId: number, currentText: string) => {
    setEditingId(commentId);
    setEditText(currentText);
    setTimeout(() => editTextareaRef.current?.focus(), 50);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleSaveEdit = (commentId: number) => {
    if (!editText.trim()) return;
    updateComment.mutate(
      {
        commentId,
        text: editText.trim(),
        childId,
        recordType: "milestone",
        recordId: milestoneId,
      },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditText("");
        },
      },
    );
  };

  const formatAuthor = (firstName: string | null, lastName: string | null) => {
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    return "Alguém";
  };

  const formatTime = (createdAt: string | null) => {
    if (!createdAt) return "";
    try {
      return format(new Date(createdAt), "dd 'de' MMM 'às' HH:mm", {
        locale: ptBR,
      });
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (!highlightCommentId || !comments?.length) return;

    const target = document.querySelector(
      `[data-comment-id="${highlightCommentId}"]`,
    ) as HTMLElement | null;
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("ring-2", "ring-primary", "ring-offset-1");

    const timer = window.setTimeout(() => {
      target.classList.remove("ring-2", "ring-primary", "ring-offset-1");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [highlightCommentId, comments]);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-muted-foreground">
          Comentários{" "}
          {comments && comments.length > 0 ? `(${comments.length})` : ""}
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
            const isEditing = editingId === comment.id;
            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bg-muted/40 rounded-xl px-3 py-2 group transition-shadow"
                data-comment-id={comment.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-primary">
                      {formatAuthor(
                        comment.userFirstName,
                        comment.userLastName,
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatTime(comment.createdAt)}
                    </span>
                    {isEditing ? (
                      <div className="mt-1 flex gap-1.5 items-end">
                        <Textarea
                          ref={editTextareaRef}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={1}
                          className="resize-none text-sm rounded-lg min-h-[32px] py-1.5 flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit(comment.id);
                            }
                            if (e.key === "Escape") {
                              handleCancelEdit();
                            }
                          }}
                        />
                        <button
                          onClick={() => handleSaveEdit(comment.id)}
                          disabled={!editText.trim() || updateComment.isPending}
                          className="text-primary hover:text-primary/80 shrink-0 disabled:opacity-40"
                          aria-label="Salvar edição"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          aria-label="Cancelar edição"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground mt-0.5 break-words">
                        {comment.text}
                      </p>
                    )}
                  </div>
                  {isOwn && !isEditing && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                      <button
                        onClick={() =>
                          handleStartEdit(comment.id, comment.text)
                        }
                        className="text-muted-foreground hover:text-primary"
                        aria-label="Editar comentário"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={deleteComment.isPending}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Excluir comentário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
