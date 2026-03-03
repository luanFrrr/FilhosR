import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set.",
  );
}

const isSupabase = !!process.env.SUPABASE_DATABASE_URL;

export const pool = new Pool({
  connectionString,
  // Configurações otimizadas para conexão remota (Supabase)
  max: isSupabase ? 5 : 10,               // Supabase free tier tem limite de conexões
  idleTimeoutMillis: 30_000,              // Fecha conexões ociosas após 30s
  connectionTimeoutMillis: 10_000,        // Timeout ao tentar adquirir conexão
  ...(isSupabase
    ? {
        ssl: { rejectUnauthorized: false },
        keepAlive: true,                  // Mantém conexão SSL viva entre queries
        keepAliveInitialDelayMillis: 10_000,
      }
    : {}),
});
export const db = drizzle(pool, { schema });
