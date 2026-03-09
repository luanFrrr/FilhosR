import "dotenv/config";
import { and, count, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "../server/db";
import { children, dailyPhotos } from "../shared/schema";
import { storage } from "../server/storage";

type ChildAudit = {
  childId: number;
  expectedTotal: number;
  legacyTotal: number;
  cursorTotal: number;
  sameIds: boolean;
  sameOrder: boolean;
};

const PAGE_SIZE = 300;

async function fetchAllLegacy(childId: number) {
  const rows = [];
  let offset = 0;

  while (true) {
    const batch = await storage.getDailyPhotos(childId, PAGE_SIZE, offset);
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += batch.length;
  }

  return rows;
}

async function fetchAllCursor(childId: number) {
  const rows = [];
  let cursor: string | undefined;

  while (true) {
    const page = await storage.getDailyPhotosByCursor(childId, {
      pageSize: PAGE_SIZE,
      cursor,
    });

    rows.push(...page.data);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }

  return rows;
}

function arraysEqual(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function main() {
  const startedAt = new Date();
  console.log("=== Verificacao de Integridade: Daily Photos ===");
  console.log(`Inicio: ${startedAt.toISOString()}`);

  const [totalRow] = await db
    .select({ total: count() })
    .from(dailyPhotos);
  const totalPhotos = Number(totalRow?.total ?? 0);

  const [emptyUrlRow] = await db
    .select({ total: count() })
    .from(dailyPhotos)
    .where(
      or(
        isNull(dailyPhotos.photoUrl),
        eq(sql`trim(${dailyPhotos.photoUrl})`, ""),
      ),
    );
  const emptyUrlCount = Number(emptyUrlRow?.total ?? 0);

  const orphanRows = await db
    .select({ photoId: dailyPhotos.id, childId: dailyPhotos.childId })
    .from(dailyPhotos)
    .leftJoin(children, eq(dailyPhotos.childId, children.id))
    .where(isNull(children.id))
    .limit(20);

  const duplicateRows = await db
    .select({
      childId: dailyPhotos.childId,
      date: dailyPhotos.date,
      total: count(),
    })
    .from(dailyPhotos)
    .groupBy(dailyPhotos.childId, dailyPhotos.date)
    .having(gt(count(), 1));

  const totalsByChild = await db
    .select({
      childId: dailyPhotos.childId,
      total: count(),
    })
    .from(dailyPhotos)
    .groupBy(dailyPhotos.childId)
    .orderBy(dailyPhotos.childId);

  const audits: ChildAudit[] = [];

  for (const row of totalsByChild) {
    const childId = Number(row.childId);
    const expectedTotal = Number(row.total);
    const legacy = await fetchAllLegacy(childId);
    const cursor = await fetchAllCursor(childId);

    const legacyIds = legacy.map((p) => p.id);
    const cursorIds = cursor.map((p) => p.id);

    audits.push({
      childId,
      expectedTotal,
      legacyTotal: legacy.length,
      cursorTotal: cursor.length,
      sameIds:
        legacyIds.length === cursorIds.length &&
        new Set(legacyIds).size === new Set(cursorIds).size &&
        legacyIds.every((id) => cursorIds.includes(id)),
      sameOrder: arraysEqual(legacyIds, cursorIds),
    });
  }

  const failing = audits.filter(
    (a) =>
      a.expectedTotal !== a.legacyTotal ||
      a.expectedTotal !== a.cursorTotal ||
      !a.sameIds ||
      !a.sameOrder,
  );

  console.log("");
  console.log("--- Resumo Banco ---");
  console.log(`Total daily_photos: ${totalPhotos}`);
  console.log(`Children com fotos: ${totalsByChild.length}`);
  console.log(`URLs vazias: ${emptyUrlCount}`);
  console.log(`Orfaos (child inexistente): ${orphanRows.length}`);
  console.log(`Duplicados (child_id + date): ${duplicateRows.length}`);

  console.log("");
  console.log("--- Resumo Comparativo Legacy x Cursor ---");
  console.log(`Auditorias realizadas: ${audits.length}`);
  console.log(`Divergencias: ${failing.length}`);

  if (failing.length > 0) {
    console.log("");
    console.log("Divergencias encontradas:");
    for (const item of failing.slice(0, 20)) {
      console.log(
        `child=${item.childId} expected=${item.expectedTotal} legacy=${item.legacyTotal} cursor=${item.cursorTotal} sameIds=${item.sameIds} sameOrder=${item.sameOrder}`,
      );
    }
  } else {
    console.log("Nenhuma divergencia entre o metodo legado e o cursor.");
  }

  const finishedAt = new Date();
  console.log("");
  console.log(`Fim: ${finishedAt.toISOString()}`);
  console.log(`Duracao: ${Math.round((+finishedAt - +startedAt) / 1000)}s`);

  if (
    emptyUrlCount > 0 ||
    orphanRows.length > 0 ||
    duplicateRows.length > 0 ||
    failing.length > 0
  ) {
    process.exitCode = 1;
    return;
  }

  process.exitCode = 0;
}

main().catch((err) => {
  console.error("Falha na verificacao:", err);
  process.exit(1);
});
