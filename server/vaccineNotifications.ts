import webpush from "web-push";
import { storage } from "./storage";
import { db, pool } from "./db";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  children,
  caregivers,
  vaccineRecords,
  susVaccines,
  pushSubscriptions,
} from "@shared/schema";
import { eq, sql, inArray } from "drizzle-orm";
import * as schema from "@shared/schema";

// ─── Pool dedicado para o scheduler (1 conexão, não compete com APIs) ────────
const schedulerPool = new pg.Pool({
  connectionString:
    process.env.SUPABASE_POOLER_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 15_000,
  ...(process.env.SUPABASE_POOLER_URL || process.env.SUPABASE_DATABASE_URL
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});
const schedulerDb = drizzle(schedulerPool, { schema });

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:filhos@replit.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

function parseAgeToMonths(ageRange: string): number[] {
  const months: number[] = [];

  if (ageRange.includes("Ao nascer") || ageRange.includes("primeiras 24h")) {
    months.push(0);
  }

  const monthMatches = ageRange.match(/(\d+)\s*meses?/gi);
  if (monthMatches) {
    for (const match of monthMatches) {
      const num = parseInt(match.match(/\d+/)?.[0] || "0");
      if (num > 0) months.push(num);
    }
  }

  const simpleMonths = ageRange.match(/^(\d+),\s*(\d+),?\s*(\d+)?\s*meses/i);
  if (simpleMonths) {
    for (let i = 1; i <= 3; i++) {
      if (simpleMonths[i]) months.push(parseInt(simpleMonths[i]));
    }
  }

  if (ageRange.includes("12 meses") || ageRange.includes("reforço 12m")) {
    if (!months.includes(12)) months.push(12);
  }
  if (ageRange.includes("15 meses")) {
    if (!months.includes(15)) months.push(15);
  }
  if (ageRange.includes("18 meses")) {
    if (!months.includes(18)) months.push(18);
  }

  const yearMatches = ageRange.match(/(\d+)\s*anos?/gi);
  if (yearMatches) {
    for (const match of yearMatches) {
      const num = parseInt(match.match(/\d+/)?.[0] || "0");
      if (num > 0 && num <= 14) {
        months.push(num * 12);
      }
    }
  }

  return Array.from(new Set(months)).sort((a, b) => a - b);
}

function getChildAgeMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  return (
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  );
}

function getDoseLabel(vaccine: any, ageMonths: number): string {
  const doses = vaccine.recommendedDoses
    .split(",")
    .map((d: string) => d.trim());
  const ages = parseAgeToMonths(vaccine.ageRange || "");
  if (doses.length === 1) return doses[0];
  const sortedAges = [...ages].sort((a, b) => a - b);
  const ageIndex = sortedAges.indexOf(ageMonths);
  if (ageIndex >= 0 && ageIndex < doses.length) return doses[ageIndex];
  return doses[0];
}

function isDoseRecorded(
  records: any[],
  vaccineId: number,
  dose: string,
): boolean {
  return records.some((rec) => {
    if (rec.susVaccineId !== vaccineId) return false;
    const recDose = rec.dose.toLowerCase().trim();
    const expDose = dose.toLowerCase().trim();
    if (
      recDose === expDose ||
      recDose.includes(expDose) ||
      expDose.includes(recDose)
    )
      return true;
    const birthPatterns = [
      "dose ao nascer",
      "ao nascer",
      "dose única",
      "1ª dose",
      "1a dose",
    ];
    const recBirth = birthPatterns.some((p) => recDose.includes(p));
    const expBirth = birthPatterns.some((p) => expDose.includes(p));
    if (recBirth && expBirth) return true;
    return false;
  });
}

interface VaccineReminder {
  childName: string;
  vaccineName: string;
  dose: string;
  type: "upcoming" | "due" | "overdue";
}

async function getVaccineReminders(): Promise<Map<string, VaccineReminder[]>> {
  // ── Query 1: Vacinas SUS (cacheada 24h, ~0 custo) ──
  const allSusVaccines = await storage.getSusVaccines();
  if (allSusVaccines.length === 0) {
    await storage.initializeSusVaccines();
  }
  const vaccines = await storage.getSusVaccines();

  // ── Query 2 (unificada e deduplicada) ──
  // Subquery com DISTINCT elimina múltiplos devices (push_subscriptions combinatórios)
  // antes do JOIN, protegendo contra explosões se um usuário tiver muitos celulares logados.
  const uniquePushUsers = schedulerDb
    .selectDistinct({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions)
    .as("ps");

  const rows = await schedulerDb
    .select({
      userId: caregivers.userId,
      childId: children.id,
      childName: children.name,
      birthDate: children.birthDate,
      susVaccineId: vaccineRecords.susVaccineId,
      dose: vaccineRecords.dose,
    })
    .from(uniquePushUsers)
    .innerJoin(caregivers, eq(caregivers.userId, uniquePushUsers.userId))
    .innerJoin(children, eq(children.id, caregivers.childId))
    .leftJoin(vaccineRecords, eq(vaccineRecords.childId, children.id));

  if (rows.length === 0) {
    return new Map();
  }

  // ── Agrupar em memória (1 passagem sobre os resultados) ──
  // Estrutura: userId → childId → { name, birthDate, records[] }
  const userChildMap = new Map<
    string,
    Map<number, {
      name: string;
      birthDate: string;
      records: { susVaccineId: number; dose: string }[];
    }>
  >();

  for (const row of rows) {
    if (!userChildMap.has(row.userId)) {
      userChildMap.set(row.userId, new Map());
    }
    const childMap = userChildMap.get(row.userId)!;

    if (!childMap.has(row.childId)) {
      childMap.set(row.childId, {
        name: row.childName,
        birthDate: row.birthDate,
        records: [],
      });
    }

    // LEFT JOIN: vaccine_records pode ser NULL se a criança não tem registros
    if (row.susVaccineId !== null && row.dose !== null) {
      childMap.get(row.childId)!.records.push({
        susVaccineId: row.susVaccineId,
        dose: row.dose,
      });
    }
  }

  // ── Processar tudo em memória (zero queries adicionais) ──
  const userReminders = new Map<string, VaccineReminder[]>();

  for (const [userId, childMap] of userChildMap) {
    const reminders: VaccineReminder[] = [];

    for (const [, childInfo] of childMap) {
      const ageMonths = getChildAgeMonths(childInfo.birthDate);

      for (const vaccine of vaccines) {
        const ages = parseAgeToMonths(vaccine.ageRange || "");

        for (const expectedAge of ages) {
          const dose = getDoseLabel(vaccine, expectedAge);
          if (isDoseRecorded(childInfo.records, vaccine.id, dose)) continue;

          const monthsDiff = expectedAge - ageMonths;

          if (monthsDiff >= 0 && monthsDiff <= 1) {
            reminders.push({
              childName: childInfo.name,
              vaccineName: vaccine.name,
              dose,
              type: monthsDiff === 0 ? "due" : "upcoming",
            });
          } else if (monthsDiff < 0 && monthsDiff >= -2) {
            reminders.push({
              childName: childInfo.name,
              vaccineName: vaccine.name,
              dose,
              type: "overdue",
            });
          }
        }
      }
    }

    if (reminders.length > 0) {
      userReminders.set(userId, reminders);
    }
  }

  return userReminders;
}

function buildNotificationPayload(reminders: VaccineReminder[]): any {
  if (reminders.length === 0) return null;

  const overdueCount = reminders.filter((r) => r.type === "overdue").length;
  const dueCount = reminders.filter((r) => r.type === "due").length;
  const upcomingCount = reminders.filter((r) => r.type === "upcoming").length;

  let title = "💉 Lembrete de Vacinas";
  let body = "";

  if (overdueCount > 0) {
    const first = reminders.find((r) => r.type === "overdue")!;
    title = "⚠️ Vacina em atraso!";
    body = `${first.childName}: ${first.vaccineName} (${first.dose}) está em atraso.`;
    if (overdueCount > 1) {
      body += ` E mais ${overdueCount - 1} vacina(s) pendente(s).`;
    }
  } else if (dueCount > 0) {
    const first = reminders.find((r) => r.type === "due")!;
    title = "💉 Vacina na hora certa!";
    body = `${first.childName}: é hora da ${first.vaccineName} (${first.dose}).`;
    if (dueCount > 1) {
      body += ` E mais ${dueCount - 1} vacina(s) para este mês.`;
    }
  } else if (upcomingCount > 0) {
    const first = reminders.find((r) => r.type === "upcoming")!;
    body = `${first.childName}: ${first.vaccineName} (${first.dose}) está chegando!`;
    if (upcomingCount > 1) {
      body += ` E mais ${upcomingCount - 1} vacina(s) próximas.`;
    }
  }

  return {
    title,
    body,
    icon: "/icons/icon-notification-192x192.png",
    badge: "/icons/badge-96x96.png",
    tag: "vaccine-reminder",
    data: { url: "/vaccines" },
  };
}

// ── Enviar pushes em batches de concorrência limitada ──
async function sendInBatches(
  tasks: (() => Promise<void>)[],
  concurrency: number,
): Promise<void> {
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    await Promise.allSettled(batch.map((fn) => fn()));
  }
}

export async function sendVaccineNotifications(): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("[notifications] VAPID keys not configured, skipping");
    return 0;
  }

  try {
    const userReminders = await getVaccineReminders();
    if (userReminders.size === 0) return 0;

    // ── Buscar TODAS as push subscriptions dos users com reminders em 1 query ──
    const userIds = [...userReminders.keys()];
    const allSubs = await schedulerDb
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, userIds));

    // Agrupar subs por userId
    const subsByUser = new Map<string, typeof allSubs>();
    for (const sub of allSubs) {
      if (!subsByUser.has(sub.userId)) subsByUser.set(sub.userId, []);
      subsByUser.get(sub.userId)!.push(sub);
    }

    // ── Montar lista de envios e executar em batches de 10 ──
    let sentCount = 0;
    const tasks: (() => Promise<void>)[] = [];

    for (const [userId, reminders] of userReminders) {
      const payload = buildNotificationPayload(reminders);
      if (!payload) continue;

      const subs = subsByUser.get(userId) || [];
      for (const sub of subs) {
        tasks.push(async () => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              JSON.stringify(payload),
            );
            sentCount++;
          } catch (error: any) {
            if (error.statusCode === 404 || error.statusCode === 410) {
              await schedulerDb
                .delete(pushSubscriptions)
                .where(eq(pushSubscriptions.endpoint, sub.endpoint));
              console.log(
                `[notifications] Removed expired subscription for user ${userId}`,
              );
            } else {
              console.error(
                `[notifications] Failed to send to user ${userId}:`,
                error.message,
              );
            }
          }
        });
      }
    }

    await sendInBatches(tasks, 10);
    console.log(`[notifications] Sent ${sentCount} vaccine reminders`);
    return sentCount;
  } catch (error) {
    console.error(
      "[notifications] Error sending vaccine notifications:",
      error,
    );
    return 0;
  }
}

let notificationInterval: NodeJS.Timeout | null = null;

type CaregiverNotificationMetadata = {
  eventType?: string;
  entityType?: string;
  entityId?: number;
  recordType?: string;
  recordId?: number;
  commentId?: number;
  [key: string]: unknown;
};

function resolveActorName(user: any): string | null {
  if (!user) return null;

  const first = user.displayFirstName || user.firstName || null;
  const last = user.displayLastName || user.lastName || null;
  const fullName = [first, last].filter(Boolean).join(" ").trim();
  return fullName || null;
}

function resolveActorAvatar(user: any): string | null {
  if (!user) return null;
  return user.displayPhotoUrl || user.profileImageUrl || null;
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toOptionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function buildActivityTag(params: {
  childId: number;
  recipientId: string;
  metadata: CaregiverNotificationMetadata;
  sequence: number;
}): string {
  const eventType = params.metadata.eventType || "activity";
  const entityType = params.metadata.entityType || "generic";
  const entityId = params.metadata.entityId ?? params.childId;
  return `activity-${eventType}-${entityType}-${entityId}-${params.recipientId}-${Date.now()}-${params.sequence}`;
}

export async function notifyCaregivers(
  childId: number,
  senderId: string,
  title: string,
  body: string,
  url: string = "/",
  metadata: CaregiverNotificationMetadata = {},
): Promise<void> {
  try {
    const child = await storage.getChild(childId);
    if (!child) return;

    // Get all caregivers for this child
    const caregiversList = await storage.getCaregiversByChildId(childId);

    // Filter out the sender and get unique user IDs
    const recipientIds = [
      ...new Set(
        caregiversList
          .filter((c) => c.userId !== senderId)
          .map((c) => c.userId),
      ),
    ];
    if (recipientIds.length === 0) return;

    const [sender, allRecipientSubscriptions] = await Promise.all([
      storage.getUser(senderId),
      storage.getPushSubscriptionsByUserIds(recipientIds),
    ]);
    const pushEnabled = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
    const eventType = toOptionalString(metadata.eventType) || "activity";
    const recordType = toOptionalString(metadata.recordType);
    const recordId = toOptionalNumber(metadata.recordId);
    const commentId = toOptionalNumber(metadata.commentId);
    const deepLink = url || "/";
    const actorName = resolveActorName(sender);
    const actorAvatar = resolveActorAvatar(sender);

    await storage.createNotifications(
      recipientIds.map((recipientId) => ({
        recipientUserId: recipientId,
        actorUserId: senderId,
        actorName,
        actorAvatar,
        childId,
        type: eventType,
        title,
        body,
        deepLink,
        recordType,
        recordId,
        commentId,
        metadata,
      })),
    );

    if (!pushEnabled || allRecipientSubscriptions.length === 0) return;

    const subscriptionsByRecipient = new Map<string, typeof allRecipientSubscriptions>();
    for (const sub of allRecipientSubscriptions) {
      if (!subscriptionsByRecipient.has(sub.userId)) {
        subscriptionsByRecipient.set(sub.userId, []);
      }
      subscriptionsByRecipient.get(sub.userId)!.push(sub);
    }

    let sequence = 0;
    const tasks: Array<() => Promise<void>> = [];
    for (const recipientId of recipientIds) {
      const subs = subscriptionsByRecipient.get(recipientId) ?? [];
      const payload = JSON.stringify({
        title,
        body,
        icon: "/icons/icon-notification-192x192.png",
        badge: "/icons/badge-96x96.png",
        tag: buildActivityTag({
          childId,
          recipientId,
          metadata,
          sequence: sequence++,
        }),
        data: {
          childId,
          actorId: senderId,
          ...metadata,
          url: deepLink,
        },
      });

      for (const sub of subs) {
        tasks.push(async () => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload,
            );
          } catch (error: any) {
            if (error.statusCode === 404 || error.statusCode === 410) {
              await storage.deletePushSubscription(sub.endpoint);
              return;
            }
            console.error(
              `[notifications] Failed to send to recipient ${recipientId}:`,
              error?.message || error,
            );
          }
        });
      }
    }

    await sendInBatches(tasks, 20);
  } catch (error) {
    console.error(
      "[notifications] Error sending activity notification:",
      error,
    );
  }
}

export function startVaccineNotificationScheduler(): void {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log(
      "[notifications] VAPID keys not configured, scheduler not started",
    );
    return;
  }

  console.log(
    "[notifications] Vaccine notification scheduler started (daily at 9:00 AM BRT)",
  );

  const checkAndSend = () => {
    const now = new Date();
    const brasiliaOffset = -3;
    const utcHour = now.getUTCHours();
    const brasiliaHour = (utcHour + brasiliaOffset + 24) % 24;

    if (brasiliaHour === 9 && now.getUTCMinutes() < 5) {
      sendVaccineNotifications();
    }
  };

  notificationInterval = setInterval(checkAndSend, 5 * 60 * 1000);
}
