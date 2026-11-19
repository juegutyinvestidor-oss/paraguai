'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const t = useTranslations('header');
  return (
    <header className="md:hidden flex justify-between items-center h-14 px-4 sticky top-0 z-40 border-b border-[#3e484f]/40 bg-[#0b1326]/95 backdrop-blur-md text-[#dae2fd]">
      {/* Title / Mobile button wrapper */}
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <button 
            onClick={onMenuClick} 
            className="md:hidden p-2.5 -ml-1 hover:bg-[#131b2e] rounded-lg text-[#bdc8d1]/80 hover:text-white transition-colors"
            title={t('abrirMenu')}
            aria-label={t('abrirMenu')}
          >
            <Menu className="w-5 h-5 text-[#8ed5ff]" />
          </button>
        )}
        <h1 className="text-base font-bold tracking-tight text-[#8ed5ff]">EDUKYNE</h1>
      </div>
    </header>
  );
}
