import { defineConfig } from "drizzle-kit";

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
const isSupabase =
  !!process.env.SUPABASE_DATABASE_URL ||
  !!process.env.SUPABASE_POOLER_URL ||
  /supabase\.co/i.test(connectionString || "");

if (!connectionString) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: isSupabase ? { rejectUnauthorized: false } : false,
  },
});
