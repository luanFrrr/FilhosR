import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// SUPABASE_POOLER_URL = Connection Pooling URL (porta 6543) do Supabase Dashboard
// → Settings → Database → Connection Pooling → Transaction mode
// Com o pooler, o servidor suporta centenas de usuários simultâneos
const poolerUrl = process.env.SUPABASE_POOLER_URL;
const directUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
const connectionString = poolerUrl || directUrl;

if (!connectionString) {
  throw new Error("SUPABASE_POOLER_URL, SUPABASE_DATABASE_URL ou DATABASE_URL deve estar definida.");
}

const isSupabase = !!(poolerUrl || process.env.SUPABASE_DATABASE_URL);
const usePooler = !!poolerUrl;

if (usePooler) {
  console.log("[db] Usando PgBouncer (Connection Pooling) — modo escala");
} else if (isSupabase) {
  console.log("[db] Usando conexão direta Supabase — defina SUPABASE_POOLER_URL para maior escala");
}

export const pool = new Pool({
  connectionString,
  // Com PgBouncer: pool local grande, pois o Bouncer gerencia a fila real
  // Sem PgBouncer: pool menor para não estourar limite do Supabase free
  max: usePooler ? 20 : isSupabase ? 5 : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ...(isSupabase
    ? {
        ssl: { rejectUnauthorized: false },
        // keepAlive só é confiável em conexão direta; no PgBouncer o SO gerencia
        ...(usePooler ? {} : { keepAlive: true, keepAliveInitialDelayMillis: 10_000 }),
      }
    : {}),
});

export const db = drizzle(pool, { schema });
