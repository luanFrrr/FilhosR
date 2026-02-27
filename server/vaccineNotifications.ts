import webpush from "web-push";
import { storage } from "./storage";
import { db } from "./db";
import { children, caregivers, vaccineRecords, susVaccines, pushSubscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";

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
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

function getDoseLabel(vaccine: any, ageMonths: number): string {
  const doses = vaccine.recommendedDoses.split(",").map((d: string) => d.trim());
  const ages = parseAgeToMonths(vaccine.ageRange || "");
  if (doses.length === 1) return doses[0];
  const sortedAges = [...ages].sort((a, b) => a - b);
  const ageIndex = sortedAges.indexOf(ageMonths);
  if (ageIndex >= 0 && ageIndex < doses.length) return doses[ageIndex];
  return doses[0];
}

function isDoseRecorded(records: any[], vaccineId: number, dose: string): boolean {
  return records.some(rec => {
    if (rec.susVaccineId !== vaccineId) return false;
    const recDose = rec.dose.toLowerCase().trim();
    const expDose = dose.toLowerCase().trim();
    if (recDose === expDose || recDose.includes(expDose) || expDose.includes(recDose)) return true;
    const birthPatterns = ["dose ao nascer", "ao nascer", "dose única", "1ª dose", "1a dose"];
    const recBirth = birthPatterns.some(p => recDose.includes(p));
    const expBirth = birthPatterns.some(p => expDose.includes(p));
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
  const allSusVaccines = await storage.getSusVaccines();
  if (allSusVaccines.length === 0) {
    await storage.initializeSusVaccines();
  }
  const vaccines = await storage.getSusVaccines();

  const allSubs = await storage.getAllPushSubscriptions();
  const uniqueUserIds = [...new Set(allSubs.map(s => s.userId))];
  const userReminders = new Map<string, VaccineReminder[]>();

  for (const userId of uniqueUserIds) {
    const userChildren = await storage.getChildrenByUserId(userId);
    const reminders: VaccineReminder[] = [];

    for (const child of userChildren) {
      const ageMonths = getChildAgeMonths(child.birthDate);
      const records = await storage.getVaccineRecords(child.id);

      for (const vaccine of vaccines) {
        const ages = parseAgeToMonths(vaccine.ageRange || "");

        for (const expectedAge of ages) {
          const dose = getDoseLabel(vaccine, expectedAge);
          if (isDoseRecorded(records, vaccine.id, dose)) continue;

          const monthsDiff = expectedAge - ageMonths;

          if (monthsDiff >= 0 && monthsDiff <= 1) {
            reminders.push({
              childName: child.name,
              vaccineName: vaccine.name,
              dose,
              type: monthsDiff === 0 ? "due" : "upcoming",
            });
          } else if (monthsDiff < 0 && monthsDiff >= -2) {
            reminders.push({
              childName: child.name,
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

  const overdueCount = reminders.filter(r => r.type === "overdue").length;
  const dueCount = reminders.filter(r => r.type === "due").length;
  const upcomingCount = reminders.filter(r => r.type === "upcoming").length;

  let title = "💉 Lembrete de Vacinas";
  let body = "";

  if (overdueCount > 0) {
    const first = reminders.find(r => r.type === "overdue")!;
    title = "⚠️ Vacina em atraso!";
    body = `${first.childName}: ${first.vaccineName} (${first.dose}) está em atraso.`;
    if (overdueCount > 1) {
      body += ` E mais ${overdueCount - 1} vacina(s) pendente(s).`;
    }
  } else if (dueCount > 0) {
    const first = reminders.find(r => r.type === "due")!;
    title = "💉 Vacina na hora certa!";
    body = `${first.childName}: é hora da ${first.vaccineName} (${first.dose}).`;
    if (dueCount > 1) {
      body += ` E mais ${dueCount - 1} vacina(s) para este mês.`;
    }
  } else if (upcomingCount > 0) {
    const first = reminders.find(r => r.type === "upcoming")!;
    body = `${first.childName}: ${first.vaccineName} (${first.dose}) está chegando!`;
    if (upcomingCount > 1) {
      body += ` E mais ${upcomingCount - 1} vacina(s) próximas.`;
    }
  }

  return {
    title,
    body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: "vaccine-reminder",
    data: { url: "/" },
  };
}

export async function sendVaccineNotifications(): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("[notifications] VAPID keys not configured, skipping");
    return 0;
  }

  try {
    const userReminders = await getVaccineReminders();
    let sentCount = 0;

    for (const [userId, reminders] of userReminders) {
      const payload = buildNotificationPayload(reminders);
      if (!payload) continue;

      const subs = await storage.getPushSubscriptionsByUserId(userId);

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload)
          );
          sentCount++;
        } catch (error: any) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            await storage.deletePushSubscription(sub.endpoint);
            console.log(`[notifications] Removed expired subscription for user ${userId}`);
          } else {
            console.error(`[notifications] Failed to send to user ${userId}:`, error.message);
          }
        }
      }
    }

    console.log(`[notifications] Sent ${sentCount} vaccine reminders`);
    return sentCount;
  } catch (error) {
    console.error("[notifications] Error sending vaccine notifications:", error);
    return 0;
  }
}

let notificationInterval: NodeJS.Timeout | null = null;

export function startVaccineNotificationScheduler(): void {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("[notifications] VAPID keys not configured, scheduler not started");
    return;
  }

  console.log("[notifications] Vaccine notification scheduler started (daily at 9:00 AM BRT)");

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
