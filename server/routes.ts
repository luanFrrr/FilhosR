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

  app.get(api.auth.gamification.path, async (req, res) => {
    // @ts-ignore
    const g = await storage.getGamification(req.user.id);
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

      // Gamification points
      // @ts-ignore
      await storage.addPoints(req.user.id, 50);

      res.status(201).json(child);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.children.get.path, async (req, res) => {
    const child = await storage.getChild(Number(req.params.id));
    if (!child) return res.status(404).json({ message: "Not found" });
    res.json(child);
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
    
    // @ts-ignore
    await storage.addPoints(req.user.id, 10);
    res.status(201).json(record);
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
    
    // @ts-ignore
    await storage.addPoints(req.user.id, 10);
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

  // Milestones
  app.get(api.milestones.list.path, async (req, res) => {
    const records = await storage.getMilestones(Number(req.params.childId));
    res.json(records);
  });

  app.post(api.milestones.create.path, async (req, res) => {
    const childId = Number(req.params.childId);
    const input = api.milestones.create.input.parse(req.body);
    const record = await storage.createMilestone({ ...input, childId });
    
    // @ts-ignore
    await storage.addPoints(req.user.id, 20);
    res.status(201).json(record);
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
    
    // @ts-ignore
    await storage.addPoints(req.user.id, 5);
    res.status(201).json(record);
  });

  return httpServer;
}
