'use client';

import {useTransition} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import {usePathname, useRouter} from '../i18n/navigation';

const LOCALES = ['pt-BR', 'pt-PT', 'es-PY', 'gn-PY', 'en'] as const;

const LABELS: Record<string, string> = {
  'pt-BR': 'Português (Brasil)',
  'pt-PT': 'Português (Portugal)',
  'es-PY': 'Español (Paraguay)',
  'gn-PY': 'Avañe’ẽ (Paraguay)',
  en: 'English'
};

export default function LanguageSwitcher({variant = 'dark'}: {variant?: 'dark' | 'light'}) {
  const locale = useLocale();
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const dark = variant === 'dark';

  return (
    <label className={`flex items-center gap-2 text-[10px] font-semibold ${dark ? 'text-[#bdc8d1]/80' : 'text-slate-500'}`}>
      <span className="uppercase tracking-wider">{t('idioma')}</span>
      <select
        aria-label={t('idioma')}
        value={locale}
        disabled={pending}
        onChange={(event) => {
          const nextLocale = event.target.value;
          startTransition(() => {
            router.replace(pathname, {locale: nextLocale});
          });
        }}
        className={`rounded-md border px-2 py-1 text-[10px] outline-none transition-colors disabled:opacity-50 ${
          dark
            ? 'border-[#3e484f]/60 bg-[#131b2e] text-[#dae2fd] focus:border-[#8ed5ff]'
            : 'border-slate-300 bg-white text-slate-700 focus:border-sky-400'
        }`}
      >
        {LOCALES.map((item) => (
          <option key={item} value={item}>
            {LABELS[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
