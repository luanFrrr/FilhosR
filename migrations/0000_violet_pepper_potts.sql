CREATE TABLE "activity_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"record_type" text NOT NULL,
	"record_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "caregivers" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"relationship" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"birth_date" date NOT NULL,
	"gender" text NOT NULL,
	"theme" text DEFAULT 'neutral',
	"theme_color" text,
	"initial_weight" numeric,
	"initial_height" numeric,
	"initial_head_circumference" numeric,
	"photo_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"date" date NOT NULL,
	"photo_url" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "diary_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"date" date NOT NULL,
	"content" text,
	"photo_urls" text[],
	"likes_count" integer DEFAULT 0 NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false,
	"user_id" varchar,
	"mood_emoji" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "diary_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer,
	"diary_entry_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gamification" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"points" integer DEFAULT 0,
	"level" text DEFAULT 'Iniciante',
	"achievements" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gamification_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"record_type" text NOT NULL,
	"record_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "growth_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"date" date NOT NULL,
	"weight" numeric,
	"height" numeric,
	"head_circumference" numeric,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "health_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"date" date NOT NULL,
	"symptoms" text NOT NULL,
	"diagnosis" text,
	"medication" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invite_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"child_id" integer NOT NULL,
	"created_by" varchar NOT NULL,
	"used_by" varchar,
	"relationship" text DEFAULT 'caregiver' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invite_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "medical_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"created_by" varchar NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"exam_date" date NOT NULL,
	"file_paths" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "milestone_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer,
	"milestone_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"user_id" varchar,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"photo_url" text,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_user_id" varchar NOT NULL,
	"actor_user_id" varchar,
	"actor_name" text,
	"actor_avatar" text,
	"child_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"deep_link" text DEFAULT '/' NOT NULL,
	"record_type" text,
	"record_id" integer,
	"comment_id" integer,
	"metadata" jsonb,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sus_vaccines" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"diseases_prevented" text NOT NULL,
	"recommended_doses" text NOT NULL,
	"age_range" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"display_first_name" varchar,
	"display_last_name" varchar,
	"display_photo_url" text,
	"profile_customized" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vaccine_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"sus_vaccine_id" integer NOT NULL,
	"dose" text NOT NULL,
	"application_date" date,
	"application_place" text,
	"notes" text,
	"photo_urls" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vaccines" (
	"id" serial PRIMARY KEY NOT NULL,
	"child_id" integer NOT NULL,
	"name" text NOT NULL,
	"scheduled_date" date NOT NULL,
	"administered_date" date,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "daily_photos_child_date_unique" ON "daily_photos" USING btree ("child_id","date");--> statement-breakpoint
CREATE INDEX "diary_entries_child_date_created_id_idx" ON "diary_entries" USING btree ("child_id","date","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "diary_likes_entry_user_unique" ON "diary_likes" USING btree ("diary_entry_id","user_id");--> statement-breakpoint
CREATE INDEX "diary_likes_user_entry_idx" ON "diary_likes" USING btree ("user_id","diary_entry_id");--> statement-breakpoint
CREATE INDEX "diary_likes_child_entry_idx" ON "diary_likes" USING btree ("child_id","diary_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gamification_child_id_unique" ON "gamification" USING btree ("child_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gamification_events_idempotency" ON "gamification_events" USING btree ("record_type","record_id","reason");--> statement-breakpoint
CREATE INDEX "idx_gamification_events_child" ON "gamification_events" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "medical_records_child_exam_date_idx" ON "medical_records" USING btree ("child_id","exam_date");--> statement-breakpoint
CREATE UNIQUE INDEX "milestone_likes_user_milestone_unique" ON "milestone_likes" USING btree ("milestone_id","user_id");--> statement-breakpoint
CREATE INDEX "milestone_likes_user_milestone_idx" ON "milestone_likes" USING btree ("user_id","milestone_id");--> statement-breakpoint
CREATE INDEX "milestone_likes_child_milestone_idx" ON "milestone_likes" USING btree ("child_id","milestone_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_user_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_child_idx" ON "notifications" USING btree ("child_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE UNIQUE INDEX "vaccine_records_idempotency" ON "vaccine_records" USING btree ("child_id","sus_vaccine_id","dose");