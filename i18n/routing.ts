import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pt-BR', 'pt-PT', 'es-PY', 'gn-PY', 'en'],
  defaultLocale: 'pt-BR',
  localePrefix: 'as-needed'
});
