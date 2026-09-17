'use client';

import { ArrowLeft, Flame, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import { ContributionHeatmap } from '@/components/learn/profile-view';
import { useLearnPreferences } from '@/components/providers/learn-preferences';
import type { TeammateAnalytics } from '@/lib/server/data';

export function TeammateStatsView({ teamId, teamName, stats }: { teamId: string; teamName: string; stats: TeammateAnalytics }) {
  const { locale, t } = useLearnPreferences();
  const totalAnswers = stats.yearActivity.reduce((sum, day) => sum + day.answers, 0);

  return (
    <div className="page-wrap profile-page">
      <Link className="back-link" href={`/teams/${teamId}`}><ArrowLeft size={16} /> {teamName}</Link>
      <section className="page-heading">
        <div>
          <p className="eyebrow">{t('profile.teammateEyebrow', { team: teamName })}</p>
          <h1>{t('profile.title', { name: stats.username })}</h1>
          <p className="page-lead">{t('profile.teammateLead')}</p>
        </div>
      </section>

      <section className="profile-stats">
        <article className="goal-card">
          <div className="goal-card__header"><span className="icon-orb icon-orb--sun"><Flame size={19} /></span><span>{t('dashboard.streak')}</span></div>
          <strong>{stats.totals.streakDays}<small> {t('profile.daysUnit')}</small></strong>
          <p>{t('profile.streakBody')}</p>
        </article>
        <article className="goal-card">
          <div className="goal-card__header"><span className="icon-orb icon-orb--violet"><Target size={19} /></span><span>{t('profile.minutesLearned')}</span></div>
          <strong>{stats.totals.minutesLearned}<small> {t('profile.minutesUnit')}</small></strong>
          <p>{t('profile.minutesBody')}</p>
        </article>
        <article className="goal-card">
          <div className="goal-card__header"><span className="icon-orb icon-orb--mint"><TrendingUp size={19} /></span><span>{t('profile.activeDays')}</span></div>
          <strong>{stats.totals.activeDays}<small> / {stats.yearActivity.length} {t('profile.daysUnit')}</small></strong>
          <p>{t('profile.activeDaysBody', { count: String(totalAnswers) })}</p>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><p className="section-kicker">{t('profile.contributions')}</p><h2>{t('profile.contributionsTitle')}</h2></div></div>
        {totalAnswers > 0
          ? <ContributionHeatmap days={stats.yearActivity} locale={locale} />
          : <div className="inline-empty"><TrendingUp size={18} /><div><b>{t('profile.emptyHeatmapTitle')}</b><p>{t('profile.emptyHeatmap')}</p></div></div>}
      </section>
    </div>
  );
}
