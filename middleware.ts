import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(pt-BR|pt-PT|es-PY|gn-PY|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
