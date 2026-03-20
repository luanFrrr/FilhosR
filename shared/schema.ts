import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  date,
  decimal,
  jsonb,
  uniqueIndex,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === AUTH TABLES (from Replit Auth) ===
import { users, sessions } from "./models/auth";
export { users, sessions };
export type { User, UpsertUser } from "./models/auth";

// === TABLE DEFINITIONS ===

export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  birthDate: date("birth_date").notNull(),
  gender: text("gender").notNull(), // 'male', 'female', 'unspecified'
  theme: text("theme").default("neutral"), // 'blue', 'pink', 'neutral', 'custom'
  themeColor: text("theme_color"), // for custom theme
  initialWeight: decimal("initial_weight"),
  initialHeight: decimal("initial_height"),
  initialHeadCircumference: decimal("initial_head_circumference"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const caregivers = pgTable("caregivers", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull(),
  userId: varchar("user_id").notNull(), // OIDC sub claim (UUID string)
  relationship: text("relationship").notNull(), // 'father', 'mother', 'guardian', etc.
  role: text("role").notNull().default("viewer"), // 'owner', 'editor', 'viewer'
  createdAt: timestamp("created_at").defaultNow(),
});

export const growthRecords = pgTable("growth_records", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull(),
  date: date("date").notNull(),
  weight: decimal("weight"),
  height: decimal("height"),
  headCircumference: decimal("head_circumference"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vaccines = pgTable("vaccines", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull(),
  name: text("name").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  administeredDate: date("administered_date"),
  status: text("status").notNull().default("pending"), // 'pending', 'completed', 'overdue'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull(),
  userId: varchar("user_id"),
  date: date("date").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  photoUrl: text("photo_url"),
  likesCount: integer("likes_count").notNull().default(0),
  isPrivate: boolean("is_private").notNull().default(false),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const diaryEntries = pgTable("diary_entries", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull(),
  date: date("date").notNull(),
  content: text("content"),
  photoUrls: text("photo_urls").array(),
  likesCount: integer("likes_count").notNull().default(0),
  isPrivate: boolean("is_private").notNull().default(false),
  isPublic: boolean("is_public").default(false),
  userId: varchar("user_id"), // Permite null para retrocompatibilidade
  moodEmoji: text("mood_emoji"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Ordenação principal do feed de diário (keyset por child/date/createdAt/id)
  childDateCreatedIdIdx: index("diary_entries_child_date_created_id_idx").on(
    table.childId,
    table.date,
    table.createdAt,
    table.id,
  ),
}));

export const gamification = pgTable(
  "gamification",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    points: integer("points").default(0),
    level: text("level").default("Iniciante"),
    achievements: jsonb("achievements").default([]),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueChild: uniqueIndex("gamification_child_id_unique").on(table.childId),
  }),
);

// Log de eventos de pontuação — fonte de verdade; gamification.points é cache
export const gamificationEvents = pgTable(
  "gamification_events",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    recordType: text("record_type").notNull(),
    recordId: integer("record_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // Idempotência: mesmo evento não pode ser inserido duas vezes
    idempotency: uniqueIndex("gamification_events_idempotency").on(
      table.recordType,
      table.recordId,
      table.reason,
    ),
    // Índice para SUM(delta) de auditoria e histórico por criança
    childIdx: index("idx_gamification_events_child").on(table.childId),
  }),
);

// Catálogo de vacinas do SUS (PNI)
export const susVaccines = pgTable("sus_vaccines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  diseasesPrevented: text("diseases_prevented").notNull(),
  recommendedDoses: text("recommended_doses").notNull(), // Ex: "1ª dose, 2ª dose, reforço"
  ageRange: text("age_range"), // Ex: "Ao nascer", "2 meses", "4 meses"
});

// Foto do dia - one photo per day per child
export const dailyPhotos = pgTable(
  "daily_photos",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    date: date("date").notNull(),
    photoUrl: text("photo_url").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueChildDate: uniqueIndex("daily_photos_child_date_unique").on(
      table.childId,
      table.date,
    ),
  }),
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueEndpoint: uniqueIndex("push_subscriptions_endpoint_unique").on(
      table.endpoint,
    ),
    userIdx: index("push_subscriptions_user_idx").on(table.userId),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    recipientUserId: varchar("recipient_user_id").notNull(),
    actorUserId: varchar("actor_user_id"),
    actorName: text("actor_name"),
    actorAvatar: text("actor_avatar"),
    childId: integer("child_id").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    deepLink: text("deep_link").notNull().default("/"),
    recordType: text("record_type"),
    recordId: integer("record_id"),
    commentId: integer("comment_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    recipientCreatedIdx: index("notifications_recipient_created_idx").on(
      table.recipientUserId,
      table.createdAt,
    ),
    recipientUnreadIdx: index("notifications_recipient_unread_idx").on(
      table.recipientUserId,
      table.readAt,
    ),
    childIdx: index("notifications_child_idx").on(table.childId),
  }),
);

// Códigos de convite para compartilhar crianças entre cuidadores
export const inviteCodes = pgTable("invite_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  childId: integer("child_id").notNull(),
  createdBy: varchar("created_by").notNull(), // userId do criador
  usedBy: varchar("used_by"), // userId de quem resgatou
  relationship: text("relationship").notNull().default("caregiver"), // relação do convidado
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Registros vacinais individuais
export const vaccineRecords = pgTable(
  "vaccine_records",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    susVaccineId: integer("sus_vaccine_id").notNull(),
    dose: text("dose").notNull(), // Ex: "1ª dose", "2ª dose", "Reforço"
    applicationDate: date("application_date"), // nullable = dose pendente (ainda não aplicada)
    applicationPlace: text("application_place"),
    notes: text("notes"),
    photoUrls: text("photo_urls").array(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    // Garante que a mesma dose de uma vacina não seja inserida duas vezes para a mesma criança
    idempotency: uniqueIndex("vaccine_records_idempotency").on(
      table.childId,
      table.susVaccineId,
      table.dose,
    ),
  }),
);

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  caregiverEntries: many(caregivers),
}));

export const childrenRelations = relations(children, ({ many, one }) => ({
  caregivers: many(caregivers),
  growthRecords: many(growthRecords),
  vaccines: many(vaccines),
  milestones: many(milestones),
  diaryEntries: many(diaryEntries),
  vaccineRecords: many(vaccineRecords),
  dailyPhotos: many(dailyPhotos),
  gamification: one(gamification),
  inviteCodes: many(inviteCodes),
}));

export const dailyPhotosRelations = relations(dailyPhotos, ({ one }) => ({
  child: one(children, {
    fields: [dailyPhotos.childId],
    references: [children.id],
  }),
}));

export const caregiversRelations = relations(caregivers, ({ one }) => ({
  child: one(children, {
    fields: [caregivers.childId],
    references: [children.id],
  }),
  user: one(users, {
    fields: [caregivers.userId],
    references: [users.id],
  }),
}));

export const growthRecordsRelations = relations(growthRecords, ({ one }) => ({
  child: one(children, {
    fields: [growthRecords.childId],
    references: [children.id],
  }),
}));

export const vaccinesRelations = relations(vaccines, ({ one }) => ({
  child: one(children, {
    fields: [vaccines.childId],
    references: [children.id],
  }),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  child: one(children, {
    fields: [milestones.childId],
    references: [children.id],
  }),
  likes: many(milestoneLikes),
}));

export const diaryEntriesRelations = relations(
  diaryEntries,
  ({ one, many }) => ({
    child: one(children, {
      fields: [diaryEntries.childId],
      references: [children.id],
    }),
    user: one(users, {
      fields: [diaryEntries.userId],
      references: [users.id],
    }),
    likes: many(diaryLikes),
  }),
);

export const gamificationRelations = relations(gamification, ({ one }) => ({
  child: one(children, {
    fields: [gamification.childId],
    references: [children.id],
  }),
}));

export const gamificationEventsRelations = relations(
  gamificationEvents,
  ({ one }) => ({
    child: one(children, {
      fields: [gamificationEvents.childId],
      references: [children.id],
    }),
  }),
);

export const susVaccinesRelations = relations(susVaccines, ({ many }) => ({
  records: many(vaccineRecords),
}));

export const vaccineRecordsRelations = relations(vaccineRecords, ({ one }) => ({
  child: one(children, {
    fields: [vaccineRecords.childId],
    references: [children.id],
  }),
  susVaccine: one(susVaccines, {
    fields: [vaccineRecords.susVaccineId],
    references: [susVaccines.id],
  }),
}));

export const inviteCodesRelations = relations(inviteCodes, ({ one }) => ({
  child: one(children, {
    fields: [inviteCodes.childId],
    references: [children.id],
  }),
}));

export const activityComments = pgTable("activity_comments", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull(),
  recordType: text("record_type").notNull(),
  recordId: integer("record_id").notNull(),
  userId: varchar("user_id").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityCommentsRelations = relations(
  activityComments,
  ({ one }) => ({
    child: one(children, {
      fields: [activityComments.childId],
      references: [children.id],
    }),
    user: one(users, {
      fields: [activityComments.userId],
      references: [users.id],
    }),
  }),
);

// Likes em marcos (primeiras vezes)
export const milestoneLikes = pgTable(
  "milestone_likes",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id"),
    milestoneId: integer("milestone_id").notNull(),
    userId: varchar("user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueUserMilestone: uniqueIndex(
      "milestone_likes_user_milestone_unique",
    ).on(table.milestoneId, table.userId),
    userMilestoneIdx: index("milestone_likes_user_milestone_idx").on(
      table.userId,
      table.milestoneId,
    ),
    childMilestoneIdx: index("milestone_likes_child_milestone_idx").on(
      table.childId,
      table.milestoneId,
    ),
  }),
);

export const milestoneLikesRelations = relations(milestoneLikes, ({ one }) => ({
  milestone: one(milestones, {
    fields: [milestoneLikes.milestoneId],
    references: [milestones.id],
  }),
  user: one(users, {
    fields: [milestoneLikes.userId],
    references: [users.id],
  }),
}));

export const diaryLikes = pgTable(
  "diary_likes",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id"),
    diaryEntryId: integer("diary_entry_id").notNull(),
    userId: varchar("user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueUserDiaryEntry: uniqueIndex("diary_likes_entry_user_unique").on(
      table.diaryEntryId,
      table.userId,
    ),
    userDiaryEntryIdx: index("diary_likes_user_entry_idx").on(
      table.userId,
      table.diaryEntryId,
    ),
    childDiaryEntryIdx: index("diary_likes_child_entry_idx").on(
      table.childId,
      table.diaryEntryId,
    ),
  }),
);

export const diaryLikesRelations = relations(diaryLikes, ({ one }) => ({
  diaryEntry: one(diaryEntries, {
    fields: [diaryLikes.diaryEntryId],
    references: [diaryEntries.id],
  }),
  user: one(users, {
    fields: [diaryLikes.userId],
    references: [users.id],
  }),
}));

export const healthFollowUps = pgTable(
  "health_follow_ups",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    createdBy: varchar("created_by"),
    category: text("category").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    followUpDate: date("follow_up_date").notNull(),
    sourceType: text("source_type"),
    sourceId: integer("source_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    childFollowUpDateIdx: index("health_follow_ups_child_follow_up_date_idx").on(
      table.childId,
      table.followUpDate,
    ),
    sourceUnique: uniqueIndex("health_follow_ups_source_unique").on(
      table.sourceType,
      table.sourceId,
    ),
  }),
);

export const neonatalScreenings = pgTable(
  "neonatal_screenings",
  {
    id: serial("id").primaryKey(),
    followUpId: integer("follow_up_id").notNull(),
    screeningType: text("screening_type").notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: date("completed_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueFollowUpScreening: uniqueIndex(
      "neonatal_screenings_follow_up_type_unique",
    ).on(table.followUpId, table.screeningType),
  }),
);

export const developmentMilestones = pgTable(
  "development_milestones",
  {
    id: serial("id").primaryKey(),
    followUpId: integer("follow_up_id").notNull(),
    milestoneKey: text("milestone_key").notNull(),
    ageBand: text("age_band").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("pending"),
    notes: text("notes"),
    checkedAt: date("checked_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueFollowUpMilestone: uniqueIndex(
      "development_milestones_follow_up_key_unique",
    ).on(table.followUpId, table.milestoneKey),
  }),
);

export const healthExams = pgTable(
  "health_exams",
  {
    id: serial("id").primaryKey(),
    followUpId: integer("follow_up_id").notNull(),
    title: text("title").notNull(),
    examDate: date("exam_date").notNull(),
    notes: text("notes"),
    filePaths: text("file_paths").array(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    followUpExamDateIdx: index("health_exams_follow_up_exam_date_idx").on(
      table.followUpId,
      table.examDate,
    ),
  }),
);

export const healthFollowUpsRelations = relations(
  healthFollowUps,
  ({ one, many }) => ({
    child: one(children, {
      fields: [healthFollowUps.childId],
      references: [children.id],
    }),
    neonatalScreenings: many(neonatalScreenings),
    developmentMilestones: many(developmentMilestones),
    healthExams: many(healthExams),
  }),
);

export const neonatalScreeningsRelations = relations(
  neonatalScreenings,
  ({ one }) => ({
    followUp: one(healthFollowUps, {
      fields: [neonatalScreenings.followUpId],
      references: [healthFollowUps.id],
    }),
  }),
);

export const developmentMilestonesRelations = relations(
  developmentMilestones,
  ({ one }) => ({
    followUp: one(healthFollowUps, {
      fields: [developmentMilestones.followUpId],
      references: [healthFollowUps.id],
    }),
  }),
);

export const healthExamsRelations = relations(healthExams, ({ one }) => ({
  followUp: one(healthFollowUps, {
    fields: [healthExams.followUpId],
    references: [healthFollowUps.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertChildSchema = createInsertSchema(children).omit({
  id: true,
  createdAt: true,
});
export const insertCaregiverSchema = createInsertSchema(caregivers).omit({
  id: true,
  createdAt: true,
});
export const insertGrowthRecordSchema = createInsertSchema(growthRecords).omit({
  id: true,
  createdAt: true,
});
export const insertVaccineSchema = createInsertSchema(vaccines).omit({
  id: true,
  createdAt: true,
});
export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
});
export const insertDiaryEntrySchema = createInsertSchema(diaryEntries).omit({
  id: true,
  createdAt: true,
});
export const insertSusVaccineSchema = createInsertSchema(susVaccines).omit({
  id: true,
});
export const insertVaccineRecordSchema = createInsertSchema(
  vaccineRecords,
).omit({ id: true, createdAt: true });
export const insertDailyPhotoSchema = createInsertSchema(dailyPhotos).omit({
  id: true,
  createdAt: true,
});
export const insertPushSubscriptionSchema = createInsertSchema(
  pushSubscriptions,
).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export const insertInviteCodeSchema = createInsertSchema(inviteCodes).omit({
  id: true,
  createdAt: true,
});

// === EXPLICIT API CONTRACT TYPES ===
// Note: User and UpsertUser types are re-exported from ./models/auth

export type Child = typeof children.$inferSelect;
export type InsertChild = z.infer<typeof insertChildSchema>;

export type Caregiver = typeof caregivers.$inferSelect;
export type InsertCaregiver = z.infer<typeof insertCaregiverSchema>;

export type GrowthRecord = typeof growthRecords.$inferSelect;
export type InsertGrowthRecord = z.infer<typeof insertGrowthRecordSchema>;

export type Vaccine = typeof vaccines.$inferSelect;
export type InsertVaccine = z.infer<typeof insertVaccineSchema>;

export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;

export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type InsertDiaryEntry = z.infer<typeof insertDiaryEntrySchema>;

export type Gamification = typeof gamification.$inferSelect;
export type GamificationEvent = typeof gamificationEvents.$inferSelect;

export type SusVaccine = typeof susVaccines.$inferSelect;
export type InsertSusVaccine = z.infer<typeof insertSusVaccineSchema>;

export type VaccineRecord = typeof vaccineRecords.$inferSelect;
export type InsertVaccineRecord = z.infer<typeof insertVaccineRecordSchema>;

export type DailyPhoto = typeof dailyPhotos.$inferSelect;
export type InsertDailyPhoto = z.infer<typeof insertDailyPhotoSchema>;

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<
  typeof insertPushSubscriptionSchema
>;

export type AppNotification = typeof notifications.$inferSelect;
export type InsertAppNotification = z.infer<typeof insertNotificationSchema>;

export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = z.infer<typeof insertInviteCodeSchema>;

export const insertHealthFollowUpSchema = createInsertSchema(
  healthFollowUps,
).omit({ id: true, createdAt: true });

export const insertNeonatalScreeningSchema = createInsertSchema(
  neonatalScreenings,
).omit({ id: true, createdAt: true });

export const insertDevelopmentMilestoneSchema = createInsertSchema(
  developmentMilestones,
).omit({ id: true, createdAt: true });

export const insertHealthExamSchema = createInsertSchema(healthExams).omit({
  id: true,
  createdAt: true,
});

export type HealthFollowUp = typeof healthFollowUps.$inferSelect;
export type InsertHealthFollowUp = z.infer<typeof insertHealthFollowUpSchema>;

export type NeonatalScreening = typeof neonatalScreenings.$inferSelect;
export type InsertNeonatalScreening = z.infer<
  typeof insertNeonatalScreeningSchema
>;

export type DevelopmentMilestone = typeof developmentMilestones.$inferSelect;
export type InsertDevelopmentMilestone = z.infer<
  typeof insertDevelopmentMilestoneSchema
>;

export type HealthExam = typeof healthExams.$inferSelect;
export type InsertHealthExam = z.infer<typeof insertHealthExamSchema>;

export type HealthFollowUpWithRelations = HealthFollowUp & {
  neonatalScreenings: NeonatalScreening[];
  developmentMilestones: DevelopmentMilestone[];
  healthExams: HealthExam[];
};

export const insertActivityCommentSchema = createInsertSchema(
  activityComments,
).omit({
  id: true,
  createdAt: true,
});
export type ActivityComment = typeof activityComments.$inferSelect;
export type InsertActivityComment = z.infer<typeof insertActivityCommentSchema>;

export const insertMilestoneLikeSchema = createInsertSchema(
  milestoneLikes,
).omit({
  id: true,
  createdAt: true,
});
export type MilestoneLike = typeof milestoneLikes.$inferSelect;
export type InsertMilestoneLike = z.infer<typeof insertMilestoneLikeSchema>;

export type MilestoneLikeStatus = {
  count: number;
  userLiked: boolean;
};

export type MilestoneWithSocial = Milestone & {
  likeCount: number;
  commentCount: number;
  userLiked: boolean;
  creatorName: string | null;
  creatorAvatar: string | null;
};

export const insertDiaryLikeSchema = createInsertSchema(diaryLikes).omit({
  id: true,
  createdAt: true,
});
export type DiaryLike = typeof diaryLikes.$inferSelect;
export type InsertDiaryLike = z.infer<typeof insertDiaryLikeSchema>;

export type DiaryLikeStatus = {
  count: number;
  userLiked: boolean;
};

export type DiaryEntryWithSocial = DiaryEntry & {
  likeCount: number;
  userLiked: boolean;
  creatorName: string | null;
  creatorAvatar: string | null;
};

// Request Types
export type CreateChildRequest = InsertChild;
export type UpdateChildRequest = Partial<InsertChild>;

export type CreateGrowthRecordRequest = InsertGrowthRecord;
export type CreateVaccineRequest = InsertVaccine;
export type CreateMilestoneRequest = InsertMilestone;
export type CreateDiaryEntryRequest = InsertDiaryEntry;
