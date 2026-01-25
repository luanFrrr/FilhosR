import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { caregivers } from "@shared/schema"; // Need this for inserting caregiver relation
import { db } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === AUTH MOCK FOR NOW ===
  // In a real app with Replit Auth, we'd use req.user
  // For this demo, we'll auto-create a user if none exists and use ID 1
  app.use(async (req, res, next) => {
    // Check if we have any users
    let user = await storage.getUser(1);
    if (!user) {
      user = await storage.createUser({
        email: "demo@example.com",
        name: "Demo Parent"
      });
    }
    // @ts-ignore
    req.user = user;
    next();
  });

  // === API ROUTES ===

  // Auth/Me
  app.get(api.auth.me.path, (req, res) => {
    // @ts-ignore
    res.json(req.user);
  });

  // Gamification is now per-child - this endpoint requires childId as query param
  app.get(api.auth.gamification.path, async (req, res) => {
    const childId = Number(req.query.childId);
    if (!childId || isNaN(childId)) {
      return res.json({ points: 0, level: 'Iniciante' });
    }
    
    // Verify user has access to this child
    // @ts-ignore
    const userChildren = await storage.getChildrenByUserId(req.user.id);
    const hasAccess = userChildren.some(c => c.id === childId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    
    const g = await storage.getGamification(childId);
    res.json(g || { points: 0, level: 'Iniciante' });
  });

  // Children
  app.get(api.children.list.path, async (req, res) => {
    // @ts-ignore
    const children = await storage.getChildrenByUserId(req.user.id);
    res.json(children);
  });

  app.post(api.children.create.path, async (req, res) => {
    try {
      const input = api.children.create.input.parse(req.body);
      const child = await storage.createChild(input);
      
      // Link to current user as Owner
      // @ts-ignore
      await db.insert(caregivers).values({
        childId: child.id,
        // @ts-ignore
        userId: req.user.id,
        relationship: 'parent', // Default
        role: 'owner'
      });

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

  app.put(api.children.update.path, async (req, res) => {
    const id = Number(req.params.id);
    const input = api.children.update.input.parse(req.body);
    const record = await storage.updateChild(id, input);
    res.json(record);
  });

  app.delete(api.children.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteChild(id);
    res.status(204).end();
  });

  // Growth
  app.get(api.growth.list.path, async (req, res) => {
    const records = await storage.getGrowthRecords(Number(req.params.childId));
    res.json(records);
  });

  app.post(api.growth.create.path, async (req, res) => {
    const childId = Number(req.params.childId);
    const input = api.growth.create.input.parse(req.body);
    const record = await storage.createGrowthRecord({ ...input, childId });
    
    await storage.addPoints(childId, 10);
    res.status(201).json(record);
  });

  app.patch(api.growth.update.path, async (req, res) => {
    const id = Number(req.params.id);
    const input = api.growth.update.input.parse(req.body);
    const record = await storage.updateGrowthRecord(id, input);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.json(record);
  });

  app.post(api.growth.archive.path, async (req, res) => {
    const id = Number(req.params.id);
    const record = await storage.archiveGrowthRecord(id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.json(record);
  });

  // Vaccines
  app.get(api.vaccines.list.path, async (req, res) => {
    const records = await storage.getVaccines(Number(req.params.childId));
    res.json(records);
  });

  app.post(api.vaccines.create.path, async (req, res) => {
    const childId = Number(req.params.childId);
    const input = api.vaccines.create.input.parse(req.body);
    const record = await storage.createVaccine({ ...input, childId });
    
    await storage.addPoints(childId, 10);
    res.status(201).json(record);
  });

  app.patch(api.vaccines.update.path, async (req, res) => {
    const id = Number(req.params.id);
    const input = api.vaccines.update.input.parse(req.body);
    const record = await storage.updateVaccine(id, input);
    res.json(record);
  });

  // Health
  app.get(api.health.list.path, async (req, res) => {
    const records = await storage.getHealthRecords(Number(req.params.childId));
    res.json(records);
  });

  app.post(api.health.create.path, async (req, res) => {
    const childId = Number(req.params.childId);
    const input = api.health.create.input.parse(req.body);
    const record = await storage.createHealthRecord({ ...input, childId });
    res.status(201).json(record);
  });

  app.patch(api.health.update.path, async (req, res) => {
    const id = Number(req.params.id);
    const input = api.health.update.input.parse(req.body);
    const record = await storage.updateHealthRecord(id, input);
    if (!record) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    res.json(record);
  });

  app.post(api.health.archive.path, async (req, res) => {
    const id = Number(req.params.id);
    const record = await storage.archiveHealthRecord(id);
    if (!record) {
      return res.status(404).json({ message: "Registro não encontrado" });
    }
    res.json(record);
  });

  // Milestones
  app.get(api.milestones.list.path, async (req, res) => {
    const records = await storage.getMilestones(Number(req.params.childId));
    res.json(records);
  });

  app.post(api.milestones.create.path, async (req, res) => {
    const childId = Number(req.params.childId);
    const input = api.milestones.create.input.parse(req.body);
    const record = await storage.createMilestone({ ...input, childId });
    
    await storage.addPoints(childId, 20);
    res.status(201).json(record);
  });

  app.patch(api.milestones.update.path, async (req, res) => {
    const milestoneId = Number(req.params.milestoneId);
    const input = api.milestones.update.input.parse(req.body);
    const record = await storage.updateMilestone(milestoneId, input);
    if (!record) {
      return res.status(404).json({ message: "Marco não encontrado" });
    }
    res.json(record);
  });

  app.delete(api.milestones.delete.path, async (req, res) => {
    const milestoneId = Number(req.params.milestoneId);
    const deleted = await storage.deleteMilestone(milestoneId);
    if (!deleted) {
      return res.status(404).json({ message: "Marco não encontrado" });
    }
    res.status(204).send();
  });

  // Diary
  app.get(api.diary.list.path, async (req, res) => {
    const records = await storage.getDiaryEntries(Number(req.params.childId));
    res.json(records);
  });

  app.post(api.diary.create.path, async (req, res) => {
    const childId = Number(req.params.childId);
    const input = api.diary.create.input.parse(req.body);
    const record = await storage.createDiaryEntry({ ...input, childId });
    
    await storage.addPoints(childId, 5);
    res.status(201).json(record);
  });

  // SUS Vaccines Catalog
  app.get(api.susVaccines.list.path, async (req, res) => {
    // Initialize vaccines if not present
    await storage.initializeSusVaccines();
    const vaccines = await storage.getSusVaccines();
    res.json(vaccines);
  });

  // Vaccine Records (Carteira Vacinal)
  app.get(api.vaccineRecords.list.path, async (req, res) => {
    const records = await storage.getVaccineRecords(Number(req.params.childId));
    res.json(records);
  });

  app.post(api.vaccineRecords.create.path, async (req, res) => {
    const childId = Number(req.params.childId);
    const input = api.vaccineRecords.create.input.parse(req.body);
    const record = await storage.createVaccineRecord({ ...input, childId });
    
    // Gamification: evento vacina_registrada
    await storage.addPoints(childId, 15);
    res.status(201).json(record);
  });

  app.patch(api.vaccineRecords.update.path, async (req, res) => {
    const id = Number(req.params.id);
    const input = api.vaccineRecords.update.input.parse(req.body);
    const record = await storage.updateVaccineRecord(id, input);
    res.json(record);
  });

  app.delete(api.vaccineRecords.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteVaccineRecord(id);
    res.status(204).end();
  });

  return httpServer;
}
