import { createClient } from "@supabase/supabase-js";

// Cliente Supabase para o frontend — usado exclusivamente para Realtime
// (não para autenticação nem queries — essas passam pelo servidor Express)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  // Desativa auth automático — o app usa o servidor Express para auth
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
