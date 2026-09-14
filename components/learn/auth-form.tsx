'use client';

import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { useLearnPreferences } from '@/components/providers/learn-preferences';
import type { LearnLegalConfig } from '@/lib/server/learn-legal-config';

export function AuthForm({ legalConfig }: { legalConfig: LearnLegalConfig }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLearnPreferences();
  const [visible, setVisible] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const privacyConfigured = !legalConfig.privacyRequired || Boolean(legalConfig.privacyNoticeUrl && legalConfig.privacyNoticeVersion);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!privacyConfigured || (legalConfig.privacyRequired && !acknowledged)) {
      setError(privacyConfigured ? t('auth.privacyRequired') : t('auth.privacyUnavailable'));
      return;
    }

    setPending(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.get('username'),
          password: data.get('password'),
          privacyNoticeVersion: legalConfig.privacyNoticeVersion,
        }),
      });
      if (!response.ok) {
        // The BFF deliberately returns generic failures for upstream/auth
        // errors. Keep that boundary in the UI too: raw backend text may be
        // untranslated or reveal implementation details.
        setError(t('auth.unavailable'));
        return;
      }
      const returnTo = searchParams.get('returnTo');
      router.push(returnTo && returnTo.startsWith('/') ? returnTo : '/dashboard');
      router.refresh();
    } catch {
      setError(t('auth.unavailable'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>{t('auth.username')}<span className="input-icon"><UserRound size={17} /></span><input name="username" autoComplete="username" minLength={1} maxLength={100} required placeholder="dein-name" /></label>
      <label>{t('auth.password')}<span className="input-icon"><LockKeyhole size={17} /></span><input name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" minLength={1} maxLength={200} required placeholder="••••••••" /><button className="password-toggle" type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></label>
      {legalConfig.privacyRequired ? privacyConfigured ? <label className="auth-privacy"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span>{t('auth.privacyPrefix')} <a href={legalConfig.privacyNoticeUrl} target="_blank" rel="noreferrer">{t('auth.privacyLink')}</a>{' '}{t('auth.privacySuffix')}</span></label> : <p className="auth-privacy__missing">{t('auth.privacyUnavailable')}</p> : null}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="button button--dark button--wide" disabled={pending || !privacyConfigured || (legalConfig.privacyRequired && !acknowledged)} type="submit">{pending ? t('auth.checking') : t('auth.submit')} <ArrowRight size={16} /></button>
      <p className="auth-switch">{t('auth.noAccount')}</p>
    </form>
  );
}
