/**
 * TriageFlow AI — Anonymous Authentication Service
 *
 * Acquires a real Supabase anonymous session and extracts auth.uid().
 * Enables strict RLS policies (auth.uid() = user_id) without requiring a login form.
 */

import { supabase, isSupabaseConfigured } from "./supabaseClient";

export interface AuthState {
  userId: string | null;
  isAnonymous: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export async function ensureAnonymousSession(): Promise<AuthState> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      userId: null,
      isAnonymous: false,
      isAuthenticated: false,
      error: "Supabase not configured",
    };
  }

  try {
    // 1. Check for existing active session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.warn("[AuthService] Error checking existing session:", sessionError.message);
    }

    if (sessionData?.session?.user) {
      return {
        userId: sessionData.session.user.id,
        isAnonymous: sessionData.session.user.is_anonymous ?? true,
        isAuthenticated: true,
        error: null,
      };
    }

    // 2. No session found — perform anonymous sign-in
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    if (authError) {
      console.warn("[AuthService] Anonymous sign-in failed:", authError.message);
      return {
        userId: null,
        isAnonymous: false,
        isAuthenticated: false,
        error: authError.message,
      };
    }

    return {
      userId: authData.user?.id ?? null,
      isAnonymous: true,
      isAuthenticated: Boolean(authData.user),
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[AuthService] Unexpected error during anonymous auth:", message);
    return {
      userId: null,
      isAnonymous: false,
      isAuthenticated: false,
      error: message,
    };
  }
}

export async function getCurrentSession() {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("[AuthService] Error fetching session:", error.message);
      return null;
    }
    return data.session ?? null;
  } catch (err) {
    console.warn("[AuthService] Unexpected error getting session:", err);
    return null;
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}
