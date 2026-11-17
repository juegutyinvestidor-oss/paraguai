import { getSupabase } from './supabase';
import { uuid } from './idGenerator';
import { getSessionToken } from './sessionClient';

const BUCKET = 'avatars';

async function avatarFetch(form: FormData): Promise<Record<string, unknown> | null> {
  try {
    const token = getSessionToken();
    const res = await fetch('/api/avatar', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    return await res.json().catch(() => null);
  } catch (err) {
    console.error('[Edukyne] Erro na chamada de avatar:', err);
    return null;
  }
}

export async function uploadAvatar(file: File, prefix: string = 'avatar', id?: string): Promise<string | null> {
  const form = new FormData();
  form.append('action', 'upload');
  form.append('prefix', id ? `${prefix}-${id}` : prefix);
  form.append('file', file, `${prefix}-${uuid().slice(0, 8)}`);
  const data = await avatarFetch(form);
  if (!data || data.error || typeof data.url !== 'string' || !data.url) {
    console.error('[Edukyne] Erro ao enviar avatar:', data?.error || 'sem resposta');
    return null;
  }
  return data.url;
}

export function getAvatarPublicUrl(path: string): string | null {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function deleteAvatar(path: string): Promise<boolean> {
  const form = new FormData();
  form.append('action', 'delete');
  form.append('path', path);
  const data = await avatarFetch(form);
  if (!data || data.error) {
    console.error('[Edukyne] Erro ao excluir avatar:', data?.error || 'sem resposta');
    return false;
  }
  return true;
}

export function getAvatarPath(url?: string | null): string | null {
  if (!url) return null;
  const cleanUrl = url.split('?')[0];
  const marker = '/object/public/';
  const idx = cleanUrl.indexOf(marker);
  if (idx === -1) return null;
  const afterBucket = cleanUrl.substring(idx + marker.length);
  const slash = afterBucket.indexOf('/');
  if (slash === -1) return null;
  return afterBucket.substring(slash + 1) || null;
}

export async function deleteAvatarByUrl(url?: string | null): Promise<boolean> {
  const path = getAvatarPath(url);
  if (!path) return false;
  return deleteAvatar(path);
}
