import { createClient } from "@supabase/supabase-js";

const envUrl = import.meta.env?.VITE_SUPABASE_URL;
const envKey =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  import.meta.env?.VITE_SUPABASE_KEY;
// fallback opcional (útil em dev se você quiser injetar via window.__SUPABASE_*)
const win: any = typeof window !== "undefined" ? window : {};
const supabaseUrl = envUrl || win.__SUPABASE_URL || "";
const supabaseAnonKey =
  envKey || win.__SUPABASE_ANON_KEY || win.__SUPABASE_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  // Evita throw para não quebrar a build; só alerta.
  // Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.
  console.warn("[Supabase] Credenciais ausentes. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabase };
export default supabase;
