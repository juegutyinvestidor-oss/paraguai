'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');

  useEffect(() => {
    console.error('EDUKYNE App Router Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#070b19] flex flex-col items-center justify-center p-4 text-center space-y-4">
      <h2 className="text-xl font-bold text-rose-400">{t('instabilidade')}</h2>
      <p className="text-xs text-[#bdc8d1]/60 max-w-sm">
        {t('instabilidadeDesc')}
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-[#1a2b4b] text-[#bdc8d1] hover:text-[#dae2fd] text-xs font-semibold rounded-lg border border-[#3e484f]/40 transition-transform active:scale-95"
      >
        {t('tentarNovamente')}
      </button>
    </div>
  );
}
