'use client';

import {useEffect, useState} from 'react';
import {NextIntlClientProvider, useTranslations} from 'next-intl';
import type {AbstractIntlMessages} from 'use-intl';
import {routing} from '../i18n/routing';
import ptBR from '../messages/pt-BR.json';
import ptPT from '../messages/pt-PT.json';
import esPY from '../messages/es-PY.json';
import gnPY from '../messages/gn-PY.json';
import en from '../messages/en.json';

type AppLocale = (typeof routing.locales)[number];

const messages: Record<AppLocale, AbstractIntlMessages> = {
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  'es-PY': esPY,
  'gn-PY': gnPY,
  en
};

function isAppLocale(value: string | undefined): value is AppLocale {
  return !!value && (routing.locales as readonly string[]).includes(value);
}

function detectLocale(): AppLocale {
  if (typeof document === 'undefined') return routing.defaultLocale as AppLocale;

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('NEXT_LOCALE='))
    ?.split('=')[1];
  if (cookie) {
    const cookieLocale = decodeURIComponent(cookie);
    if (isAppLocale(cookieLocale)) return cookieLocale;
  }

  const pathLocale = window.location.pathname.split('/').filter(Boolean)[0];
  if (isAppLocale(pathLocale)) return pathLocale;

  const browserLocale = navigator.language;
  if (isAppLocale(browserLocale)) return browserLocale;
  if (browserLocale.startsWith('pt')) return browserLocale === 'pt-PT' ? 'pt-PT' : 'pt-BR';
  if (browserLocale.startsWith('es')) return 'es-PY';
  if (browserLocale.startsWith('gn')) return 'gn-PY';
  if (browserLocale.startsWith('en')) return 'en';

  return routing.defaultLocale as AppLocale;
}

function GlobalErrorContent({
  error,
  reset
}: {
  error: Error & {digest?: string};
  reset: () => void;
}) {
  const t = useTranslations('globalError');

  useEffect(() => {
    console.error('EDUKYNE Global Layout Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center p-4 text-center space-y-4">
      <h2 className="text-2xl font-bold text-rose-500">{t('title')}</h2>
      <p className="text-xs text-[#bdc8d1]/60 max-w-sm">{t('message')}</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-[#1a2b4b] text-[#bdc8d1] hover:text-[#dae2fd] text-xs font-semibold rounded-lg border border-[#3e484f]/40 transition-transform active:scale-95"
      >
        {t('restart')}
      </button>
    </div>
  );
}

export default function GlobalError({
  error,
  reset
}: {
  error: Error & {digest?: string};
  reset: () => void;
}) {
  const [locale, setLocale] = useState<AppLocale>(routing.defaultLocale as AppLocale);

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-[#070b19] flex flex-col items-center justify-center p-4 font-sans text-[#dae2fd]">
        <NextIntlClientProvider locale={locale} messages={messages[locale]}>
          <GlobalErrorContent error={error} reset={reset} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
