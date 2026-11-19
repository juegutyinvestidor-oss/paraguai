import React from 'react';
import {getTranslations} from 'next-intl/server';
import {Link} from '../../../i18n/navigation';

export default async function PoliticaPrivacidadePage() {
  const t = await getTranslations('legal');

  return (
    <div className="min-h-screen bg-[#070b19] flex items-center justify-center p-4 relative overflow-hidden select-none font-sans text-[#dae2fd]">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#38bdf8]/5 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#1e293b]/25 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-3xl relative z-10 bg-[#171f33] border border-[#3e484f]/40 rounded-2xl shadow-2xl p-5 sm:p-8 space-y-6 animate-in fade-in duration-300">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-[#131b2e] border border-[#3e484f]/40 rounded-2xl shadow-xl mb-4">
            <span className="text-2xl font-black text-[#38bdf8] tracking-widest font-mono flex items-center gap-1">
              EDU<span className="text-[#dae2fd]">KYNE</span>
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#8ed5ff] uppercase tracking-wider">
            {t('title')}
          </h1>
          <p className="text-[11px] text-[#bdc8d1]/80 mt-2">
            {t('subtitle')}
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">{t('s1t')}</h2>
          <p className="text-xs text-[#bdc8d1]/90 leading-relaxed">{t('s1b')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">{t('s2t')}</h2>
          <p className="text-xs text-[#bdc8d1]/90 leading-relaxed">{t('s2b')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">{t('s3t')}</h2>
          <ul className="text-xs text-[#bdc8d1]/90 space-y-1 list-disc pl-4 leading-relaxed">
            <li>{t('s3b1')}</li>
            <li>{t('s3b2')}</li>
            <li>{t('s3b3')}</li>
            <li>{t('s3b4')}</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">{t('s4t')}</h2>
          <p className="text-xs text-[#bdc8d1]/90 leading-relaxed">{t('s4b')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">{t('s5t')}</h2>
          <p className="text-xs text-[#bdc8d1]/90 leading-relaxed">{t('s5b')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">{t('s6t')}</h2>
          <p className="text-xs text-[#bdc8d1]/90 leading-relaxed">{t('s6b')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">{t('s7t')}</h2>
          <p className="text-xs text-[#bdc8d1]/90 leading-relaxed">{t('s7intro')}</p>
          <ul className="text-xs text-[#bdc8d1]/90 space-y-1 list-disc pl-4 leading-relaxed">
            <li>{t('s7b1')}</li>
            <li>{t('s7b2')}</li>
            <li>{t('s7b3')}</li>
            <li>{t('s7b4')}</li>
            <li>{t('s7b5')}</li>
            <li>{t('s7b6')}</li>
            <li>{t('s7b7')}</li>
            <li>{t('s7b8')}</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#8ed5ff] border-b border-[#3e484f]/25 pb-2">{t('s8t')}</h2>
          <p className="text-xs text-[#bdc8d1]/90 leading-relaxed">{t('s8b')}</p>
          <div className="bg-[#0b1326] border border-[#3e484f]/40 rounded-lg p-4 mt-2 space-y-1">
            <p className="text-xs text-[#8ed5ff]"><strong>{t('email')}</strong> lgpd@edukyne.com.br</p>
            <p className="text-xs text-[#bdc8d1]/80"><strong>{t('address')}</strong> {t('addressValue')}</p>
          </div>
        </section>

        <div className="border-t border-[#3e484f]/40 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-xs bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#001e2c] font-bold rounded-lg px-5 py-2.5 inline-flex items-center gap-2 transition-all">
            {t('back')}
          </Link>
          <p className="text-[10px] text-[#87929a]">
            {t('updated')}
          </p>
        </div>
      </div>
    </div>
  );
}
