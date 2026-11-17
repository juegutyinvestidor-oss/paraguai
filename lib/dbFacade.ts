'use client';

import { getSupabase } from './supabase';
import { getSessionToken } from './sessionClient';
import type { SupabaseClient } from '@supabase/supabase-js';

type QueryResult = { data: unknown; error: { message: string } | null };

function notifySessionExpired(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('educore:session-expired'));
  }
}

async function dataWrite(body: Record<string, unknown>): Promise<QueryResult> {
  try {
    const token = getSessionToken();
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({} as Record<string, unknown>));
    if (res.status === 401) {
      notifySessionExpired();
    }
    if (!res.ok || json?.error) {
      return { data: null, error: { message: String(json?.error || `HTTP ${res.status}`) } };
    }
    return { data: [], error: null };
  } catch (err) {
    return { data: null, error: { message: err instanceof Error ? err.message : 'Falha de rede' } };
  }
}

function deleteChain(table: string) {
  const ids: string[] = [];
  const run = () => dataWrite({ table, op: 'delete', ids });
  return {
    eq: (col: string, val: unknown): Promise<QueryResult> | QueryResult => {
      if (col !== 'id') {
        return Promise.resolve({ data: null, error: { message: 'delete via facade suporta apenas filtro por id' } });
      }
      ids.push(String(val));
      return run();
    },
    in: (col: string, vals: unknown[]): Promise<QueryResult> | QueryResult => {
      if (col !== 'id') {
        return Promise.resolve({ data: null, error: { message: 'delete via facade suporta apenas filtro por id' } });
      }
      ids.push(...vals.map(v => String(v)));
      return run();
    },
  };
}

function tableFacade(table: string, real: SupabaseClient): Record<string, unknown> {
  const upsert = (rows: unknown): Promise<QueryResult> => dataWrite({ table, op: 'upsert', rows });
  const writes: Record<string, unknown> = {
    upsert,
    insert: upsert,
    delete: () => deleteChain(table),
  };
  return new Proxy({} as Record<string, unknown>, {
    get(_t, key: string) {
      if (key in writes) return writes[key];
      const builder = real.from(table) as unknown as Record<string, unknown>;
      const value = builder[key];
      return typeof value === 'function' ? value.bind(builder) : value;
    },
    has(_t, key: string) {
      return key in writes;
    },
  });
}

export function getDb(): SupabaseClient | null {
  const real = getSupabase();
  if (!real) return null;
  return new Proxy(real, {
    get(target, prop, _receiver) {
      if (prop === 'from') {
        return (table: string) => {
          const facade = tableFacade(table, target);
          return new Proxy(facade, {
            get(f, key: string) {
              if (key in facade) return facade[key];
              const builder = target.from(table) as unknown as Record<string, unknown>;
              const value = builder[key];
              return typeof value === 'function' ? value.bind(builder) : value;
            },
          });
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as SupabaseClient;
}
