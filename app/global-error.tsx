'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('EDUKYNE Global Layout Error:', error);
  }, [error]);

  return (
    <html lang="pt-br">
      <body className="min-h-screen bg-[#070b19] flex flex-col items-center justify-center p-4 text-center space-y-4 font-sans text-[#dae2fd]">
        <h2 className="text-2xl font-bold text-rose-500">Erro Crítico Global</h2>
        <p className="text-xs text-[#bdc8d1]/60 max-w-sm">
          Ocorreu uma falha grave na inicialização ou no carregamento do layout principal do portal.
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-[#1a2b4b] text-[#bdc8d1] hover:text-[#dae2fd] text-xs font-semibold rounded-lg border border-[#3e484f]/40 transition-transform active:scale-95"
        >
          Reiniciar Aplicativo
        </button>
      </body>
    </html>
  );
}
