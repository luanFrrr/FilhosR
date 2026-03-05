/**
 * gamificationHelper.ts
 *
 * Única fonte autorizada para modificar gamification.points.
 * REGRA: nenhum código fora deste arquivo deve fazer INSERT/UPDATE em
 * `gamification` diretamente. Toda alteração de score deve chamar recordPoints().
 *
 * Estratégia:
 *  - gamification_events é a fonte de verdade (log imutável)
 *  - gamification.points é cache atualizado atomicamente na mesma transação
 *  - Idempotência via UNIQUE(record_type, record_id, reason): retries são seguros
 */

import { gamification, gamificationEvents } from "@shared/schema";
import { sql } from "drizzle-orm";

// Expressão SQL para calcular nível baseado nos pontos resultantes
const levelExpression = (newPointsExpr: ReturnType<typeof sql>) =>
  sql<string>`
    CASE
      WHEN (${newPointsExpr}) > 2000 THEN 'Guardião da Infância'
      WHEN (${newPointsExpr}) > 1000 THEN 'Mãe/Pai Coruja'
      WHEN (${newPointsExpr}) > 500  THEN 'Mãe/Pai Dedicado'
      WHEN (${newPointsExpr}) > 100  THEN 'Cuidador Atento'
      ELSE 'Iniciante'
    END
  `;

/**
 * Registra um evento de pontuação e atualiza o cache atomicamente.
 *
 * Deve ser chamado DENTRO de um db.transaction() junto com a operação principal
 * para garantir consistência total.
 *
 * É idempotente: se o evento (recordType, recordId, reason) já existe,
 * nenhum ponto é adicionado — seguro para retries.
 *
 * @param tx   - Drizzle transaction (ou db diretamente em casos sem transação)
 * @param childId    - ID da criança
 * @param delta      - Pontos a somar (negativo para remoção)
 * @param reason     - Motivo do evento: 'growth_create', 'milestone_delete', etc.
 * @param recordType - Tipo do registro de origem: 'growth_record', 'milestone', etc.
 * @param recordId   - ID do registro de origem
 */
export async function recordPoints(
  tx: any, // db ou drizzle transaction — mesma API em runtime
  childId: number,
  delta: number,
  reason: string,
  recordType: string,
  recordId: number,
): Promise<void> {
  // 1. Tenta inserir o evento — ON CONFLICT DO NOTHING garante idempotência
  const inserted = await tx
    .insert(gamificationEvents)
    .values({ childId, delta, reason, recordType, recordId })
    .onConflictDoNothing()
    .returning({ id: gamificationEvents.id });

  // 2. Só atualiza o cache se o evento foi efetivamente inserido.
  //    Em retry, inserted.length === 0 → cache NÃO é alterado → sem double-count.
  if (inserted.length === 0) return;

  const newPointsExpr = sql`GREATEST(0, COALESCE(${gamification.points}, 0) + ${delta})`;

  await tx
    .insert(gamification)
    .values({
      childId,
      points: Math.max(0, delta),
      level: "Iniciante",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: gamification.childId,
      set: {
        points: newPointsExpr,
        level: levelExpression(newPointsExpr),
        updatedAt: new Date(),
      },
    });
}
