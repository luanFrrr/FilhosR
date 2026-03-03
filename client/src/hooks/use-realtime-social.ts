import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Hook de Realtime para likes e comentários de marcos.
 *
 * Escuta mudanças nas tabelas `milestone_likes` e `activity_comments`
 * do Supabase e invalida automaticamente os caches do React Query,
 * atualizando a UI de todos os cuidadores em tempo real.
 *
 * @param childId - ID da criança ativa
 */
export function useRealtimeSocial(childId: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!childId) return;

    // Canal único por criança para evitar subscriptions duplicadas
    const channel = supabase
      .channel(`social-child-${childId}`)

      // ── Escuta likes em marcos ──────────────────────────────────────────────
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT e DELETE
          schema: "public",
          table: "milestone_likes",
        },
        (payload) => {
          const milestoneId =
            (payload.new as any)?.milestone_id ??
            (payload.old as any)?.milestone_id;

          // Atualiza o contador de likes do marco específico
          if (milestoneId) {
            queryClient.invalidateQueries({
              queryKey: ["milestone-likes", milestoneId],
            });
          }

          // Atualiza os contadores nos cards da timeline
          queryClient.invalidateQueries({
            queryKey: ["milestones-social", childId],
          });
        },
      )

      // ── Escuta novos comentários ────────────────────────────────────────────
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT e DELETE
          schema: "public",
          table: "activity_comments",
          filter: `child_id=eq.${childId}`,
        },
        (payload) => {
          const recordId =
            (payload.new as any)?.record_id ??
            (payload.old as any)?.record_id;
          const recordType =
            (payload.new as any)?.record_type ??
            (payload.old as any)?.record_type;

          // Atualiza a lista de comentários do registro específico
          if (recordId && recordType) {
            queryClient.invalidateQueries({
              queryKey: ["comments", childId, recordType, recordId],
            });
          }

          // Atualiza os contadores de comentários nos cards da timeline
          queryClient.invalidateQueries({
            queryKey: ["milestones-social", childId],
          });
        },
      )

      .subscribe();

    // Cleanup: remove o canal quando o componente desmonta ou childId muda
    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId, queryClient]);
}
