import type {NextRequest} from 'next/server';
import {createTranslator, type AbstractIntlMessages} from 'use-intl';
import {routing} from '../i18n/routing';
import ptBR from '../messages/pt-BR.json';
import ptPT from '../messages/pt-PT.json';
import esPY from '../messages/es-PY.json';
import gnPY from '../messages/gn-PY.json';
import en from '../messages/en.json';

type AppLocale = (typeof routing.locales)[number];

export type ApiTranslator = (key: string, values?: Record<string, string | number>) => string;

const messages: Record<AppLocale, AbstractIntlMessages> = {
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  'es-PY': esPY,
  'gn-PY': gnPY,
  en
};

function isAppLocale(value: string | undefined | null): value is AppLocale {
  return !!value && (routing.locales as readonly string[]).includes(value);
}

function fromTag(tag: string): AppLocale | undefined {
  const clean = tag.trim().toLowerCase();
  if (isAppLocale(clean)) return clean;
  if (clean === 'pt') return 'pt-BR';
  if (clean.startsWith('pt-pt')) return 'pt-PT';
  if (clean.startsWith('pt')) return 'pt-BR';
  if (clean.startsWith('es')) return 'es-PY';
  if (clean.startsWith('gn')) return 'gn-PY';
  if (clean.startsWith('en')) return 'en';
  return undefined;
}

export function localeFromRequest(req: NextRequest): AppLocale {
  const headerLocale = req.headers.get('x-locale');
  if (isAppLocale(headerLocale)) return headerLocale;

  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;
  if (isAppLocale(cookieLocale)) return cookieLocale;

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const pathLocale = new URL(referer).pathname.split('/').filter(Boolean)[0];
      const resolved = fromTag(pathLocale);
      if (resolved) return resolved;
    } catch { /* referer invalido */ }
  }

  const acceptLanguage = req.headers.get('accept-language');
  if (acceptLanguage) {
    for (const part of acceptLanguage.split(',')) {
      const resolved = fromTag(part.split(';')[0]);
      if (resolved) return resolved;
    }
  }

  return routing.defaultLocale as AppLocale;
}

export function getApiTranslator(req: NextRequest): ApiTranslator {
  const locale = localeFromRequest(req);
  return createTranslator({locale, messages: messages[locale], namespace: 'api'}) as unknown as ApiTranslator;
}
