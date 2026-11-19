'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Shield, Lock, Mail, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '../i18n/navigation';
import { setSessionToken } from '../lib/sessionClient';
import LanguageSwitcher from './LanguageSwitcher';

interface LoginViewProps {
  onLoginSuccess: (userName: string, userEmail: string, role?: string, id?: string) => void;
}

function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={className} fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="7" height="30" rx="2.5" fill="#0f172a" />
      <rect x="13.5" y="24" width="6" height="13" rx="2.5" fill="#334155" />
      <rect x="22" y="17" width="6" height="20" rx="2.5" fill="#64748b" />
      <path
        d="M31 9 L40 21.5 L31 37"
        stroke="#0f172a"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!email.includes('@')) {
      setError(t('erroEmail'));
      setIsSubmitting(false);
      return;
    }

    if (password.length < 4) {
      setError(t('erroSenha'));
      setIsSubmitting(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : '';
        if (res.status === 423 || msg.includes('bloqueada') || msg.includes('bloqueado')) {
          setError(t('erroBloqueada'));
        } else if (res.status === 401) {
          setError(t('erroCredenciais'));
        } else {
          setError(msg || t('erroAutenticar'));
        }
        setIsSubmitting(false);
        return;
      }

      const matchedUser = data?.user;
      if (!matchedUser || !data?.token) {
        setError(t('erroResposta'));
        setIsSubmitting(false);
        return;
      }

      setSessionToken(data.token);
      onLoginSuccess(matchedUser.name, matchedUser.email, matchedUser.role, matchedUser.id);
    } catch (err) {
      console.error('Exceção no login:', err);
      setError(t('erroInesperado'));
      setIsSubmitting(false);
    }
  };

  const renderCard = (idPrefix: string) => (
    <div
      style={{ containerType: 'inline-size' }}
      className="w-full bg-white rounded-[13px] shadow-[0_24px_60px_rgba(0,0,0,0.45)] flex flex-col justify-center animate-in fade-in zoom-in duration-300"
    >
      <div className="w-full px-[6.6%] pt-[6.3%] pb-[4.7%] space-y-[max(9px,2.6cqw)] flex flex-col justify-center">
      {/* Branding */}
      <div className="text-center space-y-[max(7px,2cqw)]">
        <div className="inline-flex items-center justify-center gap-[max(6px,1.8cqw)]">
          <BrandMark className="w-[max(26px,9cqw)] h-[max(26px,9cqw)] shrink-0" />
          <span className="text-[max(21px,8.2cqw)] font-black text-slate-900 tracking-tight leading-none flex items-center gap-[max(4px,1cqw)]">
            EDUKYNE
            <Sparkles className="w-[max(16px,4.2cqw)] h-[max(16px,4.2cqw)] text-sky-500 shrink-0" />
          </span>
        </div>
        <p className="text-[max(12px,2.7cqw)] text-slate-500 uppercase tracking-[0.15em] font-semibold leading-[1.7] max-w-[88%] mx-auto">
          {t('plataforma')}
        </p>
        <div className="flex justify-center pt-1">
          <LanguageSwitcher variant="light" />
        </div>
      </div>

      <hr className="border-slate-200" />

      <div className="space-y-[max(3px,1.2cqw)] pt-[max(8px,3cqw)]">
        <h3 className="text-[max(17px,5.1cqw)] font-bold text-slate-900 leading-tight">{t('acesso')}</h3>
        <p className="text-[max(12px,3.2cqw)] text-slate-500 leading-snug">
          {t('instrucao')}
        </p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-[max(18px,5.5cqw)] pt-[max(3px,0.9cqw)]">
        {/* E-mail Field */}
        <div className="space-y-[max(7px,2.6cqw)]">
          <label className="text-[max(12px,2.8cqw)] font-semibold text-slate-700 block" htmlFor={`${idPrefix}-email`}>
            <span>{t('email')}</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-[max(12px,3.4cqw)] top-1/2 -translate-y-1/2 w-[max(16px,3.8cqw)] h-[max(16px,3.8cqw)] text-slate-400" />
            <input
              id={`${idPrefix}-email`}
              type="email"
              required
              autoComplete="off"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-[max(8px,1.7cqw)] h-[max(44px,10.6cqw)] pl-[max(38px,10cqw)] pr-[max(12px,3cqw)] text-[max(16px,3.15cqw)] text-slate-800 focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-[max(7px,2.6cqw)]">
          <label className="text-[max(12px,2.8cqw)] font-semibold text-slate-700 block" htmlFor={`${idPrefix}-password`}>
            <span>{t('senha')}</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-[max(12px,3.4cqw)] top-1/2 -translate-y-1/2 w-[max(16px,3.8cqw)] h-[max(16px,3.8cqw)] text-slate-400" />
            <input
              id={`${idPrefix}-password`}
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="off"
              placeholder={t('senhaPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-[max(8px,1.7cqw)] h-[max(44px,10.6cqw)] pl-[max(38px,10cqw)] pr-[max(38px,9.4cqw)] text-[max(16px,3.15cqw)] text-slate-800 focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none transition-all placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('ocultarSenha') : t('mostrarSenha')}
              className="absolute right-[max(10px,2.8cqw)] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="w-[max(16px,3.8cqw)] h-[max(16px,3.8cqw)]" />
              ) : (
                <Eye className="w-[max(16px,3.8cqw)] h-[max(16px,3.8cqw)]" />
              )}
            </button>
          </div>
        </div>

        {/* Error messaging bar */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-[max(8px,1.6cqw)] p-[max(8px,1.8cqw)] text-[max(11px,2.6cqw)] text-red-600 leading-relaxed">
            {error}
          </div>
        )}

        {/* Submission Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-[max(6px,1.6cqw)] h-[max(46px,11.4cqw)] bg-black hover:bg-slate-800 text-white font-semibold text-[max(13px,3.4cqw)] rounded-[max(8px,1.8cqw)] shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="w-[max(16px,3.8cqw)] h-[max(16px,3.8cqw)] border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{t('autenticando')}</span>
            </>
          ) : (
            <>
              <Shield className="w-[max(16px,3.8cqw)] h-[max(16px,3.8cqw)]" />
              <span>{t('entrar')}</span>
            </>
          )}
        </button>
      </form>

      {/* Footnote */}
      <div className="text-center text-[max(11px,2.6cqw)] text-slate-400 space-y-[max(4px,1.5cqw)] pt-[max(9px,2.7cqw)]">
        <p>{t('copyright')}</p>
        <p>{t('ssl')}</p>
        <p className="pt-[max(8px,3cqw)]">
          <Link
            href="/politica-privacidade"
            className="text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors"
          >
            {t('privacidade')}
          </Link>
        </p>
      </div>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-[100dvh] bg-[#03101d] select-none font-sans">
      {/* Fallback mobile: foto desfocada + card legível */}
      <div className="login-fallback relative w-full min-h-[100dvh] items-center justify-center overflow-hidden">
        <div
          className="absolute left-0 top-1/2 max-w-none"
          style={{ width: 'max(320vw,194vh,1400px)', transform: 'translate(-3%,-50%)' }}
        >
          <Image
            src="/login-bg.webp"
            alt=""
            width={1748}
            height={900}
            priority
            className="block w-full h-auto blur-[26px] scale-105"
          />
        </div>
        <div className="absolute inset-0 bg-[#03101d]/60" />
        <div className="relative z-10 w-full flex justify-center p-4">
          <div className="w-[min(92vw,420px)]">{renderCard('fb')}</div>
        </div>
      </div>

      {/* Overlay desktop: imagem integral da mockup com o formulário real sobre o card branco */}
      <div className="login-overlay w-full min-h-[100dvh] items-center justify-center overflow-hidden">
        <div
          className="relative shrink-0 overflow-hidden"
          style={{
            width: 'min(100vw, calc(100dvh * 1.9422))',
            aspectRatio: '1748 / 900',
            borderRadius: 'min(2.28vw, 4.43dvh)',
          }}
        >
          <Image src="/login-bg.webp" alt="" fill sizes="(min-width: 194dvh) 194dvh, 100vw" priority className="object-cover" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[30.5%] min-h-[77%] flex">
            {renderCard('ov')}
          </div>
        </div>
      </div>
    </div>
  );
}
