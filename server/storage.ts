import {
  users,
  sessions,
  children,
  caregivers,
  growthRecords,
  vaccines,
  healthRecords,
  milestones,
  diaryEntries,
  gamification,
  susVaccines,
  vaccineRecords,
  dailyPhotos,
  pushSubscriptions,
  notifications,
  inviteCodes,
  activityComments,
  milestoneLikes,
  diaryLikes,
  type User,
  type Child,
  type InsertChild,
  type GrowthRecord,
  type InsertGrowthRecord,
  type Vaccine,
  type InsertVaccine,
  type HealthRecord,
  type InsertHealthRecord,
  type Milestone,
  type InsertMilestone,
  type DiaryEntry,
  type InsertDiaryEntry,
  type Gamification,
  type SusVaccine,
  type InsertSusVaccine,
  type VaccineRecord,
  type InsertVaccineRecord,
  type DailyPhoto,
  type InsertDailyPhoto,
  type PushSubscription,
  type InsertPushSubscription,
  type AppNotification,
  type InsertAppNotification,
  type InviteCode,
  type InsertInviteCode,
  type ActivityComment,
  type InsertActivityComment,
  type MilestoneLikeStatus,
  type MilestoneWithSocial,
  type DiaryLikeStatus,
  type DiaryEntryWithSocial,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gt, sql, count, desc } from "drizzle-orm";

// ─── Cache em memória para dados estáticos ────────────────────────────────────
let _susVaccinesCache: SusVaccine[] | null = null;
let _susVaccinesCacheAt = 0;
const SUS_CACHE_TTL = 24 * 60 * 60 * 1_000; // 24 horas

export interface IStorage {
  hasChildAccessDirect(userId: string, childId: number): Promise<boolean>;
  // Users (OIDC users have string IDs)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  deleteUserAccount(userId: string): Promise<void>;

  // Children
  getChild(id: number): Promise<Child | undefined>;
  getChildrenByUserId(userId: string): Promise<Child[]>;
  getChildrenWithRolesByUserId(
    userId: string,
  ): Promise<Array<Child & { role: string; relationship: string }>>;
  getCaregiverRole(userId: string, childId: number): Promise<string | null>;
  createChild(child: InsertChild): Promise<Child>;
  updateChild(id: number, child: Partial<InsertChild>): Promise<Child>;
  deleteChild(id: number): Promise<void>;

  // Growth
  getGrowthRecords(childId: number): Promise<GrowthRecord[]>;
  getGrowthRecordById(id: number): Promise<GrowthRecord | undefined>;
  createGrowthRecord(record: InsertGrowthRecord): Promise<GrowthRecord>;
  updateGrowthRecord(
    id: number,
    record: Partial<InsertGrowthRecord>,
  ): Promise<GrowthRecord>;
  archiveGrowthRecord(id: number): Promise<GrowthRecord>;

  // Vaccines
  getVaccines(childId: number): Promise<Vaccine[]>;
  getVaccineById(id: number): Promise<Vaccine | undefined>;
  createVaccine(vaccine: InsertVaccine): Promise<Vaccine>;
  updateVaccine(id: number, vaccine: Partial<InsertVaccine>): Promise<Vaccine>;

  // Health
  getHealthRecords(childId: number): Promise<HealthRecord[]>;
  getHealthRecordById(id: number): Promise<HealthRecord | undefined>;
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  updateHealthRecord(
    id: number,
    data: Partial<InsertHealthRecord>,
  ): Promise<HealthRecord | undefined>;
  deleteHealthRecord(id: number): Promise<void>;

  // Milestones
  getMilestones(childId: number, userId: string): Promise<Milestone[]>;
  getMilestoneById(id: number): Promise<Milestone | undefined>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(
    id: number,
    data: Partial<InsertMilestone>,
  ): Promise<Milestone | undefined>;
  deleteMilestone(id: number): Promise<boolean>;

  // Diary
  getDiaryEntries(
    childId: number,
    userId: string,
    page?: number,
    pageSize?: number,
  ): Promise<{
    data: DiaryEntryWithSocial[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }>;
  getDiaryEntryById(id: number): Promise<DiaryEntry | undefined>;
  createDiaryEntry(entry: InsertDiaryEntry, tx?: any): Promise<DiaryEntry>;
  updateDiaryEntry(
    id: number,
    data: Partial<InsertDiaryEntry>,
  ): Promise<DiaryEntry | undefined>;
  deleteDiaryEntry(id: number, tx?: any): Promise<boolean>;

  // Gamification
  getGamification(childId: number): Promise<Gamification | undefined>;

  // SUS Vaccines
  getSusVaccines(): Promise<SusVaccine[]>;
  initializeSusVaccines(): Promise<void>;

  // Vaccine Records
  getVaccineRecords(childId: number): Promise<VaccineRecord[]>;
  getVaccineRecordById(id: number): Promise<VaccineRecord | undefined>;
  createVaccineRecord(
    record: InsertVaccineRecord,
    tx?: any,
  ): Promise<VaccineRecord | null>;
  updateVaccineRecord(
    id: number,
    record: Partial<InsertVaccineRecord>,
  ): Promise<VaccineRecord>;
  deleteVaccineRecord(id: number, tx?: any): Promise<void>;

  // Daily Photos
  getDailyPhotos(
    childId: number,
    limit?: number,
    offset?: number,
  ): Promise<DailyPhoto[]>;
  getDailyPhotoByDate(
    childId: number,
    date: string,
  ): Promise<DailyPhoto | undefined>;
  getDailyPhotoById(id: number): Promise<DailyPhoto | undefined>;
  createDailyPhoto(photo: InsertDailyPhoto, tx?: any): Promise<DailyPhoto>;
  deleteDailyPhoto(id: number, tx?: any): Promise<void>;

  // Push Subscriptions
  getPushSubscriptionsByUserId(userId: string): Promise<PushSubscription[]>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
  createPushSubscription(
    sub: InsertPushSubscription,
  ): Promise<PushSubscription>;
  deletePushSubscription(endpoint: string): Promise<void>;
  deletePushSubscriptionByUser(userId: string, endpoint: string): Promise<void>;

  // Notifications (in-app inbox)
  createNotification(
    notification: InsertAppNotification,
  ): Promise<AppNotification>;
  getNotificationsByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<AppNotification[]>;
  getUnreadNotificationsCount(userId: string): Promise<number>;
  markNotificationAsRead(
    id: number,
    userId: string,
  ): Promise<AppNotification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<number>;

  // Invite Codes
  createInviteCode(data: InsertInviteCode): Promise<InviteCode>;
  getInviteCodeByCode(code: string): Promise<InviteCode | undefined>;
  markInviteCodeUsed(id: number, usedBy: string): Promise<InviteCode>;
  getInviteCodesByChildId(childId: number): Promise<InviteCode[]>;
  getCaregiversByChildId(childId: number): Promise<
    Array<{
      id: number;
      userId: string;
      relationship: string;
      role: string;
      userFirstName: string | null;
      userLastName: string | null;
      userEmail: string | null;
    }>
  >;
  removeCaregiverFromChild(childId: number, caregiverId: number): Promise<void>;
  removeCaregiverByUserId(childId: number, userId: string): Promise<void>;
  createCaregiver(data: {
    childId: number;
    userId: string;
    relationship: string;
    role: string;
  }): Promise<void>;

  // Activity Comments
  getCommentsByRecord(
    childId: number,
    recordType: string,
    recordId: number,
  ): Promise<
    Array<
      ActivityComment & {
        userFirstName: string | null;
        userLastName: string | null;
      }
    >
  >;
  getCommentsByChild(childId: number): Promise<
    Array<
      ActivityComment & {
        userFirstName: string | null;
        userLastName: string | null;
      }
    >
  >;
  createComment(comment: InsertActivityComment): Promise<ActivityComment>;
  updateComment(id: number, text: string): Promise<ActivityComment>;
  deleteComment(id: number): Promise<void>;

  // Milestone Likes
  getMilestoneLikeStatus(
    milestoneId: number,
    userId: string,
  ): Promise<MilestoneLikeStatus>;
  toggleMilestoneLike(
    milestoneId: number,
    userId: string,
  ): Promise<MilestoneLikeStatus>;
  getMilestonesWithSocialCounts(
    childId: number,
    userId: string,
  ): Promise<MilestoneWithSocial[]>;
  getMilestoneLikers(milestoneId: number): Promise<
    Array<{
      id: string;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
      displayFirstName: string | null;
      displayLastName: string | null;
      displayPhotoUrl: string | null;
    }>
  >;

  // Diary Likes
  getDiaryLikeStatus(
    diaryEntryId: number,
    userId: string,
  ): Promise<DiaryLikeStatus>;
  toggleDiaryLike(
    diaryEntryId: number,
    userId: string,
  ): Promise<DiaryLikeStatus>;
  getDiaryLikers(diaryEntryId: number): Promise<
    Array<{
      id: string;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
      displayFirstName: string | null;
      displayLastName: string | null;
      displayPhotoUrl: string | null;
    }>
  >;
}

export class DatabaseStorage implements IStorage {
  // Users (Auth module handles user creation - we just read)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async deleteUserAccount(userId: string): Promise<void> {
    // Get all children owned by this user
    const userChildren = await this.getChildrenByUserId(userId);

    // Delete all children and their related data
    for (const child of userChildren) {
      await this.deleteChild(child.id);
    }

    // Delete push subscriptions
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    // Delete user sessions (sessions table uses JSONB sess column, not a userId column)
    await db.execute(
      sql`DELETE FROM sessions WHERE sess->>'userId' = ${userId}`,
    );

    // Delete user record
    await db.delete(users).where(eq(users.id, userId));
  }

  // Children
  async getChild(id: number): Promise<Child | undefined> {
    const [child] = await db.select().from(children).where(eq(children.id, id));
    return child;
  }

  async getChildrenByUserId(userId: string): Promise<Child[]> {
    const results = await db
      .select({ child: children })
      .from(caregivers)
      .innerJoin(children, eq(caregivers.childId, children.id))
      .where(eq(caregivers.userId, userId));

    return results.map((r) => r.child);
  }

  async getChildrenWithRolesByUserId(
    userId: string,
  ): Promise<Array<Child & { role: string; relationship: string }>> {
    const results = await db
      .select({
        child: children,
        role: caregivers.role,
        relationship: caregivers.relationship,
      })
      .from(caregivers)
      .innerJoin(children, eq(caregivers.childId, children.id))
      .where(eq(caregivers.userId, userId));

    return results.map((r) => ({
      ...r.child,
      role: r.role,
      relationship: r.relationship,
    }));
  }

  async getCaregiverRole(
    userId: string,
    childId: number,
  ): Promise<string | null> {
    const [result] = await db
      .select({ role: caregivers.role })
      .from(caregivers)
      .where(
        and(eq(caregivers.userId, userId), eq(caregivers.childId, childId)),
      );

    return result?.role ?? null;
  }

  async createChild(child: InsertChild): Promise<Child> {
    const [newChild] = await db.insert(children).values(child).returning();
    return newChild;
  }

  async updateChild(id: number, updates: Partial<InsertChild>): Promise<Child> {
    const [updated] = await db
      .update(children)
      .set(updates)
      .where(eq(children.id, id))
      .returning();
    return updated;
  }

  async deleteChild(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      // 1. Deletar likes de milestones (dependem dos IDs de milestones desta criança)
      await tx.execute(
        sql`DELETE FROM milestone_likes WHERE milestone_id IN (SELECT id FROM milestones WHERE child_id = ${id})`,
      );

      // 2. Deletar comentários de atividade
      await tx.delete(activityComments).where(eq(activityComments.childId, id));

      // 3. Deletar códigos de convite
      await tx.delete(inviteCodes).where(eq(inviteCodes.childId, id));

      // 4. Deletar cuidadores
      await tx.delete(caregivers).where(eq(caregivers.childId, id));

      // 5. Deletar registros de dados da criança
      await tx.delete(growthRecords).where(eq(growthRecords.childId, id));
      await tx.delete(vaccines).where(eq(vaccines.childId, id));
      await tx.delete(healthRecords).where(eq(healthRecords.childId, id));
      await tx.delete(milestones).where(eq(milestones.childId, id));
      await tx.delete(diaryEntries).where(eq(diaryEntries.childId, id));
      await tx.delete(vaccineRecords).where(eq(vaccineRecords.childId, id));
      await tx.delete(dailyPhotos).where(eq(dailyPhotos.childId, id));

      // 6. Deletar gamificação
      await tx.delete(gamification).where(eq(gamification.childId, id));

      // 7. Deletar a criança
      await tx.delete(children).where(eq(children.id, id));
    });
    // Se qualquer DELETE falhar, ROLLBACK automático — nenhum dado órfão
  }

  // Growth
  async getGrowthRecords(childId: number): Promise<GrowthRecord[]> {
    const records = await db
      .select()
      .from(growthRecords)
      .where(eq(growthRecords.childId, childId))
      .limit(500);
    return records.filter((r) => !r.notes?.startsWith("[ARCHIVED]"));
  }

  async getGrowthRecordById(id: number): Promise<GrowthRecord | undefined> {
    const [record] = await db
      .select()
      .from(growthRecords)
      .where(eq(growthRecords.id, id));
    return record;
  }

  async createGrowthRecord(record: InsertGrowthRecord): Promise<GrowthRecord> {
    const [newRecord] = await db
      .insert(growthRecords)
      .values(record)
      .returning();
    return newRecord;
  }

  async updateGrowthRecord(
    id: number,
    updates: Partial<InsertGrowthRecord>,
  ): Promise<GrowthRecord> {
    const [updated] = await db
      .update(growthRecords)
      .set(updates)
      .where(eq(growthRecords.id, id))
      .returning();
    return updated;
  }

  async archiveGrowthRecord(id: number): Promise<GrowthRecord> {
    const [record] = await db
      .select()
      .from(growthRecords)
      .where(eq(growthRecords.id, id));
    const newNotes = "[ARCHIVED]" + (record?.notes || "");
    const [archived] = await db
      .update(growthRecords)
      .set({ notes: newNotes })
      .where(eq(growthRecords.id, id))
      .returning();
    return archived;
  }

  // Vaccines
  async getVaccines(childId: number): Promise<Vaccine[]> {
    return await db
      .select()
      .from(vaccines)
      .where(eq(vaccines.childId, childId))
      .limit(200);
  }

  async getVaccineById(id: number): Promise<Vaccine | undefined> {
    const [record] = await db
      .select()
      .from(vaccines)
      .where(eq(vaccines.id, id));
    return record;
  }

  async createVaccine(vaccine: InsertVaccine): Promise<Vaccine> {
    const [newVaccine] = await db.insert(vaccines).values(vaccine).returning();
    return newVaccine;
  }

  async updateVaccine(
    id: number,
    updates: Partial<InsertVaccine>,
  ): Promise<Vaccine> {
    const [updated] = await db
      .update(vaccines)
      .set(updates)
      .where(eq(vaccines.id, id))
      .returning();
    return updated;
  }

  // Health
  async getHealthRecords(childId: number): Promise<HealthRecord[]> {
    return await db
      .select()
      .from(healthRecords)
      .where(eq(healthRecords.childId, childId))
      .limit(500);
  }

  async getHealthRecordById(id: number): Promise<HealthRecord | undefined> {
    const [record] = await db
      .select()
      .from(healthRecords)
      .where(eq(healthRecords.id, id));
    return record;
  }

  async createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord> {
    const [newRecord] = await db
      .insert(healthRecords)
      .values(record)
      .returning();
    return newRecord;
  }

  async updateHealthRecord(
    id: number,
    data: Partial<InsertHealthRecord>,
  ): Promise<HealthRecord | undefined> {
    const [updated] = await db
      .update(healthRecords)
      .set(data)
      .where(eq(healthRecords.id, id))
      .returning();
    return updated;
  }

  async deleteHealthRecord(id: number): Promise<void> {
    await db.delete(healthRecords).where(eq(healthRecords.id, id));
  }

  // Milestones
  async getMilestones(childId: number, userId: string): Promise<Milestone[]> {
    return await db
      .select()
      .from(milestones)
      .where(
        and(
          eq(milestones.childId, childId),
          sql`(${milestones.isPrivate} = false OR ${milestones.userId} = ${userId} OR ${milestones.userId} IS NULL)`,
        ),
      )
      .orderBy(desc(milestones.date), desc(milestones.createdAt))
      .limit(200);
  }

  async getMilestoneById(id: number): Promise<Milestone | undefined> {
    const [record] = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, id));
    return record;
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [newMilestone] = await db
      .insert(milestones)
      .values(milestone)
      .returning();
    return newMilestone;
  }

  async updateMilestone(
    id: number,
    data: Partial<InsertMilestone>,
  ): Promise<Milestone | undefined> {
    const [updated] = await db
      .update(milestones)
      .set(data)
      .where(eq(milestones.id, id))
      .returning();
    return updated;
  }

  async deleteMilestone(id: number): Promise<boolean> {
    const result = await db
      .delete(milestones)
      .where(eq(milestones.id, id))
      .returning();
    return result.length > 0;
  }

  // Diary — paginação completa
  async getDiaryEntries(
    childId: number,
    userId: string,
    page = 1,
    pageSize = 30,
  ): Promise<{
    data: DiaryEntryWithSocial[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(Math.max(1, pageSize), 100); // max 100 por página
    const offset = (safePage - 1) * safeSize;

    const privacyFilter = sql`(${diaryEntries.isPrivate} = false OR ${diaryEntries.userId} = ${userId} OR ${diaryEntries.userId} IS NULL OR ${diaryEntries.userId} = '')`;
    const [[countResult], pagedRows] = await Promise.all([
      db
        .select({ total: count() })
        .from(diaryEntries)
        .where(and(eq(diaryEntries.childId, childId), privacyFilter)),
      db
        .select({
          entry: diaryEntries,
          creatorFirstName: users.firstName,
          creatorLastName: users.lastName,
          creatorDisplayFirstName: users.displayFirstName,
          creatorDisplayLastName: users.displayLastName,
          creatorProfileImage: users.profileImageUrl,
          creatorDisplayPhoto: users.displayPhotoUrl,
          creatorProfileCustomized: users.profileCustomized,
        })
        .from(diaryEntries)
        .leftJoin(users, eq(diaryEntries.userId, users.id))
        .where(and(eq(diaryEntries.childId, childId), privacyFilter))
        .orderBy(desc(diaryEntries.date), desc(diaryEntries.createdAt))
        .limit(safeSize)
        .offset(offset),
    ]);

    const total = countResult?.total ?? 0;

    if (pagedRows.length === 0) {
      return {
        data: [],
        total,
        page: safePage,
        pageSize: safeSize,
        hasMore: false,
      };
    }

    const entryIds = pagedRows.map((r) => r.entry.id);

    // Fetch user likes for the entries in this page
    const userLikes = await db
      .select({ diaryEntryId: diaryLikes.diaryEntryId })
      .from(diaryLikes)
      .where(
        and(
          eq(diaryLikes.userId, userId),
          sql`${diaryLikes.diaryEntryId} IN (${sql.raw(entryIds.join(","))})`,
        ),
      );

    const userLikedSet = new Set(userLikes.map((r) => r.diaryEntryId));

    const data = pagedRows.map((r) => {
      const name = r.creatorProfileCustomized
        ? [r.creatorDisplayFirstName, r.creatorDisplayLastName]
            .filter(Boolean)
            .join(" ")
        : [
            r.creatorDisplayFirstName || r.creatorFirstName,
            r.creatorDisplayLastName || r.creatorLastName,
          ]
            .filter(Boolean)
            .join(" ");
      const avatar = r.creatorDisplayPhoto || r.creatorProfileImage || null;
      return {
        ...r.entry,
        likeCount: r.entry.likesCount,
        userLiked: userLikedSet.has(r.entry.id),
        creatorName: name || null,
        creatorAvatar: avatar,
      };
    });

    return {
      data,
      total,
      page: safePage,
      pageSize: safeSize,
      hasMore: offset + pagedRows.length < total,
    };
  }

  async getDiaryEntryById(id: number): Promise<DiaryEntry | undefined> {
    const [record] = await db
      .select()
      .from(diaryEntries)
      .where(eq(diaryEntries.id, id));
    return record;
  }

  async createDiaryEntry(
    entry: InsertDiaryEntry,
    tx?: any,
  ): Promise<DiaryEntry> {
    const ex = tx ?? db;
    const [newEntry] = await ex.insert(diaryEntries).values(entry).returning();
    return newEntry;
  }

  async updateDiaryEntry(
    id: number,
    data: Partial<InsertDiaryEntry>,
  ): Promise<DiaryEntry | undefined> {
    const [updated] = await db
      .update(diaryEntries)
      .set(data)
      .where(eq(diaryEntries.id, id))
      .returning();
    return updated;
  }

  async deleteDiaryEntry(id: number, tx?: any): Promise<boolean> {
    const ex = tx ?? db;
    const result = await ex
      .delete(diaryEntries)
      .where(eq(diaryEntries.id, id))
      .returning();
    return result.length > 0;
  }

  // Gamification
  async getGamification(childId: number): Promise<Gamification | undefined> {
    const [g] = await db
      .select()
      .from(gamification)
      .where(eq(gamification.childId, childId));
    return g;
  }

  // SUS Vaccines
  async getSusVaccines(): Promise<SusVaccine[]> {
    // Cache de 24h — a lista do PNI/SUS raramente muda
    const now = Date.now();
    if (_susVaccinesCache && now - _susVaccinesCacheAt < SUS_CACHE_TTL) {
      return _susVaccinesCache;
    }
    const rows = await db.select().from(susVaccines).orderBy(susVaccines.id);
    _susVaccinesCache = rows;
    _susVaccinesCacheAt = now;
    return rows;
  }

  async initializeSusVaccines(): Promise<void> {
    const existing = await this.getSusVaccines();

    const CALENDAR_VERSION = 4;

    const expectedOrder = [
      "BCG",
      "Hepatite B",
      "Pentavalente (DTP+Hib+HB)",
      "VIP (Pólio Inativada)",
      "Pneumocócica 10-valente",
      "Rotavírus Humano",
      "Meningocócica C (conjugada)",
      "Influenza (Gripe)",
      "COVID-19 Infantil",
      "Febre Amarela",
      "Tríplice Viral (SCR)",
      "Tetra Viral (SCRV)",
      "DTP (Tríplice Bacteriana)",
      "Hepatite A",
      "Reforço Pólio (VIP/VOP)",
      "DTP 2º Reforço",
      "Reforço Pólio 4 anos",
      "Varicela (2ª dose)",
      "HPV Quadrivalente",
      "Meningocócica ACWY",
    ];

    const needsReorder =
      existing.length === 20 &&
      existing.some((v, i) => v.name !== expectedOrder[i]);

    if (existing.length === 20 && !needsReorder) return;

    const vaccineList: InsertSusVaccine[] = [
      {
        name: "BCG",
        diseasesPrevented: "Tuberculose (formas graves)",
        recommendedDoses: "Dose única",
        ageRange: "Ao nascer",
      },
      {
        name: "Hepatite B",
        diseasesPrevented: "Hepatite B",
        recommendedDoses: "1ª dose",
        ageRange: "Ao nascer (primeiras 24h)",
      },
      {
        name: "Pentavalente (DTP+Hib+HB)",
        diseasesPrevented:
          "Difteria, Tétano, Coqueluche, Haemophilus influenzae b, Hepatite B",
        recommendedDoses: "1ª, 2ª, 3ª dose",
        ageRange: "2, 4, 6 meses",
      },
      {
        name: "VIP (Pólio Inativada)",
        diseasesPrevented: "Poliomielite (paralisia infantil)",
        recommendedDoses: "1ª, 2ª, 3ª dose",
        ageRange: "2, 4, 6 meses",
      },
      {
        name: "Pneumocócica 10-valente",
        diseasesPrevented:
          "Pneumonia, Meningite, Otite (doenças pneumocócicas)",
        recommendedDoses: "1ª, 2ª dose + Reforço",
        ageRange: "2, 4 meses + reforço 12 meses",
      },
      {
        name: "Rotavírus Humano",
        diseasesPrevented: "Diarreia grave por rotavírus",
        recommendedDoses: "1ª, 2ª dose",
        ageRange: "2, 4 meses",
      },
      {
        name: "Meningocócica C (conjugada)",
        diseasesPrevented:
          "Meningite e infecção generalizada por meningococo C",
        recommendedDoses: "1ª, 2ª dose + Reforço",
        ageRange: "3, 5 meses + reforço 12 meses",
      },
      {
        name: "Influenza (Gripe)",
        diseasesPrevented: "Gripe e suas complicações",
        recommendedDoses: "Dose anual (campanhas)",
        ageRange: "A partir de 6 meses (campanhas anuais)",
      },
      {
        name: "COVID-19 Infantil",
        diseasesPrevented: "COVID-19",
        recommendedDoses: "1ª dose, 2ª dose, 3ª dose",
        ageRange: "6, 7, 9 meses",
      },
      {
        name: "Febre Amarela",
        diseasesPrevented: "Febre amarela",
        recommendedDoses: "1ª dose + Reforço",
        ageRange: "9 meses + reforço 4 anos",
      },
      {
        name: "Tríplice Viral (SCR)",
        diseasesPrevented: "Sarampo, Caxumba, Rubéola",
        recommendedDoses: "1ª dose",
        ageRange: "12 meses",
      },
      {
        name: "Tetra Viral (SCRV)",
        diseasesPrevented: "Sarampo, Caxumba, Rubéola, Varicela",
        recommendedDoses: "Dose única (2ª SCR + 1ª Varicela)",
        ageRange: "15 meses",
      },
      {
        name: "DTP (Tríplice Bacteriana)",
        diseasesPrevented: "Difteria, Tétano, Coqueluche",
        recommendedDoses: "1º reforço",
        ageRange: "15 meses",
      },
      {
        name: "Hepatite A",
        diseasesPrevented: "Hepatite A",
        recommendedDoses: "Dose única",
        ageRange: "15 meses",
      },
      {
        name: "Reforço Pólio (VIP/VOP)",
        diseasesPrevented: "Poliomielite (paralisia infantil)",
        recommendedDoses: "1º reforço",
        ageRange: "18 meses",
      },
      {
        name: "DTP 2º Reforço",
        diseasesPrevented: "Difteria, Tétano, Coqueluche",
        recommendedDoses: "2º reforço",
        ageRange: "4 anos",
      },
      {
        name: "Reforço Pólio 4 anos",
        diseasesPrevented: "Poliomielite (paralisia infantil)",
        recommendedDoses: "2º reforço",
        ageRange: "4 anos",
      },
      {
        name: "Varicela (2ª dose)",
        diseasesPrevented: "Catapora (varicela)",
        recommendedDoses: "2ª dose",
        ageRange: "4 anos",
      },
      {
        name: "HPV Quadrivalente",
        diseasesPrevented: "HPV (Papilomavírus Humano) - prevenção de cânceres",
        recommendedDoses: "2 doses (intervalo 6 meses)",
        ageRange: "9-14 anos (meninas) / 11-14 anos (meninos)",
      },
      {
        name: "Meningocócica ACWY",
        diseasesPrevented: "Meningite meningocócica A, C, W, Y",
        recommendedDoses: "Reforço",
        ageRange: "11-14 anos",
      },
    ];

    if (needsReorder) {
      console.log(
        "[sus] Reordenando vacinas (v4): COVID-19 para posição cronológica correta",
      );
      const oldIdByName = new Map(existing.map((v) => [v.name, v.id]));

      await db.delete(susVaccines);
      await db.insert(susVaccines).values(vaccineList);

      const newVaccines = await db.select().from(susVaccines);
      const newIdByName = new Map(newVaccines.map((v) => [v.name, v.id]));

      const allRecords = await db.select().from(vaccineRecords);
      for (const record of allRecords) {
        const oldVaccine = existing.find((v) => v.id === record.susVaccineId);
        if (oldVaccine) {
          const newId = newIdByName.get(oldVaccine.name);
          if (newId && newId !== record.susVaccineId) {
            await db
              .update(vaccineRecords)
              .set({ susVaccineId: newId })
              .where(eq(vaccineRecords.id, record.id));
          }
        }
      }
      console.log(
        "[sus] Vacinas reordenadas e registros remapeados com sucesso",
      );
      _susVaccinesCache = null;
      _susVaccinesCacheAt = 0;
      return;
    }

    if (existing.length > 0) {
      _susVaccinesCache = null;
      _susVaccinesCacheAt = 0;
      await db.delete(susVaccines);
    }

    await db.insert(susVaccines).values(vaccineList);
  }

  // Vaccine Records
  async getVaccineRecords(childId: number): Promise<VaccineRecord[]> {
    return await db
      .select()
      .from(vaccineRecords)
      .where(eq(vaccineRecords.childId, childId))
      .orderBy(vaccineRecords.applicationDate, desc(vaccineRecords.createdAt))
      .limit(200);
  }

  async getVaccineRecordById(id: number): Promise<VaccineRecord | undefined> {
    const [record] = await db
      .select()
      .from(vaccineRecords)
      .where(eq(vaccineRecords.id, id));
    return record;
  }

  async createVaccineRecord(
    record: InsertVaccineRecord,
    tx?: any,
  ): Promise<VaccineRecord | null> {
    const ex = tx ?? db;
    const [newRecord] = await ex
      .insert(vaccineRecords)
      .values(record)
      .onConflictDoNothing() // idempotente: ignora se (child_id, sus_vaccine_id, dose) já existe
      .returning();
    return newRecord ?? null;
  }

  async updateVaccineRecord(
    id: number,
    updates: Partial<InsertVaccineRecord>,
  ): Promise<VaccineRecord> {
    const [updated] = await db
      .update(vaccineRecords)
      .set(updates)
      .where(eq(vaccineRecords.id, id))
      .returning();
    return updated;
  }

  async deleteVaccineRecord(id: number, tx?: any): Promise<void> {
    const ex = tx ?? db;
    await ex.delete(vaccineRecords).where(eq(vaccineRecords.id, id));
  }

  // Daily Photos
  async getDailyPhotos(
    childId: number,
    limit = 30,
    offset = 0,
  ): Promise<DailyPhoto[]> {
    return await db
      .select()
      .from(dailyPhotos)
      .where(eq(dailyPhotos.childId, childId))
      .orderBy(desc(dailyPhotos.date)) // Mais recentes primeiro
      .limit(limit)
      .offset(offset);
  }

  async getDailyPhotoByDate(
    childId: number,
    date: string,
  ): Promise<DailyPhoto | undefined> {
    const [photo] = await db
      .select()
      .from(dailyPhotos)
      .where(and(eq(dailyPhotos.childId, childId), eq(dailyPhotos.date, date)));
    return photo;
  }

  async getDailyPhotoById(id: number): Promise<DailyPhoto | undefined> {
    const [photo] = await db
      .select()
      .from(dailyPhotos)
      .where(eq(dailyPhotos.id, id));
    return photo;
  }

  async createDailyPhoto(
    photo: InsertDailyPhoto,
    tx?: any,
  ): Promise<DailyPhoto> {
    const ex = tx ?? db;
    const [newPhoto] = await ex.insert(dailyPhotos).values(photo).returning();
    return newPhoto;
  }

  async deleteDailyPhoto(id: number, tx?: any): Promise<void> {
    const ex = tx ?? db;
    await ex.delete(dailyPhotos).where(eq(dailyPhotos.id, id));
  }

  async getPushSubscriptionsByUserId(
    userId: string,
  ): Promise<PushSubscription[]> {
    return await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions);
  }

  async createPushSubscription(
    sub: InsertPushSubscription,
  ): Promise<PushSubscription> {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, sub.endpoint));
    const [created] = await db
      .insert(pushSubscriptions)
      .values(sub)
      .returning();
    return created;
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deletePushSubscriptionByUser(
    userId: string,
    endpoint: string,
  ): Promise<void> {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      );
  }

  async createNotification(
    notification: InsertAppNotification,
  ): Promise<AppNotification> {
    const [created] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return created;
  }

  async getNotificationsByUserId(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<AppNotification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientUserId, userId))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit)
      .offset(offset);
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, userId),
          sql`${notifications.readAt} IS NULL`,
        ),
      );
    return Number(row?.total ?? 0);
  }

  async markNotificationAsRead(
    id: number,
    userId: string,
  ): Promise<AppNotification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientUserId, userId),
          sql`${notifications.readAt} IS NULL`,
        ),
      )
      .returning();

    if (updated) return updated;

    const [existing] = await db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.id, id), eq(notifications.recipientUserId, userId)),
      )
      .limit(1);
    return existing;
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const updated = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.recipientUserId, userId),
          sql`${notifications.readAt} IS NULL`,
        ),
      )
      .returning({ id: notifications.id });

    return updated.length;
  }

  // Invite Codes
  async createInviteCode(data: InsertInviteCode): Promise<InviteCode> {
    const [created] = await db.insert(inviteCodes).values(data).returning();
    return created;
  }

  async getInviteCodeByCode(code: string): Promise<InviteCode | undefined> {
    const [invite] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code));
    return invite;
  }

  async markInviteCodeUsed(id: number, usedBy: string): Promise<InviteCode> {
    const [updated] = await db
      .update(inviteCodes)
      .set({ usedBy, usedAt: new Date() })
      .where(eq(inviteCodes.id, id))
      .returning();
    return updated;
  }

  async getInviteCodesByChildId(childId: number): Promise<InviteCode[]> {
    return await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.childId, childId))
      .limit(50);
  }

  async getCaregiversByChildId(childId: number): Promise<
    Array<{
      id: number;
      userId: string;
      relationship: string;
      role: string;
      userFirstName: string | null;
      userLastName: string | null;
      userEmail: string | null;
    }>
  > {
    const results = await db
      .select({
        id: caregivers.id,
        userId: caregivers.userId,
        relationship: caregivers.relationship,
        role: caregivers.role,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        displayFirstName: users.displayFirstName,
        displayLastName: users.displayLastName,
        profileCustomized: users.profileCustomized,
      })
      .from(caregivers)
      .leftJoin(users, eq(caregivers.userId, users.id))
      .where(eq(caregivers.childId, childId));

    return results.map((r) => ({
      id: r.id,
      userId: r.userId,
      relationship: r.relationship,
      role: r.role,
      userFirstName: r.profileCustomized
        ? r.displayFirstName
        : r.displayFirstName || r.userFirstName,
      userLastName: r.profileCustomized
        ? r.displayLastName
        : r.displayLastName || r.userLastName,
      userEmail: r.userEmail,
    }));
  }

  async removeCaregiverFromChild(
    childId: number,
    caregiverId: number,
  ): Promise<void> {
    await db
      .delete(caregivers)
      .where(
        and(eq(caregivers.id, caregiverId), eq(caregivers.childId, childId)),
      );
  }

  async removeCaregiverByUserId(
    childId: number,
    userId: string,
  ): Promise<void> {
    await db
      .delete(caregivers)
      .where(
        and(eq(caregivers.userId, userId), eq(caregivers.childId, childId)),
      );
  }
  async createCaregiver(data: {
    childId: number;
    userId: string;
    relationship: string;
    role: string;
  }): Promise<void> {
    await db.insert(caregivers).values({
      childId: data.childId,
      userId: data.userId,
      relationship: data.relationship,
      role: data.role,
    });
  }

  async getCommentsByRecord(
    childId: number,
    recordType: string,
    recordId: number,
  ): Promise<
    Array<
      ActivityComment & {
        userFirstName: string | null;
        userLastName: string | null;
      }
    >
  > {
    const results = await db
      .select({
        comment: activityComments,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        displayFirstName: users.displayFirstName,
        displayLastName: users.displayLastName,
        profileCustomized: users.profileCustomized,
      })
      .from(activityComments)
      .leftJoin(users, eq(activityComments.userId, users.id))
      .where(
        and(
          eq(activityComments.childId, childId),
          eq(activityComments.recordType, recordType),
          eq(activityComments.recordId, recordId),
        ),
      )
      .orderBy(activityComments.createdAt) // ORDER BY createdAt ASC — mais antigos primeiro
      .limit(200);
    return results.map((r) => ({
      ...r.comment,
      userFirstName: r.profileCustomized
        ? r.displayFirstName
        : r.displayFirstName || r.userFirstName,
      userLastName: r.profileCustomized
        ? r.displayLastName
        : r.displayLastName || r.userLastName,
    }));
  }

  async getCommentsByChild(childId: number): Promise<
    Array<
      ActivityComment & {
        userFirstName: string | null;
        userLastName: string | null;
      }
    >
  > {
    const results = await db
      .select({
        comment: activityComments,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        displayFirstName: users.displayFirstName,
        displayLastName: users.displayLastName,
        profileCustomized: users.profileCustomized,
      })
      .from(activityComments)
      .leftJoin(users, eq(activityComments.userId, users.id))
      .where(eq(activityComments.childId, childId))
      .orderBy(activityComments.createdAt) // ORDER BY createdAt ASC
      .limit(500);
    return results.map((r) => ({
      ...r.comment,
      userFirstName: r.profileCustomized
        ? r.displayFirstName
        : r.displayFirstName || r.userFirstName,
      userLastName: r.profileCustomized
        ? r.displayLastName
        : r.displayLastName || r.userLastName,
    }));
  }

  async createComment(
    comment: InsertActivityComment,
  ): Promise<ActivityComment> {
    const [newComment] = await db
      .insert(activityComments)
      .values(comment)
      .returning();
    return newComment;
  }

  async updateComment(id: number, text: string): Promise<ActivityComment> {
    const [updated] = await db
      .update(activityComments)
      .set({ text })
      .where(eq(activityComments.id, id))
      .returning();
    return updated;
  }

  async deleteComment(id: number): Promise<void> {
    await db.delete(activityComments).where(eq(activityComments.id, id));
  }

  // Milestone Likes
  async getMilestoneLikeStatus(
    milestoneId: number,
    userId: string,
  ): Promise<MilestoneLikeStatus> {
    const [milestoneRow, [userLikeRow]] = await Promise.all([
      db
        .select({ count: milestones.likesCount })
        .from(milestones)
        .where(eq(milestones.id, milestoneId))
        .limit(1)
        .then((res) => res[0]),
      db
        .select({ id: milestoneLikes.userId })
        .from(milestoneLikes)
        .where(
          and(
            eq(milestoneLikes.milestoneId, milestoneId),
            eq(milestoneLikes.userId, userId),
          ),
        )
        .limit(1),
    ]);
    return {
      count: milestoneRow?.count ?? 0,
      userLiked: !!userLikeRow,
    };
  }

  async toggleMilestoneLike(
    milestoneId: number,
    userId: string,
  ): Promise<MilestoneLikeStatus> {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(milestoneLikes)
        .where(
          and(
            eq(milestoneLikes.milestoneId, milestoneId),
            eq(milestoneLikes.userId, userId),
          ),
        );

      if (existing.length > 0) {
        // Remove like
        await tx
          .delete(milestoneLikes)
          .where(
            and(
              eq(milestoneLikes.milestoneId, milestoneId),
              eq(milestoneLikes.userId, userId),
            ),
          );
        // Descrementar counter
        await tx.execute(
          sql`UPDATE milestones SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ${milestoneId}`,
        );
      } else {
        // Add like
        await tx.insert(milestoneLikes).values({ milestoneId, userId });
        // Incrementar counter
        await tx.execute(
          sql`UPDATE milestones SET likes_count = likes_count + 1 WHERE id = ${milestoneId}`,
        );
      }
    });

    return this.getMilestoneLikeStatus(milestoneId, userId);
  }

  async getMilestonesWithSocialCounts(
    childId: number,
    userId: string,
  ): Promise<MilestoneWithSocial[]> {
    // 4 queries paralelas — sem N+1, sem agg de likes
    const [milestoneRows, commentCounts, userLikes] = await Promise.all([
      // 1) Marcos ordenados com LEFT JOIN em users para obter autor
      db
        .select({
          milestone: milestones,
          creatorFirstName: users.firstName,
          creatorLastName: users.lastName,
          creatorDisplayFirstName: users.displayFirstName,
          creatorDisplayLastName: users.displayLastName,
          creatorProfileImage: users.profileImageUrl,
          creatorDisplayPhoto: users.displayPhotoUrl,
          creatorProfileCustomized: users.profileCustomized,
        })
        .from(milestones)
        .leftJoin(users, eq(milestones.userId, users.id))
        .where(
          and(
            eq(milestones.childId, childId),
            sql`(${milestones.isPrivate} = false OR ${milestones.userId} = ${userId} OR ${milestones.userId} IS NULL)`,
          ),
        )
        .orderBy(desc(milestones.date), desc(milestones.createdAt))
        .limit(200),

      // 2) Total de comentários por marco
      db
        .select({ recordId: activityComments.recordId, total: count() })
        .from(activityComments)
        .where(
          and(
            eq(activityComments.childId, childId),
            eq(activityComments.recordType, "milestone"),
          ),
        )
        .groupBy(activityComments.recordId),

      // 3) IDs dos marcos que o usuário atual curtiu
      db
        .select({ milestoneId: milestoneLikes.milestoneId })
        .from(milestoneLikes)
        .innerJoin(milestones, eq(milestoneLikes.milestoneId, milestones.id))
        .where(
          and(
            eq(milestones.childId, childId),
            eq(milestoneLikes.userId, userId),
          ),
        ),
    ]);

    const commentMap = new Map(commentCounts.map((r) => [r.recordId, r.total]));
    const userLikedSet = new Set(userLikes.map((r) => r.milestoneId));

    return milestoneRows.map((r) => {
      const name = r.creatorProfileCustomized
        ? [r.creatorDisplayFirstName, r.creatorDisplayLastName]
            .filter(Boolean)
            .join(" ")
        : [
            r.creatorDisplayFirstName || r.creatorFirstName,
            r.creatorDisplayLastName || r.creatorLastName,
          ]
            .filter(Boolean)
            .join(" ");
      const avatar = r.creatorDisplayPhoto || r.creatorProfileImage || null;
      return {
        ...r.milestone,
        likeCount: r.milestone.likesCount,
        commentCount: commentMap.get(r.milestone.id) ?? 0,
        userLiked: userLikedSet.has(r.milestone.id),
        creatorName: name || null,
        creatorAvatar: avatar,
      };
    });
  }

  async getMilestoneLikers(milestoneId: number): Promise<
    Array<{
      id: string;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
      displayFirstName: string | null;
      displayLastName: string | null;
      displayPhotoUrl: string | null;
    }>
  > {
    const likers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        displayFirstName: users.displayFirstName,
        displayLastName: users.displayLastName,
        displayPhotoUrl: users.displayPhotoUrl,
      })
      .from(milestoneLikes)
      .innerJoin(users, eq(milestoneLikes.userId, users.id))
      .where(eq(milestoneLikes.milestoneId, milestoneId))
      .orderBy(desc(milestoneLikes.createdAt));

    return likers;
  }

  // Diary Likes
  async getDiaryLikeStatus(
    diaryEntryId: number,
    userId: string,
  ): Promise<DiaryLikeStatus> {
    const [entryRow, [userLikeRow]] = await Promise.all([
      db
        .select({ count: diaryEntries.likesCount })
        .from(diaryEntries)
        .where(eq(diaryEntries.id, diaryEntryId))
        .limit(1)
        .then((res) => res[0]),
      db
        .select({ id: diaryLikes.userId })
        .from(diaryLikes)
        .where(
          and(
            eq(diaryLikes.diaryEntryId, diaryEntryId),
            eq(diaryLikes.userId, userId),
          ),
        )
        .limit(1),
    ]);
    return {
      count: entryRow?.count ?? 0,
      userLiked: !!userLikeRow,
    };
  }

  async toggleDiaryLike(
    diaryEntryId: number,
    userId: string,
  ): Promise<DiaryLikeStatus> {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(diaryLikes)
        .where(
          and(
            eq(diaryLikes.diaryEntryId, diaryEntryId),
            eq(diaryLikes.userId, userId),
          ),
        );

      if (existing.length > 0) {
        // Remove like
        await tx
          .delete(diaryLikes)
          .where(
            and(
              eq(diaryLikes.diaryEntryId, diaryEntryId),
              eq(diaryLikes.userId, userId),
            ),
          );
        // Decrementar counter
        await tx.execute(
          sql`UPDATE diary_entries SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ${diaryEntryId}`,
        );
      } else {
        // Add like
        await tx.insert(diaryLikes).values({ diaryEntryId, userId });
        // Incrementar counter
        await tx.execute(
          sql`UPDATE diary_entries SET likes_count = likes_count + 1 WHERE id = ${diaryEntryId}`,
        );
      }
    });

    return this.getDiaryLikeStatus(diaryEntryId, userId);
  }

  async getDiaryLikers(diaryEntryId: number): Promise<
    Array<{
      id: string;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
      displayFirstName: string | null;
      displayLastName: string | null;
      displayPhotoUrl: string | null;
    }>
  > {
    const likers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        displayFirstName: users.displayFirstName,
        displayLastName: users.displayLastName,
        displayPhotoUrl: users.displayPhotoUrl,
      })
      .from(diaryLikes)
      .innerJoin(users, eq(diaryLikes.userId, users.id))
      .where(eq(diaryLikes.diaryEntryId, diaryEntryId))
      .orderBy(desc(diaryLikes.createdAt));

    return likers;
  }

  // Verifica acesso direto na tabela caregivers (sem buscar todos os filhos)
  async hasChildAccessDirect(
    userId: string,
    childId: number,
  ): Promise<boolean> {
    const [row] = await db
      .select({ id: caregivers.id })
      .from(caregivers)
      .where(
        and(eq(caregivers.userId, userId), eq(caregivers.childId, childId)),
      )
      .limit(1);
    return !!row;
  }
}

export const storage = new DatabaseStorage();
