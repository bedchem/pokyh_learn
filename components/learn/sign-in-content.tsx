'use client';

import { ArrowLeft, BookOpenCheck, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { AuthForm } from '@/components/learn/auth-form';
import { PreferenceControls } from '@/components/layout/preference-controls';
import { useLearnPreferences } from '@/components/providers/learn-preferences';
import { BrandMark } from '@/components/ui/brand-mark';

export function SignInContent({ legalConfig }: { legalConfig: { privacyNoticeUrl: string; privacyNoticeVersion: string } }) {
  const { t } = useLearnPreferences();

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <header className="auth-intro__header">
          <BrandMark />
          <Link className="auth-back" href="/"><ArrowLeft size={16} /> {t('auth.back')}</Link>
        </header>
        <div className="auth-intro__content">
          <p className="eyebrow"><Sparkles size={15} /> {t('auth.space')}</p>
          <h1>{t('auth.title')}</h1>
          <p>{t('auth.body')}</p>
        </div>
        <ul className="auth-intro__proof">
          <li><BookOpenCheck size={18} /> {t('auth.progress')}</li>
          <li><ShieldCheck size={18} /> {t('auth.protected')}</li>
        </ul>
      </section>
      <section className="auth-panel">
        <div className="auth-panel__heading"><div><p className="eyebrow">{t('auth.welcome')}</p><h2>{t('auth.signInTitle')}</h2><p>{t('auth.signInBody')}</p></div><PreferenceControls compact /></div>
        <AuthForm legalConfig={legalConfig} />
      </section>
    </main>
  );
}
