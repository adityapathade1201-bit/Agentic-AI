/**
 * TriageFlow AI — Supabase Browser Client
 *
 * Initializes the client if environment variables are provided.
 * Gracefully degrades when unconfigured so the local deterministic
 * simulation remains 100% operational without crashing.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim() !== "" &&
  supabaseAnonKey.trim() !== "" &&
  !supabaseUrl.includes("placeholder")
);

let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured && supabaseUrl && supabaseAnonKey) {
  try {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  } catch (error) {
    console.warn("[TriageFlow AI] Failed to initialize Supabase client. Running in local simulation mode.", error);
    clientInstance = null;
  }
}

export const supabase = clientInstance;
