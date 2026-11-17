import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let instance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (typeof window !== 'undefined') return null;
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/^['"`]|['"`]$/g, '')
    .replace(/\/rest\/v1\/?$/, '')
    .trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '')
    .replace(/^['"`]|['"`]$/g, '')
    .trim();
  if (!url || !key) {
    console.error('[Edukyne] getSupabaseAdmin: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local');
    return null;
  }
  if (!instance) {
    instance = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }
  return instance;
}
