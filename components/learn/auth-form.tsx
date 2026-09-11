'use client';

import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const isRegistration = mode === 'register';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${isRegistration ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: data.get('username'), password: data.get('password') }) });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    setPending(false);
    if (!response.ok) { setError(payload?.error || 'Anmeldung nicht möglich.'); return; }
    const returnTo = searchParams.get('returnTo');
    router.push(returnTo && returnTo.startsWith('/') ? returnTo : '/dashboard');
    router.refresh();
  }

  return <form className="auth-form" onSubmit={submit}><label>Benutzername<span className="input-icon"><UserRound size={17} /></span><input name="username" autoComplete="username" minLength={isRegistration ? 3 : 1} maxLength={30} required placeholder="dein-name" /></label><label>Passwort<span className="input-icon"><LockKeyhole size={17} /></span><input name="password" type={visible ? 'text' : 'password'} autoComplete={isRegistration ? 'new-password' : 'current-password'} minLength={isRegistration ? 8 : 1} required placeholder="••••••••" /><button className="password-toggle" type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button button--dark button--wide" disabled={pending} type="submit">{pending ? 'Einen Moment…' : isRegistration ? 'Konto erstellen' : 'Anmelden'} <ArrowRight size={16} /></button><p className="auth-switch">{isRegistration ? 'Schon registriert?' : 'Noch kein Konto?'} <Link href={isRegistration ? '/sign-in' : '/register'}>{isRegistration ? 'Anmelden' : 'Konto erstellen'}</Link></p></form>;
}
