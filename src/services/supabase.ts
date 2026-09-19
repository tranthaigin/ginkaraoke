import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabaseConfigError = !url || !publishableKey
  ? 'Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_PUBLISHABLE_KEY. Hãy cấu hình .env.local.'
  : null;

export const supabase: SupabaseClient<Database> | null = supabaseConfigError
  ? null
  : createClient<Database>(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      realtime: { params: { eventsPerSecond: 10 } },
    });

export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase chưa được cấu hình.');
  return supabase;
}

export function authRedirectUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}
