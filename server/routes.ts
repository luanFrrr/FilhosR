import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { caregivers, activityComments } from "@shared/schema";
import { db } from "./db";
import { eq as drizzleEq } from "drizzle-orm";
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
import { uploadToStorage, type UploadBucket } from "./supabaseStorage";

const resolveUserName = (user: any) => {
  if (!user) return "Alguém";
  if (user.profileCustomized) {
    return [user.displayFirstName, user.displayLastName].filter(Boolean).join(" ") || "Alguém";
  }
  return [user.displayFirstName || user.firstName, user.displayLastName || user.lastName].filter(Boolean).join(" ") || "Alguém";
};

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // === SETUP AUTHENTICATION ===
  await setupAuth(app);
  registerAuthRoutes(app);

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

  app.get(api.children.listWithRoles.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childrenWithRoles = await storage.getChildrenWithRolesByUserId(userId);
    res.json(childrenWithRoles);
  });

  app.post(api.children.create.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    try {
      const input = api.children.create.input.parse(req.body);
      const child = await storage.createChild(input);

      // Link to current user as Owner
      await db.insert(caregivers).values({
        childId: child.id,
        userId: userId,
        relationship: "parent", // Default
        role: "owner",
      });

      // Create initial growth record if measurements provided
      const hasWeight =
        input.initialWeight && parseFloat(String(input.initialWeight)) > 0;
      const hasHeight =
        input.initialHeight && parseFloat(String(input.initialHeight)) > 0;
      const hasHead =
        input.initialHeadCircumference &&
        parseFloat(String(input.initialHeadCircumference)) > 0;

      if (hasWeight || hasHeight || hasHead) {
        const growthData: any = {
          childId: child.id,
          date: child.birthDate, // Use birth date as the date for initial measurements
          notes: "Medidas ao nascer",
        };

        if (hasWeight) growthData.weight = String(input.initialWeight);
        if (hasHeight) growthData.height = String(input.initialHeight);
        if (hasHead)
          growthData.headCircumference = String(input.initialHeadCircumference);

        await storage.createGrowthRecord(growthData);
      }

      // Gamification points - initialize for new child
      await storage.addPoints(child.id, 50);

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

    const input = api.children.update.input.parse(req.body);
    const record = await storage.updateChild(id, input);
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
      return res.status(403).json({ message: "Apenas o responsável principal pode excluir" });
    }

    await storage.deleteChild(id);
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
    const record = await storage.createGrowthRecord({ ...input, childId });

    await storage.addPoints(childId, 10);
    res.status(201).json(record);
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

    const record = await storage.archiveGrowthRecord(id);
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

    const input = api.vaccines.create.input.parse(req.body);
    const record = await storage.createVaccine({ ...input, childId });

    await storage.addPoints(childId, 10);
    res.status(201).json(record);
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
    res.status(201).json(record);
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

  app.post(api.health.archive.path, isAuthenticated, async (req, res) => {
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

    const record = await storage.archiveHealthRecord(id);
    res.json(record);
  });

  // Milestones with social counts (likes + comments)
  app.get("/api/children/:childId/milestones/social", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const milestonesWithSocial = await storage.getMilestonesWithSocialCounts(childId, userId);
    res.json(milestonesWithSocial);
  });

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
    const record = await storage.createMilestone({ ...input, childId });

    await storage.addPoints(childId, 20);

    // Notify other caregivers
    const [user, child] = await Promise.all([storage.getUser(userId), storage.getChild(childId)]);
    const userName = resolveUserName(user);
    const childName = child?.name || "seu filho(a)";
    notifyCaregivers(
      childId,
      userId,
      "✨ Novo marco registrado!",
      `${userName} adicionou um novo marco ao ${childName}: "${record.title}"`
    );

    res.status(201).json(record);
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

    const input = api.milestones.update.input.parse(req.body);
    const record = await storage.updateMilestone(milestoneId, input);
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

    const deleted = await storage.deleteMilestone(milestoneId);
    res.status(204).send();
  });

  // Diary
  app.get(api.diary.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const records = await storage.getDiaryEntries(childId);
    res.json(records);
  });

  app.post(api.diary.create.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    const childId = Number(req.params.childId);
    if (!(await hasChildAccess(userId, childId))) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const input = api.diary.create.input.parse(req.body);
    const record = await storage.createDiaryEntry({ ...input, childId });

    await storage.addPoints(childId, 5);

    // Notify other caregivers
    const [user, child] = await Promise.all([storage.getUser(userId), storage.getChild(childId)]);
    const userName = resolveUserName(user);
    const childName = child?.name || "seu filho(a)";
    notifyCaregivers(
      childId,
      userId,
      "📖 Nova nota no diário",
      `${userName} escreveu uma nova nota no diário do ${childName}`
    );

    res.status(201).json(record);
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

    const input = api.diary.update.input.parse(req.body);
    const updated = await storage.updateDiaryEntry(entryId, input);
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

    await storage.deleteDiaryEntry(entryId);
    res.status(204).send();
  });

  // SUS Vaccines Catalog (public)
  app.get(api.susVaccines.list.path, async (req, res) => {
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
      const record = await storage.createVaccineRecord({ ...input, childId });

      // Gamification: evento vacina_registrada
      await storage.addPoints(childId, 15);

      // Notify other caregivers
      const [user, child, allVaccines] = await Promise.all([
        storage.getUser(userId),
        storage.getChild(childId),
        storage.getSusVaccines()
      ]);
      const userName = resolveUserName(user);
      const childName = child?.name || "seu filho(a)";
      const susVaccine = allVaccines.find(v => v.id === record.susVaccineId);
      notifyCaregivers(
        childId,
        userId,
        "💉 Nova vacina registrada",
        `${userName} registrou a vacina ${susVaccine?.name || record.dose} para o ${childName}`
      );

      res.status(201).json(record);
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

      await storage.deleteVaccineRecord(id);
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

    const photos = await storage.getDailyPhotos(childId);
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

    // Check if photo already exists for this date
    const existing = await storage.getDailyPhotoByDate(childId, input.date);
    if (existing) {
      return res
        .status(409)
        .json({ message: "Já existe uma foto para esta data" });
    }

    try {
      const photo = await storage.createDailyPhoto({ ...input, childId });

      // Gamification: evento foto_do_dia_registrada
      await storage.addPoints(childId, 5);

      // Notify other caregivers
      const [user, child] = await Promise.all([storage.getUser(userId), storage.getChild(childId)]);
      const userName = resolveUserName(user);
      const childName = child?.name || "seu filho(a)";
      notifyCaregivers(
        childId,
        userId,
        "📸 Nova Foto do Dia!",
        `${userName} adicionou a foto do dia do ${childName}`
      );

      res.status(201).json(photo);
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

    await storage.deleteDailyPhoto(id);
    res.status(204).end();
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

  // Push Notifications
  app.get("/api/push/vapid-key", (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
  });

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

  app.post("/api/push/test", isAuthenticated, async (req, res) => {
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
      const ownerSubs = await storage.getPushSubscriptionsByUserId(invite.createdBy);
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
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
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
      console.error("Erro ao enviar notificação de cuidador aceito:", notifError);
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
      return res.status(403).json({ message: "O responsável principal não pode sair. Exclua a criança se desejar." });
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
    const comments = await storage.getCommentsByRecord(childId, recordType, Number(recordId));
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

      // Notificar outros cuidadores
      const [user, child] = await Promise.all([storage.getUser(userId), storage.getChild(childId)]);
      const userName = resolveUserName(user);
      const childName = child?.name || "seu filho(a)";
      notifyCaregivers(
        childId,
        userId,
        "💬 Novo comentário",
        `${userName} comentou em um marco de ${childName}`,
      );

      res.status(201).json(comment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
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
      return res.status(400).json({ message: "url ou base64+mimeType são obrigatórios" });
    }

    try {
      const url = await uploadToStorage(
        "profile-photos",
        `${userId}/avatar.jpg`,
        base64,
        mimeType
      );
      const updated = await authStorage.updateUserProfile(userId, { displayPhotoUrl: url });
      res.json({ url, user: updated });
    } catch (err: any) {
      console.error("Profile photo upload failed:", err);
      res.status(500).json({ message: "Erro ao processar foto" });
    }
  });

  // === UPLOAD UNIVERSAL DE FOTO (Supabase Storage) ===
  // Aceita: { base64, mimeType, bucket, path }
  // buckets permitidos: child-photos, milestone-photos, daily-photos
  app.post("/api/upload", isAuthenticated, async (req: any, res) => {
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
      return res.status(400).json({ message: "base64, mimeType, bucket e path são obrigatórios" });
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
