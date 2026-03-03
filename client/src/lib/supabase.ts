import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Cliente Supabase para o frontend — usado exclusivamente para Realtime
// (não para autenticação nem queries — essas passam pelo servidor Express)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Guard: se as variáveis não estiverem definidas (ex: ambiente sem .env),
// exporta null e o Realtime é silenciosamente desativado — sem crash
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        realtime: {
          params: { eventsPerSecond: 10 },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

if (!supabase) {
  console.warn("[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos — Realtime desativado");
}

