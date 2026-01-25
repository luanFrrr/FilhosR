import { 
  users, children, caregivers, growthRecords, vaccines, healthRecords, milestones, diaryEntries, gamification,
  type User, type InsertUser,
  type Child, type InsertChild,
  type GrowthRecord, type InsertGrowthRecord,
  type Vaccine, type InsertVaccine,
  type HealthRecord, type InsertHealthRecord,
  type Milestone, type InsertMilestone,
  type DiaryEntry, type InsertDiaryEntry,
  type Gamification
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Children
  getChild(id: number): Promise<Child | undefined>;
  getChildrenByUserId(userId: number): Promise<Child[]>;
  createChild(child: InsertChild): Promise<Child>;
  updateChild(id: number, child: Partial<InsertChild>): Promise<Child>;
  deleteChild(id: number): Promise<void>;

  // Growth
  getGrowthRecords(childId: number): Promise<GrowthRecord[]>;
  createGrowthRecord(record: InsertGrowthRecord): Promise<GrowthRecord>;

  // Vaccines
  getVaccines(childId: number): Promise<Vaccine[]>;
  createVaccine(vaccine: InsertVaccine): Promise<Vaccine>;
  updateVaccine(id: number, vaccine: Partial<InsertVaccine>): Promise<Vaccine>;

  // Health
  getHealthRecords(childId: number): Promise<HealthRecord[]>;
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;

  // Milestones
  getMilestones(childId: number): Promise<Milestone[]>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;

  // Diary
  getDiaryEntries(childId: number): Promise<DiaryEntry[]>;
  createDiaryEntry(entry: InsertDiaryEntry): Promise<DiaryEntry>;

  // Gamification
  getGamification(userId: number): Promise<Gamification | undefined>;
  addPoints(userId: number, points: number): Promise<Gamification>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    // Initialize gamification
    await db.insert(gamification).values({ userId: user.id, points: 0, level: 'Iniciante' });
    return user;
  }

  // Children
  async getChild(id: number): Promise<Child | undefined> {
    const [child] = await db.select().from(children).where(eq(children.id, id));
    return child;
  }

  async getChildrenByUserId(userId: number): Promise<Child[]> {
    // Join caregivers to find children
    const results = await db
      .select({ child: children })
      .from(caregivers)
      .innerJoin(children, eq(caregivers.childId, children.id))
      .where(eq(caregivers.userId, userId));
    
    return results.map(r => r.child);
  }

  async createChild(child: InsertChild): Promise<Child> {
    const [newChild] = await db.insert(children).values(child).returning();
    return newChild;
  }

  async updateChild(id: number, updates: Partial<InsertChild>): Promise<Child> {
    const [updated] = await db.update(children).set(updates).where(eq(children.id, id)).returning();
    return updated;
  }

  async deleteChild(id: number): Promise<void> {
    await db.delete(caregivers).where(eq(caregivers.childId, id));
    await db.delete(growthRecords).where(eq(growthRecords.childId, id));
    await db.delete(vaccines).where(eq(vaccines.childId, id));
    await db.delete(healthRecords).where(eq(healthRecords.childId, id));
    await db.delete(milestones).where(eq(milestones.childId, id));
    await db.delete(diaryEntries).where(eq(diaryEntries.childId, id));
    await db.delete(children).where(eq(children.id, id));
  }

  // Growth
  async getGrowthRecords(childId: number): Promise<GrowthRecord[]> {
    return await db.select().from(growthRecords).where(eq(growthRecords.childId, childId));
  }

  async createGrowthRecord(record: InsertGrowthRecord): Promise<GrowthRecord> {
    const [newRecord] = await db.insert(growthRecords).values(record).returning();
    return newRecord;
  }

  // Vaccines
  async getVaccines(childId: number): Promise<Vaccine[]> {
    return await db.select().from(vaccines).where(eq(vaccines.childId, childId));
  }

  async createVaccine(vaccine: InsertVaccine): Promise<Vaccine> {
    const [newVaccine] = await db.insert(vaccines).values(vaccine).returning();
    return newVaccine;
  }

  async updateVaccine(id: number, updates: Partial<InsertVaccine>): Promise<Vaccine> {
    const [updated] = await db.update(vaccines).set(updates).where(eq(vaccines.id, id)).returning();
    return updated;
  }

  // Health
  async getHealthRecords(childId: number): Promise<HealthRecord[]> {
    return await db.select().from(healthRecords).where(eq(healthRecords.childId, childId));
  }

  async createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord> {
    const [newRecord] = await db.insert(healthRecords).values(record).returning();
    return newRecord;
  }

  // Milestones
  async getMilestones(childId: number): Promise<Milestone[]> {
    return await db.select().from(milestones).where(eq(milestones.childId, childId));
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [newMilestone] = await db.insert(milestones).values(milestone).returning();
    return newMilestone;
  }

  // Diary
  async getDiaryEntries(childId: number): Promise<DiaryEntry[]> {
    return await db.select().from(diaryEntries).where(eq(diaryEntries.childId, childId));
  }

  async createDiaryEntry(entry: InsertDiaryEntry): Promise<DiaryEntry> {
    const [newEntry] = await db.insert(diaryEntries).values(entry).returning();
    return newEntry;
  }

  // Gamification
  async getGamification(userId: number): Promise<Gamification | undefined> {
    const [g] = await db.select().from(gamification).where(eq(gamification.userId, userId));
    return g;
  }

  async addPoints(userId: number, points: number): Promise<Gamification> {
    const current = await this.getGamification(userId);
    const newPoints = (current?.points || 0) + points;
    
    // Simple level logic
    let level = 'Iniciante';
    if (newPoints > 100) level = 'Cuidador Atento';
    if (newPoints > 500) level = 'Mãe/Pai Dedicado';
    if (newPoints > 1000) level = 'Mãe/Pai Coruja';
    if (newPoints > 2000) level = 'Guardião da Infância';

    const [updated] = await db.update(gamification)
      .set({ points: newPoints, level, updatedAt: new Date() })
      .where(eq(gamification.userId, userId))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
