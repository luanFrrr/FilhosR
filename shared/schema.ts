import { pgTable, text, serial, integer, boolean, timestamp, date, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  birthDate: date("birth_date").notNull(),
  gender: text("gender").notNull(), // 'male', 'female', 'unspecified'
  theme: text("theme").default('neutral'), // 'blue', 'pink', 'neutral', 'custom'
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
  userId: integer("user_id").notNull(),
  relationship: text("relationship").notNull(), // 'father', 'mother', 'guardian', etc.
  role: text("role").notNull().default('viewer'), // 'owner', 'editor', 'viewer'
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
  status: text("status").notNull().default('pending'), // 'pending', 'completed', 'overdue'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const healthRecords = pgTable("health_records", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull(),
  date: date("date").notNull(),
  symptoms: text("symptoms").notNull(),
  diagnosis: text("diagnosis"),
  medication: text("medication"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull(),
  date: date("date").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const diaryEntries = pgTable("diary_entries", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull(),
  date: date("date").notNull(),
  content: text("content"),
  photoUrls: text("photo_urls").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gamification = pgTable("gamification", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  points: integer("points").default(0),
  level: text("level").default('Iniciante'),
  achievements: jsonb("achievements").default([]),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  caregiverEntries: many(caregivers),
  gamification: many(gamification),
}));

export const childrenRelations = relations(children, ({ many }) => ({
  caregivers: many(caregivers),
  growthRecords: many(growthRecords),
  vaccines: many(vaccines),
  healthRecords: many(healthRecords),
  milestones: many(milestones),
  diaryEntries: many(diaryEntries),
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

export const healthRecordsRelations = relations(healthRecords, ({ one }) => ({
  child: one(children, {
    fields: [healthRecords.childId],
    references: [children.id],
  }),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  child: one(children, {
    fields: [milestones.childId],
    references: [children.id],
  }),
}));

export const diaryEntriesRelations = relations(diaryEntries, ({ one }) => ({
  child: one(children, {
    fields: [diaryEntries.childId],
    references: [children.id],
  }),
}));

export const gamificationRelations = relations(gamification, ({ one }) => ({
  user: one(users, {
    fields: [gamification.userId],
    references: [users.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertChildSchema = createInsertSchema(children).omit({ id: true, createdAt: true });
export const insertCaregiverSchema = createInsertSchema(caregivers).omit({ id: true, createdAt: true });
export const insertGrowthRecordSchema = createInsertSchema(growthRecords).omit({ id: true, createdAt: true });
export const insertVaccineSchema = createInsertSchema(vaccines).omit({ id: true, createdAt: true });
export const insertHealthRecordSchema = createInsertSchema(healthRecords).omit({ id: true, createdAt: true });
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true, createdAt: true });
export const insertDiaryEntrySchema = createInsertSchema(diaryEntries).omit({ id: true, createdAt: true });

// === EXPLICIT API CONTRACT TYPES ===

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Child = typeof children.$inferSelect;
export type InsertChild = z.infer<typeof insertChildSchema>;

export type Caregiver = typeof caregivers.$inferSelect;
export type InsertCaregiver = z.infer<typeof insertCaregiverSchema>;

export type GrowthRecord = typeof growthRecords.$inferSelect;
export type InsertGrowthRecord = z.infer<typeof insertGrowthRecordSchema>;

export type Vaccine = typeof vaccines.$inferSelect;
export type InsertVaccine = z.infer<typeof insertVaccineSchema>;

export type HealthRecord = typeof healthRecords.$inferSelect;
export type InsertHealthRecord = z.infer<typeof insertHealthRecordSchema>;

export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;

export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type InsertDiaryEntry = z.infer<typeof insertDiaryEntrySchema>;

export type Gamification = typeof gamification.$inferSelect;

// Request Types
export type CreateChildRequest = InsertChild;
export type UpdateChildRequest = Partial<InsertChild>;

export type CreateGrowthRecordRequest = InsertGrowthRecord;
export type CreateVaccineRequest = InsertVaccine;
export type CreateHealthRecordRequest = InsertHealthRecord;
export type CreateMilestoneRequest = InsertMilestone;
export type CreateDiaryEntryRequest = InsertDiaryEntry;
