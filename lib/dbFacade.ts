'use client';

import {getSupabase} from './supabase';
import {getSessionToken} from './sessionClient';
import {currentLocale, delocalizeRows, loadContentTranslations, localizeRows} from './contentI18n';
import type {SupabaseClient} from '@supabase/supabase-js';

type QueryResult = {data: unknown; error: {message: string} | null};
type Builder = Record<string, unknown>;

function notifySessionExpired(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('educore:session-expired'));
  }
}

async function dataWrite(body: Record<string, unknown>, locale: string): Promise<QueryResult> {
  try {
    if (Array.isArray(body.rows)) {
      const dictionary = await loadContentTranslations(locale);
      body = {...body, rows: delocalizeRows(String(body.table), body.rows, dictionary)};
    }
    const token = getSessionToken();
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({} as Record<string, unknown>));
    if (res.status === 401) {
      notifySessionExpired();
    }
    if (!res.ok || json?.error) {
      return {data: null, error: {message: String(json?.error || `HTTP ${res.status}`)}};
    }
    return {data: [], error: null};
  } catch (err) {
    return {data: null, error: {message: err instanceof Error ? err.message : 'Falha de rede'}};
  }
}

function deleteChain(table: string, locale: string) {
  const ids: string[] = [];
  const run = () => dataWrite({table, op: 'delete', ids}, locale);
  return {
    eq: (col: string, val: unknown): Promise<QueryResult> | QueryResult => {
      if (col !== 'id') {
        return Promise.resolve({data: null, error: {message: 'delete via facade suporta apenas filtro por id'}});
      }
      ids.push(String(val));
      return run();
    },
    in: (col: string, vals: unknown[]): Promise<QueryResult> | QueryResult => {
      if (col !== 'id') {
        return Promise.resolve({data: null, error: {message: 'delete via facade suporta apenas filtro por id'}});
      }
      ids.push(...vals.map(v => String(v)));
      return run();
    },
  };
}

function wrapReadBuilder(table: string, target: Builder, locale: string): Builder {
  return new Proxy(target, {
    get(object, key: string) {
      if (key === 'then') {
        return (
          onfulfilled: (value: unknown) => unknown,
          onrejected?: (reason: unknown) => unknown
        ) =>
          Promise.resolve(object as unknown as PromiseLike<unknown>)
            .then(async (result) => {
              if (!result || typeof result !== 'object') return result;
              const response = result as {data?: unknown};
              const dictionary = await loadContentTranslations(locale);
              return {...response, data: localizeRows(table, response.data, dictionary)};
            })
            .then(onfulfilled, onrejected);
      }

      const value = Reflect.get(object, key, object);
      if (typeof value !== 'function') return value;

      return (...args: unknown[]) => {
        const result = (value as (...args: unknown[]) => unknown).apply(object, args);
        if (result && typeof (result as Builder).then === 'function') {
          return wrapReadBuilder(table, result as Builder, locale);
        }
        return result;
      };
    },
  });
}

function tableFacade(table: string, real: SupabaseClient, locale: string): Builder {
  const upsert = (rows: unknown): Promise<QueryResult> => dataWrite({table, op: 'upsert', rows}, locale);
  const writes: Builder = {
    upsert,
    insert: upsert,
    delete: () => deleteChain(table, locale),
  };
  return new Proxy({} as Builder, {
    get(_t, key: string) {
      if (key in writes) return writes[key];
      const builder = real.from(table) as unknown as Builder;
      const value = builder[key];
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        const result = (value as (...args: unknown[]) => unknown).apply(builder, args);
        if (result && typeof (result as Builder).then === 'function') {
          return wrapReadBuilder(table, result as Builder, locale);
        }
        return result;
      };
    },
    has(_t, key: string) {
      return key in writes;
    },
  });
}

export function getDb(): SupabaseClient | null {
  const real = getSupabase();
  if (!real) return null;
  const locale = currentLocale();

  return new Proxy(real, {
    get(target, prop, _receiver) {
      if (prop === 'from') {
        return (table: string) => tableFacade(table, target, locale);
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as SupabaseClient;
}
