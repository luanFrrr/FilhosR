import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { caregivers, activityComments, children, milestones, diaryEntries, dailyPhotos, vaccineRecords } from "@shared/schema";
import { db } from "./db";
import { eq as drizzleEq, sql } from "drizzle-orm";
import {
  setupAuth,
  registerAuthRoutes,
  isAuthenticated,
} from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import {
  startVaccineNotificationScheduler,
  sendVaccineNotifications,
  notifyCaregivers,
} from "./vaccineNotifications";
import { uploadToStorage, deleteFromStorage, type UploadBucket } from "./supabaseStorage";
import rateLimit from "express-rate-limit";
import { recordPoints } from "./gamificationHelper";

// ─── Rate Limiters ────────────────────────────────────────────────────────────
// Global: 300 requests por IP por janela de 15 minutos
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas requisições. Tente novamente em alguns minutos." },
  validate: { xForwardedForHeader: false },
});

// Auth: 10 tentativas por IP por 15 minutos (proteção contra brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas de login. Tente novamente em 15 minutos." },
});

// Upload: 20 uploads por IP por 15 minutos
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Limite de uploads atingido. Tente novamente em alguns minutos." },
});

// Push test: 5 por IP por 15 minutos (evita spam de notificações)
const pushTestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Limite de notificações de teste atingido." },
});

const resolveUserName = (user: any) => {
  if (!user) return "Alguém";
  if (user.profileCustomized) {
    return (
      [user.displayFirstName, user.displayLastName].filter(Boolean).join(" ") ||
      "Alguém"
    );
  }
  return (
    [
      user.displayFirstName || user.firstName,
      user.displayLastName || user.lastName,
    ]
      .filter(Boolean)
      .join(" ") || "Alguém"
  );
};

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // === HEALTH CHECK ===
  app.get("/healthz", (_req, res) => {
    res.status(200).send("OK");
  });
  app.get("/", (_req, res, next) => {
    // If it's a request for the root, and we're in production, 
    // we want to make sure it doesn't hang if there's any issue.
    // However, serveStatic or setupVite usually handles this.
    // For health check purposes, we'll allow / to be handled by static/vite
    // but we add /healthz as a dedicated lightweight endpoint.
    next();
  });

  // === SETUP AUTHENTICATION ===
  await setupAuth(app);
  registerAuthRoutes(app);

  // === VAPID KEY (antes do rate limiter — endpoint leve, string fixa) ===
  app.get("/api/push/vapid-key", (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

  // === RATE LIMITING ===
  app.use("/api/", globalLimiter);
  app.use("/api/login", authLimiter);

  // === HELPER: Get userId from OIDC claims ===
  const getUserId = (req: any): string | null => {
    return req.user?.claims?.sub || null;
  };

  // === HELPER: Check if user has access to a child ===
  const hasChildAccess = async (
    userId: string,
    childId: number,
  ): Promise<boolean> => {
    return storage.hasChildAccessDirect(userId, childId);
  };

  // === API ROUTES ===

  // Gamification is now per-child - this endpoint requires childId as query param
  app.get(api.auth.gamification.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.query.childId);
    if (!childId || isNaN(childId)) {
      return res.json({ points: 0, level: "Iniciante" });
    }

    // Verify user has access to this child
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const g = await storage.getGamification(childId);
    res.json(g || { points: 0, level: "Iniciante" });
  });

  // Children
  app.get(api.children.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const children = await storage.getChildrenByUserId(userId);
    res.json(children);
  });

  app.get(
    api.children.listWithRoles.path,
    isAuthenticated,
    async (req, res) => {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Não autenticado" });

      const childrenWithRoles =
        await storage.getChildrenWithRolesByUserId(userId);
      res.json(childrenWithRoles);
    },
  );

  app.post(api.children.create.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    try {
      const input = api.children.create.input.parse(req.body);

      let child: any;
      await db.transaction(async (tx) => {
        // 1. Criar a criança
        child = await storage.createChild(input);

        // 2. Vincular como owner
        await tx.insert(caregivers).values({
          childId: child.id,
          userId,
          relationship: "parent",
          role: "owner",
        });

        // 3. Medidas ao nascer (opcional)
        const hasWeight = input.initialWeight && parseFloat(String(input.initialWeight)) > 0;
        const hasHeight = input.initialHeight && parseFloat(String(input.initialHeight)) > 0;
        const hasHead   = input.initialHeadCircumference && parseFloat(String(input.initialHeadCircumference)) > 0;
        if (hasWeight || hasHeight || hasHead) {
          const growthData: any = { childId: child.id, date: child.birthDate, notes: "Medidas ao nascer" };
          if (hasWeight) growthData.weight = String(input.initialWeight);
          if (hasHeight) growthData.height = String(input.initialHeight);
          if (hasHead)   growthData.headCircumference = String(input.initialHeadCircumference);
          await storage.createGrowthRecord(growthData);
        }

        // 4. Gamificação — 50 pontos por cadastrar uma criança
        await recordPoints(tx, child.id, 50, 'child_create', 'child', child.id);
      });

      res.status(201).json(child);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.children.update.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const id = Number(req.params.id);
    if (!(await hasChildAccess(userId, id))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const existing = await storage.getChild(id);
    const input = api.children.update.input.parse(req.body);
    const record = await storage.updateChild(id, input);

    if ('photoUrl' in input && existing?.photoUrl && input.photoUrl !== existing.photoUrl) {
      deleteFromStorage(existing.photoUrl).catch(() => {});
    }

    res.json(record);
  });

  app.delete(api.children.delete.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const id = Number(req.params.id);
    const role = await storage.getCaregiverRole(userId, id);
    if (!role) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    if (role !== "owner") {
      return res
        .status(403)
        .json({ message: "Apenas o responsável principal pode excluir" });
    }

    const urlsToDelete: string[] = [];

    const [childRow] = await db.select({ photoUrl: children.photoUrl }).from(children).where(drizzleEq(children.id, id));
    if (childRow?.photoUrl) urlsToDelete.push(childRow.photoUrl);

    const milestoneRows = await db.select({ photoUrl: milestones.photoUrl }).from(milestones).where(drizzleEq(milestones.childId, id));
    for (const r of milestoneRows) { if (r.photoUrl) urlsToDelete.push(r.photoUrl); }

    const diaryRows = await db.select({ photoUrls: diaryEntries.photoUrls }).from(diaryEntries).where(drizzleEq(diaryEntries.childId, id));
    for (const r of diaryRows) { if (r.photoUrls?.length) urlsToDelete.push(...r.photoUrls); }

    const dailyRows = await db.select({ photoUrl: dailyPhotos.photoUrl }).from(dailyPhotos).where(drizzleEq(dailyPhotos.childId, id));
    for (const r of dailyRows) { if (r.photoUrl) urlsToDelete.push(r.photoUrl); }

    const vaccineRows = await db.select({ photoUrls: vaccineRecords.photoUrls }).from(vaccineRecords).where(drizzleEq(vaccineRecords.childId, id));
    for (const r of vaccineRows) { if (r.photoUrls?.length) urlsToDelete.push(...r.photoUrls); }

    await storage.deleteChild(id);

    for (const url of urlsToDelete) {
      deleteFromStorage(url).catch(() => {});
    }

    res.status(204).end();
  });

  // Growth
  app.get(api.growth.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const records = await storage.getGrowthRecords(childId);
    res.json(records);
  });

  app.post(api.growth.create.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const input = api.growth.create.input.parse(req.body);

    let record: any;
    await db.transaction(async (tx) => {
      record = await storage.createGrowthRecord({ ...input, childId });
      await recordPoints(tx, childId, 10, 'growth_create', 'growth_record', record.id);
    });

    // Responde imediatamente
    res.status(201).json(record);

    // Background: notificações (pontos já persistidos na transação)
    (async () => {
      try {
        const [user, child] = await Promise.all([
          storage.getUser(userId),
          storage.getChild(childId),
        ]);
        const userName = resolveUserName(user);
        const childName = child?.name || "seu filho(a)";
        notifyCaregivers(
          childId, userId,
          "📏 Novo registro de crescimento",
          `${userName} registrou peso/altura do ${childName}`,
          "/health?tab=growth",
        );
      } catch (err) {
        console.error("[bg] Erro pós-criação de crescimento:", err);
      }
    })();
  });

  app.patch(api.growth.update.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const id = Number(req.params.id);
    const existing = await storage.getGrowthRecordById(id);
    if (!existing) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    if (!(await hasChildAccess(userId, existing.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const input = api.growth.update.input.parse(req.body);
    const record = await storage.updateGrowthRecord(id, input);
    res.json(record);
  });

  app.post(api.growth.archive.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const id = Number(req.params.id);
    const existing = await storage.getGrowthRecordById(id);
    if (!existing) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    if (!(await hasChildAccess(userId, existing.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    let record: any;
    await db.transaction(async (tx) => {
      record = await storage.archiveGrowthRecord(id);
      await recordPoints(tx, existing.childId, -10, 'growth_archive', 'growth_record', id);
    });
    res.json(record);
  });

  // Vaccines
  app.get(api.vaccines.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const records = await storage.getVaccines(childId);
    res.json(records);
  });

  app.post(api.vaccines.create.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const DOSE_LABELS = [
      "1ª dose","2ª dose","3ª dose","4ª dose","5ª dose",
      "6ª dose","7ª dose","8ª dose","9ª dose","10ª dose",
    ];

    const input = api.vaccines.create.input.parse(req.body);

    let vaccine: any;
    const createdDoses: any[] = [];

    await db.transaction(async (tx) => {
      // 1. Criar vacina na agenda
      vaccine = await storage.createVaccine({ ...input, childId });

      // 2. Auto-criar doses pendentes na carteira (sem applicationDate = pendente)
      if (input.autoCreateDoses && input.susVaccineId) {
        for (let i = 0; i < input.autoCreateDoses; i++) {
          const dose = await storage.createVaccineRecord(
            {
              childId,
              susVaccineId: input.susVaccineId,
              dose: DOSE_LABELS[i] ?? `${i + 1}ª dose`,
              applicationDate: null, // pendente — preenchida ao aplicar
              notes: null,
            } as any,
            tx,
          );
          if (dose) createdDoses.push(dose); // null = conflito ignorado (idempotente)
        }
      }

      // 3. Gamificação — atômica com o restante
      await recordPoints(tx, childId, 10, 'vaccine_create', 'vaccine', vaccine.id);
    });

    // Responde imediatamente
    res.status(201).json({ vaccine, dosesCreated: createdDoses });

    // Background: notificações
    (async () => {
      try {
        const [user, child] = await Promise.all([
          storage.getUser(userId),
          storage.getChild(childId),
        ]);
        const userName = resolveUserName(user);
        const childName = child?.name || "seu filho(a)";
        const dosesInfo = createdDoses.length > 0 ? ` (${createdDoses.length} dose(s) criadas)` : "";
        notifyCaregivers(
          childId, userId,
          "💉 Nova vacina adicionada",
          `${userName} adicionou a vacina "${vaccine.name}" para o ${childName}${dosesInfo}`,
          "/vaccines",
        );
      } catch (err) {
        console.error("[bg] Erro pós-criação de vacina:", err);
      }
    })();
  });

  app.patch(api.vaccines.update.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const id = Number(req.params.id);
    const existing = await storage.getVaccineById(id);
    if (!existing) {
      return res.status(404).json({ message: "Vacina não encontrada" });
    }
    if (!(await hasChildAccess(userId, existing.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const input = api.vaccines.update.input.parse(req.body);
    const record = await storage.updateVaccine(id, input);
    res.json(record);
  });

  // Health
  app.get(api.health.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const records = await storage.getHealthRecords(childId);
    res.json(records);
  });

  app.post(api.health.create.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const input = api.health.create.input.parse(req.body);
    const record = await storage.createHealthRecord({ ...input, childId });

    // Responde imediatamente
    res.status(201).json(record);

    // Background: notificações (não bloqueia a resposta)
    (async () => {
      try {
        const [user, child] = await Promise.all([
          storage.getUser(userId),
          storage.getChild(childId),
        ]);
        const userName = resolveUserName(user);
        const childName = child?.name || "seu filho(a)";
        notifyCaregivers(
          childId,
          userId,
          "🤒 Novo registro de saúde",
          `${userName} registrou um evento de saúde para ${childName}`,
          "/health?tab=history",
        );
      } catch (err) {
        console.error("[bg] Erro pós-criação de saúde:", err);
      }
    })();
  });

  app.patch(api.health.update.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const id = Number(req.params.id);
    const existing = await storage.getHealthRecordById(id);
    if (!existing) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    if (!(await hasChildAccess(userId, existing.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const input = api.health.update.input.parse(req.body);
    const record = await storage.updateHealthRecord(id, input);
    res.json(record);
  });

  app.delete(api.health.delete.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const id = Number(req.params.id);
    const existing = await storage.getHealthRecordById(id);
    if (!existing) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    if (!(await hasChildAccess(userId, existing.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    await storage.deleteHealthRecord(id);
    res.status(204).send();
  });

  // Milestones with social counts (likes + comments)
  app.get(
    "/api/children/:childId/milestones/social",
    isAuthenticated,
    async (req, res) => {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Não autenticado" });

      const childId = Number(req.params.childId);
      if (!(await hasChildAccess(userId, childId))) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const milestonesWithSocial = await storage.getMilestonesWithSocialCounts(
        childId,
        userId,
      );
      res.json(milestonesWithSocial);
    },
  );

  // Milestones
  app.get(api.milestones.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const records = await storage.getMilestones(childId);
    res.json(records);
  });

  app.post(api.milestones.create.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const input = api.milestones.create.input.parse(req.body);

    let record: any;
    await db.transaction(async (tx) => {
      record = await storage.createMilestone({
        ...input,
        childId,
        userId,
        isPublic: input.isPublic ?? false,
      });
      await recordPoints(tx, childId, 20, 'milestone_create', 'milestone', record.id);
    });

    // Responde imediatamente
    res.status(201).json(record);

    // Background: notificações (apenas se público)
    if (input.isPublic) {
      (async () => {
        try {
          const [user, child] = await Promise.all([
            storage.getUser(userId),
            storage.getChild(childId),
          ]);
          const userName = resolveUserName(user);
          const childName = child?.name || "seu filho(a)";
          notifyCaregivers(
            childId, userId,
            "✨ Novo marco registrado!",
            `${userName} adicionou um novo marco ao ${childName}: "${record.title}"`,
            `/memories?tab=milestones&id=${record.id}`,
          );
        } catch (err) {
          console.error("[bg] Erro pós-criação de marco:", err);
        }
      })();
    }
  });

  app.patch(api.milestones.update.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const milestoneId = Number(req.params.milestoneId);
    const existing = await storage.getMilestoneById(milestoneId);
    if (!existing) {
      return res.status(404).json({ message: "Marco não encontrado" });
    }
    if (!(await hasChildAccess(userId, existing.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    if (!existing.isPublic) {
      if (existing.userId && existing.userId !== userId) {
        return res.status(403).json({ message: "Apenas o autor pode editar marcos privados" });
      }
      if (!existing.userId) {
        const role = await storage.getCaregiverRole(userId, existing.childId);
        if (role !== "owner") {
          return res.status(403).json({ message: "Apenas o responsável principal pode editar marcos privados" });
        }
      }
    }

    const input = api.milestones.update.input.parse(req.body);
    const record = await storage.updateMilestone(milestoneId, input);

    if ('photoUrl' in input && existing.photoUrl && input.photoUrl !== existing.photoUrl) {
      deleteFromStorage(existing.photoUrl).catch(() => {});
    }

    res.json(record);
  });

  app.delete(api.milestones.delete.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const milestoneId = Number(req.params.milestoneId);
    const existing = await storage.getMilestoneById(milestoneId);
    if (!existing) {
      return res.status(404).json({ message: "Marco não encontrado" });
    }
    if (!(await hasChildAccess(userId, existing.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    if (!existing.isPublic) {
      if (existing.userId && existing.userId !== userId) {
        return res.status(403).json({ message: "Apenas o autor pode excluir marcos privados" });
      }
      if (!existing.userId) {
        const role = await storage.getCaregiverRole(userId, existing.childId);
        if (role !== "owner") {
          return res.status(403).json({ message: "Apenas o responsável principal pode excluir marcos privados" });
        }
      }
    }

    await db.transaction(async (tx) => {
      await storage.deleteMilestone(milestoneId);
      await recordPoints(tx, existing.childId, -20, 'milestone_delete', 'milestone', milestoneId);
    });

    if (existing.photoUrl) {
      deleteFromStorage(existing.photoUrl).catch(() => {});
    }

    res.status(204).send();
  });

  app.get(api.milestones.likers.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const milestoneId = Number(req.params.milestoneId);
    const existing = await storage.getMilestoneById(milestoneId);
    if (!existing) {
      return res.status(404).json({ message: "Marco não encontrado" });
    }
    
    if (!(await hasChildAccess(userId, existing.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const likers = await storage.getMilestoneLikers(milestoneId);
    res.json(likers);
  });

  // Diary
  app.get(api.diary.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 30;

    const records = await storage.getDiaryEntries(childId, userId, page, pageSize);
    res.json(records); // records agora é um objeto com .data, .total, etc
  });

  app.post(api.diary.create.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const input = api.diary.create.input.parse(req.body);

    let record: any;
    await db.transaction(async (tx) => {
      // Adicionamos o userId de quem está criando o registro
      record = await storage.createDiaryEntry(
        {
          ...input,
          childId,
          userId,
          isPublic: input.isPublic ?? false,
        },
        tx,
      );
      await recordPoints(tx, childId, 5, 'diary_create', 'diary_entry', record.id);
    });

    // Responde imediatamente
    res.status(201).json(record);

    // Background: notificações (apenas se público)
    if (input.isPublic) {
      (async () => {
        try {
          const [user, child] = await Promise.all([
            storage.getUser(userId),
            storage.getChild(childId),
          ]);
          const userName = resolveUserName(user);
          const childName = child?.name || "seu filho(a)";
          notifyCaregivers(
            childId, userId,
            "📖 Nova nota no diário",
            `${userName} escreveu uma nova nota no diário do ${childName}`,
            `/memories?tab=diary&id=${record.id}`,
          );
        } catch (err) {
          console.error("[bg] Erro pós-criação de diário:", err);
        }
      })();
    }
  });

  app.patch(api.diary.update.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const entryId = Number(req.params.entryId);
    const entry = await storage.getDiaryEntryById(entryId);
    if (!entry)
      return res.status(404).json({ message: "Registro não encontrado" });

    if (!(await hasChildAccess(userId, entry.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    // Regra de Propriedade: Apenas o autor pode editar, ou qualquer cuidador caso seja um registro antigo sem autor
    if (entry.userId && entry.userId !== userId) {
      return res.status(403).json({ message: "Apenas o autor pode editar esta anotação" });
    }

    const input = api.diary.update.input.parse(req.body);
    const updated = await storage.updateDiaryEntry(entryId, input);

    if ('photoUrls' in input && entry.photoUrls?.length) {
      const newSet = new Set(input.photoUrls || []);
      for (const oldUrl of entry.photoUrls) {
        if (!newSet.has(oldUrl)) {
          deleteFromStorage(oldUrl).catch(() => {});
        }
      }
    }

    res.json(updated);
  });

  app.delete(api.diary.delete.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const entryId = Number(req.params.entryId);
    const entry = await storage.getDiaryEntryById(entryId);
    if (!entry)
      return res.status(404).json({ message: "Registro não encontrado" });

    if (!(await hasChildAccess(userId, entry.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    // Regra de Propriedade: Apenas o autor pode remover, ou qualquer cuidador caso seja um registro antigo sem autor
    if (entry.userId && entry.userId !== userId) {
      return res.status(403).json({ message: "Apenas o autor pode excluir esta anotação" });
    }

    await db.transaction(async (tx) => {
      await storage.deleteDiaryEntry(entryId, tx);
      await recordPoints(tx, entry.childId, -5, 'diary_delete', 'diary_entry', entryId);
    });

    if (entry.photoUrls?.length) {
      for (const url of entry.photoUrls) {
        deleteFromStorage(url).catch(() => {});
      }
    }

    res.status(204).send();
  });

  // Obter status de like de um diário
  app.get(api.diary.likesGet.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const entryId = Number(req.params.entryId);
    if (!entryId || isNaN(entryId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const entry = await storage.getDiaryEntryById(entryId);
    if (!entry) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    if (!(await hasChildAccess(userId, entry.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const status = await storage.getDiaryLikeStatus(entryId, userId);
    res.json(status);
  });

  // Toggle like em um diário
  app.post(api.diary.likesToggle.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const entryId = Number(req.params.entryId);
    if (!entryId || isNaN(entryId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const entry = await storage.getDiaryEntryById(entryId);
    if (!entry) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    if (!(await hasChildAccess(userId, entry.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const status = await storage.toggleDiaryLike(entryId, userId);
    res.json(status);

    if (status.userLiked) {
      (async () => {
        try {
          const [user, child] = await Promise.all([
            storage.getUser(userId),
            storage.getChild(entry.childId),
          ]);
          const userName = resolveUserName(user);
          const childName = child?.name || "seu filho(a)";
          notifyCaregivers(
            entry.childId,
            userId,
            "❤️ Novo coraçãozinho no diário!",
            `${userName} amou uma anotação de ${childName}`,
            `/memories?tab=diary&id=${entry.id}`,
          );
        } catch (err) {
          console.error("[bg] Erro pós-like no diário:", err);
        }
      })();
    }
  });

  // Obter quem curtiu um diário
  app.get(api.diary.likers.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const entryId = Number(req.params.entryId);
    if (!entryId || isNaN(entryId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const entry = await storage.getDiaryEntryById(entryId);
    if (!entry) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    if (!(await hasChildAccess(userId, entry.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const likers = await storage.getDiaryLikers(entryId);
    res.json(likers);
  });

  // SUS Vaccines Catalog (requer autenticação)
  app.get(api.susVaccines.list.path, isAuthenticated, async (req, res) => {
    // Initialize vaccines if not present
    await storage.initializeSusVaccines();
    const vaccines = await storage.getSusVaccines();
    res.json(vaccines);
  });

  // Vaccine Records (Carteira Vacinal)
  app.get(api.vaccineRecords.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const records = await storage.getVaccineRecords(childId);
    res.json(records);
  });

  app.post(
    api.vaccineRecords.create.path,
    isAuthenticated,
    async (req, res) => {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Não autenticado" });

      const childId = Number(req.params.childId);
      if (!(await hasChildAccess(userId, childId))) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const input = api.vaccineRecords.create.input.parse(req.body);

      let record: any;
      await db.transaction(async (tx) => {
        record = await storage.createVaccineRecord({ ...input, childId }, tx);

        if (!record) {
          // Conflito de constraint única (child_id, sus_vaccine_id, dose)
          return res.status(409).json({
            message: "Essa dose já foi registrada",
            detail: "Já existe um registro para essa dose desta vacina nesta criança. Edite o registro existente se precisar corrigir alguma informação.",
          });
        }

        await recordPoints(tx, childId, 15, 'vaccine_record_create', 'vaccine_record', record.id);
      });

      // Responde imediatamente
      res.status(201).json(record);

      // Background: notificações
      (async () => {
        try {
          const [user, child, allVaccines] = await Promise.all([
            storage.getUser(userId),
            storage.getChild(childId),
            storage.getSusVaccines(),
          ]);
          const userName = resolveUserName(user);
          const childName = child?.name || "seu filho(a)";
          const susVaccine = allVaccines.find((v) => v.id === record.susVaccineId);
          notifyCaregivers(
            childId, userId,
            "💉 Nova vacina registrada",
            `${userName} registrou a vacina ${susVaccine?.name || record.dose} para o ${childName}`,
            "/vaccines",
          );
        } catch (err) {
          console.error("[bg] Erro pós-criação de vacina:", err);
        }
      })();
    },
  );

  app.patch(
    api.vaccineRecords.update.path,
    isAuthenticated,
    async (req, res) => {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Não autenticado" });

      const id = Number(req.params.id);
      const existing = await storage.getVaccineRecordById(id);
      if (!existing) {
        return res
          .status(404)
          .json({ message: "Registro de vacina não encontrado" });
      }
      if (!(await hasChildAccess(userId, existing.childId))) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const input = api.vaccineRecords.update.input.parse(req.body);
      const record = await storage.updateVaccineRecord(id, input);

      if ('photoUrls' in input && existing.photoUrls?.length) {
        const newSet = new Set(input.photoUrls || []);
        for (const oldUrl of existing.photoUrls) {
          if (!newSet.has(oldUrl)) {
            deleteFromStorage(oldUrl).catch(() => {});
          }
        }
      }

      res.json(record);
    },
  );

  app.delete(
    api.vaccineRecords.delete.path,
    isAuthenticated,
    async (req, res) => {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Não autenticado" });

      const id = Number(req.params.id);
      const existing = await storage.getVaccineRecordById(id);
      if (!existing) {
        return res
          .status(404)
          .json({ message: "Registro de vacina não encontrado" });
      }
      if (!(await hasChildAccess(userId, existing.childId))) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      await db.transaction(async (tx) => {
        await storage.deleteVaccineRecord(id, tx);
        await recordPoints(tx, existing.childId, -15, 'vaccine_record_delete', 'vaccine_record', id);
      });

      if (existing.photoUrls?.length) {
        for (const url of existing.photoUrls) {
          deleteFromStorage(url).catch(() => {});
        }
      }

      res.status(204).end();
    },
  );

  // Delete Account
  app.delete("/api/account", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    try {
      await storage.deleteUserAccount(userId);

      // Clear session
      req.logout?.((err: any) => {
        if (err) console.error("Logout error:", err);
      });

      res.status(200).json({ message: "Conta excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Erro ao excluir conta" });
    }
  });

  // Daily Photos (Foto do dia)
  app.get(api.dailyPhotos.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);

    // Verify user has access to this child
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const photos = await storage.getDailyPhotos(
      childId,
      Number(req.query.limit) || 30,
      Number(req.query.offset) || 0,
    );
    res.json(photos);
  });

  app.get(api.dailyPhotos.today.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);

    // Verify user has access to this child
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const today = new Date().toISOString().split("T")[0];
    const photo = await storage.getDailyPhotoByDate(childId, today);
    res.json(photo || null);
  });

  app.post(api.dailyPhotos.create.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);

    // Verify user has access to this child
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const input = api.dailyPhotos.create.input.parse(req.body);

    const existing = await storage.getDailyPhotoByDate(childId, input.date);
    let oldPhotoUrl: string | null = null;

    try {
      let photo: any;
      await db.transaction(async (tx) => {
        if (existing) {
          oldPhotoUrl = existing.photoUrl;
          await storage.deleteDailyPhoto(existing.id, tx);
        }
        photo = await storage.createDailyPhoto({ ...input, childId }, tx);
        if (!existing) {
          await recordPoints(tx, childId, 5, 'daily_photo_create', 'daily_photo', photo.id);
        }
      });

      if (oldPhotoUrl) {
        deleteFromStorage(oldPhotoUrl).catch(() => {});
      }

      // Responde imediatamente
      res.status(201).json(photo);

      // Background: notificações
      (async () => {
        try {
          const [user, child] = await Promise.all([
            storage.getUser(userId),
            storage.getChild(childId),
          ]);
          const userName = resolveUserName(user);
          const childName = child?.name || "seu filho(a)";
          notifyCaregivers(
            childId, userId,
            "📸 Nova Foto do Dia!",
            `${userName} adicionou a foto do dia do ${childName}`,
            "/daily-photos",
          );
        } catch (err) {
          console.error("[bg] Erro pós-criação de foto:", err);
        }
      })();
    } catch (error: any) {
      // Handle unique constraint violation (race condition)
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ message: "Já existe uma foto para esta data" });
      }
      throw error;
    }
  });

  app.delete(api.dailyPhotos.delete.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Get the photo to check ownership
    const photo = await storage.getDailyPhotoById(id);
    if (!photo) {
      return res.status(404).json({ message: "Foto não encontrada" });
    }

    // Verify user has access to this child
    if (!(await hasChildAccess(userId, photo.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    await db.transaction(async (tx) => {
      await storage.deleteDailyPhoto(id, tx);
      await recordPoints(tx, photo.childId, -5, 'daily_photo_delete', 'daily_photo', id);
    });

    if (photo.photoUrl) {
      deleteFromStorage(photo.photoUrl).catch(() => {});
    }

    res.status(204).end();
  });

  // Admin: verifica consistência entre gamification.points e SUM(events)
  app.get("/admin/gamification/verify/:childId", isAuthenticated, async (req, res) => {
    const childId = Number(req.params.childId);
    if (!childId || isNaN(childId)) {
      return res.status(400).json({ message: "childId inválido" });
    }
    try {
      const [consistencyRow] = (await db.execute(
        sql`SELECT verify_gamification(${childId}) AS consistent`
      ) as unknown) as any[];
      const [eventsRow] = (await db.execute(
        sql`SELECT COALESCE(SUM(delta), 0) AS real_sum FROM gamification_events WHERE child_id = ${childId}`
      ) as unknown) as any[];
      const cached = await storage.getGamification(childId);
      res.json({
        childId,
        consistent: consistencyRow?.consistent ?? null,
        cachedPoints: cached?.points ?? 0,
        realSum: Number(eventsRow?.real_sum ?? 0),
      });
    } catch (err) {
      console.error("[admin] verify_gamification error:", err);
      res.status(500).json({ message: "Erro ao verificar gamificação" });
    }
  });

  app.get("/.well-known/assetlinks.json", (_req, res) => {
    res.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "app.replit.baby_growth_tracker.twa",
          sha256_cert_fingerprints: [
            "64:93:38:65:F1:4C:8E:C6:69:96:C5:23:27:92:1E:ED:2A:7F:82:1F:14:E2:EC:69:88:A6:B0:61:75:6C:D2:7E",
          ],
        },
      },
    ]);
  });

  app.get("/delete-account", (req, res, next) => {
    const userAgent = req.headers["user-agent"] || "";
    const isBot =
      /bot|crawl|spider|google|facebook|whatsapp|telegram|preview/i.test(
        userAgent,
      );

    if (!isBot) {
      return next();
    }

    res.status(200).set({ "Content-Type": "text/html" }).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Excluir Conta - Filhos</title>
  <meta name="description" content="Solicite a exclusão da sua conta e de todos os seus dados pessoais do aplicativo Filhos.">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; background: #f5faf8; color: #2d3e50; padding: 24px; min-height: 100vh; }
    .container { max-width: 480px; margin: 0 auto; }
    .warning-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    .warning-title { font-size: 20px; font-weight: 700; color: #b91c1c; margin-bottom: 4px; }
    .warning-subtitle { font-size: 14px; color: #dc2626; }
    .content-box { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
    ul { list-style: none; }
    li { font-size: 14px; color: #6b7280; padding: 6px 0; padding-left: 24px; position: relative; }
    li::before { content: "\\2022"; color: #ef4444; position: absolute; left: 8px; }
    .info { font-size: 13px; color: #6b7280; text-align: center; margin-top: 16px; line-height: 1.5; }
    .steps { margin-top: 24px; }
    .steps h2 { margin-bottom: 12px; }
    .steps ol { padding-left: 20px; }
    .steps li { list-style: decimal; padding-left: 4px; }
    .steps li::before { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="warning-box">
      <h1 class="warning-title">Excluir Conta</h1>
      <p class="warning-subtitle">Esta ação é irreversível</p>
    </div>
    <div class="content-box">
      <h2>O que será excluído:</h2>
      <ul>
        <li>Todos os perfis de crianças cadastradas</li>
        <li>Registros de crescimento e medidas</li>
        <li>Carteira de vacinação completa</li>
        <li>Registros de saúde e consultas</li>
        <li>Marcos e memórias</li>
        <li>Fotos do dia</li>
        <li>Sua conta e todos os dados pessoais</li>
      </ul>
    </div>
    <div class="content-box steps">
      <h2>Como excluir sua conta:</h2>
      <ol>
        <li>Faça login no aplicativo Filhos</li>
        <li>Acesse esta página pelo menu de configurações ou diretamente pelo link</li>
        <li>Digite a palavra EXCLUIR no campo de confirmação</li>
        <li>Clique em "Excluir minha conta permanentemente"</li>
      </ol>
    </div>
    <p class="info">
      Após a exclusão, você será desconectado automaticamente e não poderá recuperar seus dados.
      A exclusão é processada imediatamente após a confirmação.
    </p>
  </div>
</body>
</html>`);
  });

  // Push Notifications (vapid-key já registrado acima, antes do rate limiter)

  app.post("/api/push/subscribe", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "Dados de assinatura inválidos" });
    }

    const sub = await storage.createPushSubscription({
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    res.status(201).json({ message: "Notificações ativadas!" });
  });

  app.post("/api/push/unsubscribe", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: "Endpoint obrigatório" });
    }

    await storage.deletePushSubscriptionByUser(userId, endpoint);
    res.json({ message: "Notificações desativadas" });
  });

  app.get("/api/push/status", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const subs = await storage.getPushSubscriptionsByUserId(userId);
    res.json({ subscribed: subs.length > 0, count: subs.length });
  });

  app.post("/api/push/test", pushTestLimiter, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const webpushModule = await import("web-push");
    const webpush = webpushModule.default || webpushModule;
    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res
        .status(500)
        .json({ message: "Push notifications não configuradas" });
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:filhos@replit.app",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    );

    const subs = await storage.getPushSubscriptionsByUserId(userId);
    if (subs.length === 0) {
      return res.status(400).json({ message: "Nenhuma assinatura encontrada" });
    }

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: "💉 Teste de Notificação",
            body: "As notificações de vacinas estão funcionando!",
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-72x72.png",
            tag: "test",
            data: { url: "/" },
          }),
        );
        sent++;
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await storage.deletePushSubscription(sub.endpoint);
        }
      }
    }

    res.json({ message: `Notificação de teste enviada!`, sent });
  });

  // === INVITE CODES (Compartilhar crianças entre cuidadores) ===

  // Gerar código de convite
  app.post(api.invites.generate.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!childId || isNaN(childId)) {
      return res.status(400).json({ message: "ID da criança inválido" });
    }

    const hasAccess = await hasChildAccess(userId, childId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const { relationship } = req.body;

    // Gerar código curto no formato FLH-XXXX
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I,O,0,1 para evitar confusão
    let code = "FLH-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Expira em 48 horas
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const invite = await storage.createInviteCode({
      code,
      childId,
      createdBy: userId,
      relationship: relationship || "caregiver",
      expiresAt,
    });

    // Buscar nome da criança para exibição
    const children = await storage.getChildrenByUserId(userId);
    const child = children.find((c) => c.id === childId);

    res.status(201).json({
      code: invite.code,
      expiresAt: invite.expiresAt,
      childName: child?.name || "Criança",
    });
  });

  // Resgatar código de convite
  app.post(api.invites.redeem.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const { code, relationship } = req.body;
    if (!code) {
      return res.status(400).json({ message: "Código obrigatório" });
    }

    // Normalizar código (uppercase, manter o hífen)
    const normalizedCode = code.trim().toUpperCase();

    const invite = await storage.getInviteCodeByCode(normalizedCode);
    if (!invite) {
      return res.status(404).json({ message: "Código não encontrado" });
    }

    // Verificar se já foi usado
    if (invite.usedBy) {
      return res.status(409).json({ message: "Este código já foi utilizado" });
    }

    // Verificar expiração
    if (new Date() > new Date(invite.expiresAt)) {
      return res.status(400).json({ message: "Este código expirou" });
    }

    // Não pode resgatar o próprio código
    if (invite.createdBy === userId) {
      return res
        .status(400)
        .json({ message: "Você não pode resgatar seu próprio código" });
    }

    // Verificar se já é cuidador desta criança
    const existingChildren = await storage.getChildrenByUserId(userId);
    if (existingChildren.some((c) => c.id === invite.childId)) {
      return res
        .status(409)
        .json({ message: "Você já tem acesso a esta criança" });
    }

    // Criar vínculo de cuidador
    await storage.createCaregiver({
      childId: invite.childId,
      userId,
      relationship: relationship || invite.relationship || "caregiver",
      role: "caregiver",
    });

    // Marcar código como usado
    await storage.markInviteCodeUsed(invite.id, userId);

    // Buscar dados da criança (necessário para notificação e resposta)
    const child = await storage.getChild(invite.childId);

    // 🔔 Notificar o dono (quem criou o convite) que alguém aceitou
    try {
      const ownerSubs = await storage.getPushSubscriptionsByUserId(
        invite.createdBy,
      );
      if (ownerSubs.length > 0) {
        const webpushModule = await import("web-push");
        const webpush = webpushModule.default || webpushModule;
        const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
        const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

        if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
          webpush.setVapidDetails(
            process.env.VAPID_SUBJECT || "mailto:filhos@replit.app",
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY,
          );

          // Buscar dados do novo cuidador para personalizar a notificação
          const newCaregiver = await authStorage.getUser(userId);
          let caregiverName = resolveUserName(newCaregiver);
          if (caregiverName === "Alguém" && newCaregiver?.email) {
            caregiverName = newCaregiver.email;
          }

          const payload = JSON.stringify({
            title: `👶 Novo cuidador de ${child?.name || "sua criança"}!`,
            body: `${caregiverName} aceitou seu convite e agora também cuida de ${child?.name || "sua criança"}.`,
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-72x72.png",
            tag: `caregiver-accepted-${invite.childId}-${userId}`,
            data: { url: "/settings" },
          });

          for (const sub of ownerSubs) {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                payload,
              );
            } catch (err: any) {
              if (err.statusCode === 404 || err.statusCode === 410) {
                await storage.deletePushSubscription(sub.endpoint);
              }
            }
          }
        }
      }
    } catch (notifError) {
      // Notificação é best-effort — não bloqueia a resposta
      console.error(
        "Erro ao enviar notificação de cuidador aceito:",
        notifError,
      );
    }

    res.json({
      message: "Convite aceito! Você agora pode acompanhar esta criança.",
      childName: child?.name || "Criança",
      childId: invite.childId,
    });
  });

  // Listar convites de uma criança
  app.get(api.invites.listForChild.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!childId || isNaN(childId)) {
      return res.status(400).json({ message: "ID da criança inválido" });
    }

    const hasAccess = await hasChildAccess(userId, childId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const invites = await storage.getInviteCodesByChildId(childId);
    res.json(invites);
  });

  // Listar cuidadores de uma criança
  app.get(api.invites.caregivers.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!childId || isNaN(childId)) {
      return res.status(400).json({ message: "ID da criança inválido" });
    }

    const hasAccess = await hasChildAccess(userId, childId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const caregiversList = await storage.getCaregiversByChildId(childId);
    res.json(caregiversList);
  });

  // Cuidador sai de uma criança (auto-remoção)
  app.post(api.invites.leaveChild.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!childId || isNaN(childId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const role = await storage.getCaregiverRole(userId, childId);
    if (!role) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    if (role === "owner") {
      return res.status(403).json({
        message:
          "O responsável principal não pode sair. Exclua a criança se desejar.",
      });
    }

    await storage.removeCaregiverByUserId(childId, userId);
    res.json({ message: "Você saiu do cuidado desta criança" });
  });

  // Remover cuidador de uma criança
  app.delete(
    api.invites.removeCareiver.path,
    isAuthenticated,
    async (req, res) => {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Não autenticado" });

      const childId = Number(req.params.childId);
      const caregiverId = Number(req.params.caregiverId);

      if (!childId || isNaN(childId) || !caregiverId || isNaN(caregiverId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }

      const hasAccess = await hasChildAccess(userId, childId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Verificar se o cuidador alvo não é o próprio owner (não pode se remover)
      const caregiversList = await storage.getCaregiversByChildId(childId);
      const target = caregiversList.find((c) => c.id === caregiverId);
      if (!target) {
        return res.status(404).json({ message: "Cuidador não encontrado" });
      }

      await storage.removeCaregiverFromChild(childId, caregiverId);
      res.json({ message: "Cuidador removido com sucesso" });
    },
  );

  // === COMMENTS (Comentários em marcos e outros registros) ===

  // Listar comentários por registro específico
  app.get(api.comments.listByRecord.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const recordType = String(req.params.recordType);
    const recordId = String(req.params.recordId);
    const comments = await storage.getCommentsByRecord(
      childId,
      recordType,
      Number(recordId),
    );
    res.json(comments);
  });

  // Listar todos os comentários de uma criança
  app.get(api.comments.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const comments = await storage.getCommentsByChild(childId);
    res.json(comments);
  });

  // Criar comentário
  app.post(api.comments.create.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    try {
      const input = api.comments.create.input.parse(req.body);
      const comment = await storage.createComment({
        childId,
        userId,
        recordType: input.recordType,
        recordId: input.recordId,
        text: input.text,
      });

      // Responde imediatamente
      res.status(201).json(comment);

      // Background: notificações (não bloqueia a resposta)
      (async () => {
        try {
          const [user, child] = await Promise.all([
            storage.getUser(userId),
            storage.getChild(childId),
          ]);
          const userName = resolveUserName(user);
          const childName = child?.name || "seu filho(a)";
          notifyCaregivers(
            childId,
            userId,
            "💬 Novo comentário",
            `${userName} comentou em um marco de ${childName}`,
            `/memories?tab=milestones&id=${comment.recordId}`,
          );
        } catch (err) {
          console.error("[bg] Erro pós-criação de comentário:", err);
        }
      })();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Editar comentário (apenas o autor)
  app.patch(api.comments.update.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const commentId = Number(req.params.id);
    if (!commentId || isNaN(commentId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const { text } = api.comments.update.input.parse(req.body);

    const [existingComment] = await db
      .select()
      .from(activityComments)
      .where(drizzleEq(activityComments.id, commentId));

    if (!existingComment) {
      return res.status(404).json({ message: "Comentário não encontrado" });
    }

    if (existingComment.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Apenas o autor pode editar o comentário" });
    }

    const updated = await storage.updateComment(commentId, text);
    res.json(updated);
  });

  // Deletar comentário (apenas o autor ou cuidador da criança)
  app.delete(api.comments.delete.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const commentId = Number(req.params.id);
    if (!commentId || isNaN(commentId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const [existingComment] = await db
      .select()
      .from(activityComments)
      .where(drizzleEq(activityComments.id, commentId));

    if (!existingComment) {
      return res.status(404).json({ message: "Comentário não encontrado" });
    }

    // Verificar acesso: ser o autor OU ter acesso à criança
    if (existingComment.userId !== userId) {
      const hasAccess = await hasChildAccess(userId, existingComment.childId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Acesso negado" });
      }
    }

    await storage.deleteComment(commentId);
    res.status(204).send();
  });

  // === MILESTONE LIKES ===

  // Obter status de like de um marco
  app.get(api.likes.get.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const milestoneId = Number(req.params.milestoneId);
    if (!milestoneId || isNaN(milestoneId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Verificar acesso via milestone
    const milestone = await storage.getMilestoneById(milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: "Marco não encontrado" });
    }
    if (!(await hasChildAccess(userId, milestone.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const status = await storage.getMilestoneLikeStatus(milestoneId, userId);
    res.json(status);
  });

  // Toggle like em um marco
  app.post(api.likes.toggle.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const milestoneId = Number(req.params.milestoneId);
    if (!milestoneId || isNaN(milestoneId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Verificar acesso via milestone
    const milestone = await storage.getMilestoneById(milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: "Marco não encontrado" });
    }
    if (!(await hasChildAccess(userId, milestone.childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const status = await storage.toggleMilestoneLike(milestoneId, userId);
    res.json(status);

    if (status.userLiked) {
      (async () => {
        try {
          const [user, child] = await Promise.all([
            storage.getUser(userId),
            storage.getChild(milestone.childId),
          ]);
          const userName = resolveUserName(user);
          const childName = child?.name || "seu filho(a)";
          notifyCaregivers(
            milestone.childId,
            userId,
            "❤️ Novo coraçãozinho!",
            `${userName} amou o marco "${milestone.title}" de ${childName}`,
            `/memories?tab=milestones&id=${milestone.id}`,
          );
        } catch (err) {
          console.error("[bg] Erro pós-like:", err);
        }
      })();
    }
  });

  // === PERFIL DO USUÁRIO ===

  // Atualizar dados de exibição do perfil (nome/sobrenome customizáveis)
  app.put("/api/profile", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const schema = z.object({
      displayFirstName: z.string().min(1).max(50).optional().nullable(),
      displayLastName: z.string().max(80).optional().nullable(),
    });

    try {
      const data = schema.parse(req.body);
      const updated = await authStorage.updateUserProfile(userId, {
        displayFirstName: data.displayFirstName ?? null,
        displayLastName: data.displayLastName ?? null,
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Salvar URL da foto de perfil (após upload via /api/upload)
  app.post("/api/profile/photo", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    // Modo 1: recebe URL já processada pelo /api/upload
    if (req.body.url) {
      const updated = await authStorage.updateUserProfile(userId, {
        displayPhotoUrl: req.body.url,
      });
      return res.json({ user: updated });
    }

    // Modo 2: base64 direto (legacy / fallback quando /api/upload não usado)
    const { base64, mimeType } = req.body;
    if (!base64 || !mimeType) {
      return res
        .status(400)
        .json({ message: "url ou base64+mimeType são obrigatórios" });
    }

    try {
      const url = await uploadToStorage(
        "profile-photos",
        `${userId}/avatar.jpg`,
        base64,
        mimeType,
      );
      const updated = await authStorage.updateUserProfile(userId, {
        displayPhotoUrl: url,
      });
      res.json({ url, user: updated });
    } catch (err: any) {
      console.error("Profile photo upload failed:", err);
      res.status(500).json({ message: "Erro ao processar foto" });
    }
  });

  // === UPLOAD UNIVERSAL DE FOTO (Supabase Storage) ===
  // Aceita: { base64, mimeType, bucket, path }
  // buckets permitidos: child-photos, milestone-photos, daily-photos
  app.post("/api/upload", uploadLimiter, isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const allowed: UploadBucket[] = [
      "child-photos",
      "milestone-photos",
      "daily-photos",
      "profile-photos",
      "vaccine-photos",
    ];
    const { base64, mimeType, bucket, path: filePath } = req.body;

    if (!base64 || !mimeType || !bucket || !filePath) {
      return res
        .status(400)
        .json({ message: "base64, mimeType, bucket e path são obrigatórios" });
    }
    if (!allowed.includes(bucket)) {
      return res.status(400).json({ message: "Bucket não permitido" });
    }
    // Previne path traversal
    if (filePath.includes("..") || filePath.startsWith("/")) {
      return res.status(400).json({ message: "Path inválido" });
    }

    try {
      const url = await uploadToStorage(bucket, filePath, base64, mimeType);
      res.json({ url });
    } catch (err: any) {
      console.error("[upload] Failed:", err.message);
      res.status(500).json({ message: "Erro ao fazer upload da foto" });
    }
  });

  startVaccineNotificationScheduler();

  return httpServer;
}
