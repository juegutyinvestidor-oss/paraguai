import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Clean potential copy-pasted string characters like extra quotes or surrounding spaces
const sanitizeEnvVar = (val: string | undefined): string => {
  if (!val) return '';
  return val.replace(/^['"'“`]|[''"”`]$/g, '').trim();
};

const isValidUrl = (str: string): boolean => {
  if (!str) return false;
  try {
    const parsed = new URL(str);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

const isPlaceholder = (str: string): boolean => {
  const s = str.toLowerCase();
  if (s === '') return true;
  if (s === 'undefined' || s === 'null') return true;
  // Unambiguous placeholder markers are flagged regardless of length
  if (s.includes('placeholder') || s.includes('changeme') || s.includes('key_here')) return true;
  // Only scrutinize generic tokens (your_/my_/example/xxx) on SHORT strings,
  // so a real long Supabase anon key (base64url) is never a false positive.
  if (str.length >= 50) return false;
  return (
    s.includes('your_') ||
    s.includes('your-') ||
    s.includes('my_') ||
    s.includes('my-') ||
    s.includes('example') ||
    s.includes('xxxx')
  );
};

const _supabaseUrl = sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL);
const _supabaseKey = sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const isSupabaseConfigured = !!(
  _supabaseUrl && isValidUrl(_supabaseUrl) && !isPlaceholder(_supabaseUrl) &&
  _supabaseKey && _supabaseKey.length >= 20 && !isPlaceholder(_supabaseKey)
);

// Use globalThis caching to survive Hot Module Replacement or dual module loads in browser/server.
interface SupabaseCache {
  instance?: SupabaseClient;
  currentUrl?: string;
  currentKey?: string;
}

const getCache = (): SupabaseCache => {
  const g = globalThis as Record<string, unknown>;
  if (!g._supabaseCache) {
    g._supabaseCache = {};
  }
  return g._supabaseCache as SupabaseCache;
};

export function getSupabase() {
  let url = sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Sanitize the URL before checking validity
  if (url) {
    url = url.replace(/\/rest\/v1\/?$/, '');
  }

  if (!url || !isValidUrl(url) || isPlaceholder(url)) {
    console.error('[Edukyne] Supabase URL nao configurada. Defina NEXT_PUBLIC_SUPABASE_URL no .env.local');
    return null;
  }
  if (!key || isPlaceholder(key) || key.length < 20) {
    console.error('[Edukyne] Supabase Anon Key nao configurada. Defina NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local');
    return null;
  }

  const cache = getCache();

  if (!cache.instance || cache.currentUrl !== url || cache.currentKey !== key) {
    cache.currentUrl = url;
    cache.currentKey = key;
    cache.instance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'educore-unique-auth-key-' + Math.random().toString(36).substring(7),
        storage: {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {}
        }
      }
    });
  }

  return cache.instance;
}

// LGPD: Enviar senha de forma isolada via RPC (nunca no objeto de upsert)
export async function setPasswordSecure(targetEmail: string, newPassword: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.rpc('set_password', {
    target_email: targetEmail,
    new_password: newPassword,
  });
  return !error;
}

// LGPD: Recuperar CPF descriptografado via RPC (somente Admin/Gestor no backend).
// Retorna null se o chamador não tiver permissão ou se não houver CPF.
export async function getDecryptedCpf(
  targetTable: 'students' | 'professionals',
  targetId: string
): Promise<string | null> {
  try {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc('get_cpf_decrypted', {
      target_table: targetTable,
      target_id: targetId,
    });
    if (error) {
      console.warn('[LGPD] Falha ao obter CPF descriptografado:', error);
      return null;
    }
    return data || null;
  } catch (err) {
    console.warn('[LGPD] Falha ao obter CPF descriptografado:', err);
    return null;
  }
}
