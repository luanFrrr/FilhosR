import { 
  users, children, caregivers, growthRecords, vaccines, healthRecords, milestones, diaryEntries, gamification, susVaccines, vaccineRecords,
  type User, type InsertUser,
  type Child, type InsertChild,
  type GrowthRecord, type InsertGrowthRecord,
  type Vaccine, type InsertVaccine,
  type HealthRecord, type InsertHealthRecord,
  type Milestone, type InsertMilestone,
  type DiaryEntry, type InsertDiaryEntry,
  type Gamification,
  type SusVaccine, type InsertSusVaccine,
  type VaccineRecord, type InsertVaccineRecord
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
  updateGrowthRecord(id: number, record: Partial<InsertGrowthRecord>): Promise<GrowthRecord>;
  archiveGrowthRecord(id: number): Promise<GrowthRecord>;

  // Vaccines
  getVaccines(childId: number): Promise<Vaccine[]>;
  createVaccine(vaccine: InsertVaccine): Promise<Vaccine>;
  updateVaccine(id: number, vaccine: Partial<InsertVaccine>): Promise<Vaccine>;

  // Health
  getHealthRecords(childId: number): Promise<HealthRecord[]>;
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  updateHealthRecord(id: number, data: Partial<InsertHealthRecord>): Promise<HealthRecord | undefined>;
  archiveHealthRecord(id: number): Promise<HealthRecord | undefined>;

  // Milestones
  getMilestones(childId: number): Promise<Milestone[]>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: number, data: Partial<InsertMilestone>): Promise<Milestone | undefined>;
  deleteMilestone(id: number): Promise<boolean>;

  // Diary
  getDiaryEntries(childId: number): Promise<DiaryEntry[]>;
  createDiaryEntry(entry: InsertDiaryEntry): Promise<DiaryEntry>;

  // Gamification
  getGamification(childId: number): Promise<Gamification | undefined>;
  addPoints(childId: number, points: number): Promise<Gamification>;
  initializeGamification(childId: number): Promise<Gamification>;

  // SUS Vaccines
  getSusVaccines(): Promise<SusVaccine[]>;
  initializeSusVaccines(): Promise<void>;

  // Vaccine Records
  getVaccineRecords(childId: number): Promise<VaccineRecord[]>;
  createVaccineRecord(record: InsertVaccineRecord): Promise<VaccineRecord>;
  updateVaccineRecord(id: number, record: Partial<InsertVaccineRecord>): Promise<VaccineRecord>;
  deleteVaccineRecord(id: number): Promise<void>;
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
    await db.delete(vaccineRecords).where(eq(vaccineRecords.childId, id));
    await db.delete(gamification).where(eq(gamification.childId, id));
    await db.delete(children).where(eq(children.id, id));
  }

  // Growth
  async getGrowthRecords(childId: number): Promise<GrowthRecord[]> {
    const records = await db.select().from(growthRecords).where(eq(growthRecords.childId, childId));
    return records.filter(r => !r.notes?.startsWith("[ARCHIVED]"));
  }

  async createGrowthRecord(record: InsertGrowthRecord): Promise<GrowthRecord> {
    const [newRecord] = await db.insert(growthRecords).values(record).returning();
    return newRecord;
  }

  async updateGrowthRecord(id: number, updates: Partial<InsertGrowthRecord>): Promise<GrowthRecord> {
    const [updated] = await db.update(growthRecords).set(updates).where(eq(growthRecords.id, id)).returning();
    return updated;
  }

  async archiveGrowthRecord(id: number): Promise<GrowthRecord> {
    const [record] = await db.select().from(growthRecords).where(eq(growthRecords.id, id));
    const newNotes = "[ARCHIVED]" + (record?.notes || "");
    const [archived] = await db.update(growthRecords).set({ notes: newNotes }).where(eq(growthRecords.id, id)).returning();
    return archived;
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

  async updateHealthRecord(id: number, data: Partial<InsertHealthRecord>): Promise<HealthRecord | undefined> {
    const [updated] = await db.update(healthRecords).set(data).where(eq(healthRecords.id, id)).returning();
    return updated;
  }

  async archiveHealthRecord(id: number): Promise<HealthRecord | undefined> {
    const existing = await db.select().from(healthRecords).where(eq(healthRecords.id, id));
    if (!existing.length) return undefined;
    const record = existing[0];
    const archivedNotes = record.notes?.startsWith('[ARQUIVADO]') ? record.notes : `[ARQUIVADO] ${record.notes || ''}`;
    const [updated] = await db.update(healthRecords).set({ notes: archivedNotes }).where(eq(healthRecords.id, id)).returning();
    return updated;
  }

  // Milestones
  async getMilestones(childId: number): Promise<Milestone[]> {
    return await db.select().from(milestones).where(eq(milestones.childId, childId));
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [newMilestone] = await db.insert(milestones).values(milestone).returning();
    return newMilestone;
  }

  async updateMilestone(id: number, data: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const [updated] = await db.update(milestones).set(data).where(eq(milestones.id, id)).returning();
    return updated;
  }

  async deleteMilestone(id: number): Promise<boolean> {
    const result = await db.delete(milestones).where(eq(milestones.id, id)).returning();
    return result.length > 0;
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
  async getGamification(childId: number): Promise<Gamification | undefined> {
    const [g] = await db.select().from(gamification).where(eq(gamification.childId, childId));
    return g;
  }

  async initializeGamification(childId: number): Promise<Gamification> {
    const existing = await this.getGamification(childId);
    if (existing) return existing;
    
    const [created] = await db.insert(gamification).values({ 
      childId, 
      points: 0, 
      level: 'Iniciante' 
    }).returning();
    return created;
  }

  async addPoints(childId: number, points: number): Promise<Gamification> {
    // Ensure gamification exists for this child
    await this.initializeGamification(childId);
    
    const current = await this.getGamification(childId);
    const newPoints = (current?.points || 0) + points;
    
    // Simple level logic
    let level = 'Iniciante';
    if (newPoints > 100) level = 'Cuidador Atento';
    if (newPoints > 500) level = 'Mãe/Pai Dedicado';
    if (newPoints > 1000) level = 'Mãe/Pai Coruja';
    if (newPoints > 2000) level = 'Guardião da Infância';

    const [updated] = await db.update(gamification)
      .set({ points: newPoints, level, updatedAt: new Date() })
      .where(eq(gamification.childId, childId))
      .returning();
    return updated;
  }

  // SUS Vaccines
  async getSusVaccines(): Promise<SusVaccine[]> {
    return await db.select().from(susVaccines);
  }

  async initializeSusVaccines(): Promise<void> {
    const existing = await this.getSusVaccines();
    
    // Versão do calendário - incrementar quando atualizar a lista
    const CALENDAR_VERSION = 2; // PNI 2025 atualizado
    
    // Verifica se precisa atualizar (20 vacinas na versão 2)
    if (existing.length === 20) return;

    // Limpa vacinas antigas para reinicializar com lista atualizada
    if (existing.length > 0) {
      await db.delete(susVaccines);
    }

    // Calendário Nacional de Vacinação da Criança 2025 (PNI/SUS) - Atualizado
    const vaccineList: InsertSusVaccine[] = [
      // Ao nascer
      { name: "BCG", diseasesPrevented: "Tuberculose (formas graves)", recommendedDoses: "Dose única", ageRange: "Ao nascer" },
      { name: "Hepatite B", diseasesPrevented: "Hepatite B", recommendedDoses: "1ª dose", ageRange: "Ao nascer (primeiras 24h)" },
      
      // 2 meses
      { name: "Pentavalente (DTP+Hib+HB)", diseasesPrevented: "Difteria, Tétano, Coqueluche, Haemophilus influenzae b, Hepatite B", recommendedDoses: "1ª, 2ª, 3ª dose", ageRange: "2, 4, 6 meses" },
      { name: "VIP (Pólio Inativada)", diseasesPrevented: "Poliomielite (paralisia infantil)", recommendedDoses: "1ª, 2ª, 3ª dose", ageRange: "2, 4, 6 meses" },
      { name: "Pneumocócica 10-valente", diseasesPrevented: "Pneumonia, Meningite, Otite (doenças pneumocócicas)", recommendedDoses: "1ª, 2ª dose + Reforço", ageRange: "2, 4 meses + reforço 12 meses" },
      { name: "Rotavírus Humano", diseasesPrevented: "Diarreia grave por rotavírus", recommendedDoses: "1ª, 2ª dose", ageRange: "2, 4 meses" },
      
      // 3 e 5 meses
      { name: "Meningocócica C (conjugada)", diseasesPrevented: "Meningite e infecção generalizada por meningococo C", recommendedDoses: "1ª, 2ª dose + Reforço", ageRange: "3, 5 meses + reforço 12 meses" },
      
      // 6 meses em diante
      { name: "Influenza (Gripe)", diseasesPrevented: "Gripe e suas complicações", recommendedDoses: "Dose anual (campanhas)", ageRange: "A partir de 6 meses (campanhas anuais)" },
      
      // 9 meses
      { name: "Febre Amarela", diseasesPrevented: "Febre amarela", recommendedDoses: "1ª dose + Reforço", ageRange: "9 meses + reforço 4 anos" },
      
      // 12 meses
      { name: "Tríplice Viral (SCR)", diseasesPrevented: "Sarampo, Caxumba, Rubéola", recommendedDoses: "1ª dose", ageRange: "12 meses" },
      
      // 15 meses
      { name: "Tetra Viral (SCRV)", diseasesPrevented: "Sarampo, Caxumba, Rubéola, Varicela", recommendedDoses: "Dose única (2ª SCR + 1ª Varicela)", ageRange: "15 meses" },
      { name: "DTP (Tríplice Bacteriana)", diseasesPrevented: "Difteria, Tétano, Coqueluche", recommendedDoses: "1º reforço", ageRange: "15 meses" },
      { name: "Hepatite A", diseasesPrevented: "Hepatite A", recommendedDoses: "Dose única", ageRange: "15 meses" },
      
      // 18 meses (reforço pólio)
      { name: "Reforço Pólio (VIP/VOP)", diseasesPrevented: "Poliomielite (paralisia infantil)", recommendedDoses: "1º reforço", ageRange: "18 meses" },
      
      // 4 anos
      { name: "DTP 2º Reforço", diseasesPrevented: "Difteria, Tétano, Coqueluche", recommendedDoses: "2º reforço", ageRange: "4 anos" },
      { name: "Reforço Pólio 4 anos", diseasesPrevented: "Poliomielite (paralisia infantil)", recommendedDoses: "2º reforço", ageRange: "4 anos" },
      { name: "Varicela (2ª dose)", diseasesPrevented: "Catapora (varicela)", recommendedDoses: "2ª dose", ageRange: "4 anos" },
      
      // COVID-19 (6 meses a 4 anos)
      { name: "COVID-19 Infantil", diseasesPrevented: "COVID-19", recommendedDoses: "Esquema conforme vacina pediátrica", ageRange: "6 meses a 4 anos" },
      
      // 9-14 anos (Pré-adolescentes)
      { name: "HPV Quadrivalente", diseasesPrevented: "HPV (Papilomavírus Humano) - prevenção de cânceres", recommendedDoses: "2 doses (intervalo 6 meses)", ageRange: "9-14 anos (meninas) / 11-14 anos (meninos)" },
      { name: "Meningocócica ACWY", diseasesPrevented: "Meningite meningocócica A, C, W, Y", recommendedDoses: "Reforço", ageRange: "11-14 anos" },
    ];

    await db.insert(susVaccines).values(vaccineList);
  }

  // Vaccine Records
  async getVaccineRecords(childId: number): Promise<VaccineRecord[]> {
    return await db.select().from(vaccineRecords).where(eq(vaccineRecords.childId, childId));
  }

  async createVaccineRecord(record: InsertVaccineRecord): Promise<VaccineRecord> {
    const [newRecord] = await db.insert(vaccineRecords).values(record).returning();
    return newRecord;
  }

  async updateVaccineRecord(id: number, updates: Partial<InsertVaccineRecord>): Promise<VaccineRecord> {
    const [updated] = await db.update(vaccineRecords).set(updates).where(eq(vaccineRecords.id, id)).returning();
    return updated;
  }

  async deleteVaccineRecord(id: number): Promise<void> {
    await db.delete(vaccineRecords).where(eq(vaccineRecords.id, id));
  }
}

export const storage = new DatabaseStorage();
