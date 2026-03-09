import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

function getConnectionString(): string {
  return (
    process.env.SUPABASE_DATABASE_URL ||
    process.env.SUPABASE_POOLER_URL ||
    process.env.DATABASE_URL ||
    ""
  );
}

async function main() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error(
      "Defina SUPABASE_DATABASE_URL, SUPABASE_POOLER_URL ou DATABASE_URL.",
    );
  }

  const usingDirect = !!process.env.SUPABASE_DATABASE_URL;
  const usingPooler = !usingDirect && !!process.env.SUPABASE_POOLER_URL;
  console.log(
    `[rls] Conectando via ${usingDirect ? "SUPABASE_DATABASE_URL" : usingPooler ? "SUPABASE_POOLER_URL" : "DATABASE_URL"}`,
  );

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Habilita RLS (idempotente).
    await client.query(
      `ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;`,
    );
    await client.query(
      `ALTER TABLE public.diary_likes ENABLE ROW LEVEL SECURITY;`,
    );

    // 2) Remove políticas antigas com os mesmos nomes (idempotente).
    await client.query(
      `DROP POLICY IF EXISTS notifications_select_own ON public.notifications;`,
    );
    await client.query(
      `DROP POLICY IF EXISTS notifications_update_own ON public.notifications;`,
    );
    await client.query(
      `DROP POLICY IF EXISTS diary_likes_select_visible ON public.diary_likes;`,
    );
    await client.query(
      `DROP POLICY IF EXISTS diary_likes_insert_own ON public.diary_likes;`,
    );
    await client.query(
      `DROP POLICY IF EXISTS diary_likes_delete_own ON public.diary_likes;`,
    );

    // 3) Recria políticas.
    await client.query(`
      CREATE POLICY notifications_select_own
      ON public.notifications
      FOR SELECT
      TO authenticated
      USING (recipient_user_id = auth.uid()::text);
    `);

    await client.query(`
      CREATE POLICY notifications_update_own
      ON public.notifications
      FOR UPDATE
      TO authenticated
      USING (recipient_user_id = auth.uid()::text)
      WITH CHECK (recipient_user_id = auth.uid()::text);
    `);

    // Para likes de diário: leitura para cuidadores da criança;
    // inserção/remoção apenas pelo próprio usuário autenticado.
    await client.query(`
      CREATE POLICY diary_likes_select_visible
      ON public.diary_likes
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.caregivers c
          WHERE c.user_id = auth.uid()::text
            AND c.child_id = COALESCE(
              diary_likes.child_id,
              (
                SELECT de.child_id
                FROM public.diary_entries de
                WHERE de.id = diary_likes.diary_entry_id
                LIMIT 1
              )
            )
        )
      );
    `);

    await client.query(`
      CREATE POLICY diary_likes_insert_own
      ON public.diary_likes
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()::text
        AND EXISTS (
          SELECT 1
          FROM public.caregivers c
          WHERE c.user_id = auth.uid()::text
            AND c.child_id = COALESCE(
              diary_likes.child_id,
              (
                SELECT de.child_id
                FROM public.diary_entries de
                WHERE de.id = diary_likes.diary_entry_id
                LIMIT 1
              )
            )
        )
      );
    `);

    await client.query(`
      CREATE POLICY diary_likes_delete_own
      ON public.diary_likes
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid()::text);
    `);

    await client.query("COMMIT");

    const check = await client.query(`
      SELECT
        n.nspname AS schema_name,
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN ('notifications', 'diary_likes')
      ORDER BY c.relname;
    `);

    console.log("[rls] Estado final:");
    for (const row of check.rows) {
      console.log(
        `- ${row.schema_name}.${row.table_name}: rls_enabled=${row.rls_enabled}`,
      );
    }

    console.log("[rls] Correção aplicada com sucesso.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[rls] Falha ao aplicar correção:", error);
  process.exit(1);
});
