import {getTranslations} from 'next-intl/server';
import {Link} from '../../i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('errors');

  return (
    <div className="min-h-screen bg-[#070b19] flex flex-col items-center justify-center p-4 text-center space-y-4">
      <h2 className="text-2xl font-bold text-[#dae2fd]">{t('paginaNaoEncontrada')}</h2>
      <p className="text-xs text-[#bdc8d1]/60">{t('paginaDesc')}</p>
      <Link
        href="/"
        className="px-4 py-2 bg-[#1a2b4b] text-[#bdc8d1] hover:text-[#dae2fd] text-xs font-semibold rounded-lg border border-[#3e484f]/40 transition-transform active:scale-95"
      >
        {t('voltarInicio')}
      </Link>
    </div>
  );
}
