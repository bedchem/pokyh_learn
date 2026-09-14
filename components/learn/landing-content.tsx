'use client';

import { ArrowRight, BookOpen, CheckCircle2, Sparkles, UsersRound } from 'lucide-react';
import Link from 'next/link';

import { PreferenceControls } from '@/components/layout/preference-controls';
import { LandingMotion } from '@/components/motion/landing-motion';
import { useLearnPreferences } from '@/components/providers/learn-preferences';
import { BrandMark } from '@/components/ui/brand-mark';

export function LandingContent() {
  const { t } = useLearnPreferences();

  return (
    <main className="landing">
      <header className="landing-nav">
        <BrandMark />
        <nav aria-label={t('nav.primary')}>
          <Link href="/catalog">{t('nav.catalog')}</Link>
          <Link href="/sign-in">{t('landing.signIn')}</Link>
          <PreferenceControls compact />
          <Link href="/sign-in" className="button button--dark button--small">{t('landing.start')} <ArrowRight size={15} /></Link>
        </nav>
      </header>
      <LandingMotion>
        <section className="landing-hero">
          <div data-motion="landing-copy">
            <p className="eyebrow"><Sparkles size={15} /> {t('landing.eyebrow')}</p>
            <h1>{t('landing.titleBefore')} <em>{t('landing.titleEmphasis')}</em> {t('landing.titleAfter')}</h1>
            <p className="landing-lead">{t('landing.lead')}</p>
            <div className="landing-hero__actions" data-motion="landing-actions">
              <Link href="/catalog" className="button button--dark">{t('landing.catalog')} <ArrowRight size={17} /></Link>
              <Link href="/sign-in" className="button button--plain">{t('landing.signIn')}</Link>
            </div>
            <div className="landing-trust">
              <span><CheckCircle2 size={16} /> {t('landing.trustProgress')}</span>
              <span><CheckCircle2 size={16} /> {t('landing.trustDevices')}</span>
            </div>
          </div>
          <div className="landing-dashboard" data-motion="landing-dashboard" aria-label={t('landing.previewLabel')}>
            <div className="landing-dashboard__top"><span className="landing-mini-logo">P</span><span>{t('landing.today')}</span><i /></div>
            <div className="landing-dashboard__body">
              <div className="landing-dashboard__summary">
                <p>{t('landing.review')}</p>
                <b>14 <small>{t('landing.wordsDue')}</small></b>
                <span>{t('landing.invest')}</span>
                <Link href="/sign-in" className="landing-dashboard__action">{t('landing.begin')} <ArrowRight size={15} /></Link>
              </div>
              <div className="landing-dashboard__chart">
                <span>{t('landing.rhythm')}</span>
                <div>{[42, 58, 49, 73, 65, 88, 74].map((height, index) => <i data-motion="landing-bar" style={{ height: `${height}%` }} key={index} />)}</div>
                <small>{t('landing.weekdays')}</small>
              </div>
              <div className="landing-dashboard__course"><span><BookOpen size={16} /> Italiano · A1</span><b>Artikel: il, lo, la</b><p><i /> 62% {t('landing.completed')}</p></div>
            </div>
          </div>
        </section>
        <section className="landing-values">
          <article data-motion="landing-value"><span><BookOpen size={20} /></span><h2>{t('landing.valueCourses')}</h2><p>{t('landing.valueCoursesBody')}</p></article>
          <article data-motion="landing-value"><span><Sparkles size={20} /></span><h2>{t('landing.valueMistakes')}</h2><p>{t('landing.valueMistakesBody')}</p></article>
          <article data-motion="landing-value"><span><UsersRound size={20} /></span><h2>{t('landing.valueTeams')}</h2><p>{t('landing.valueTeamsBody')}</p></article>
        </section>
      </LandingMotion>
    </main>
  );
}
