'use client';

import { Flame, Target, TrendingUp } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { useLearnPreferences } from '@/components/providers/learn-preferences';
import type { DashboardData } from '@/lib/types';

const WEEKS = 53;
const DAYS_PER_WEEK = 7;

function parseDay(dayKey: string): Date {
  return new Date(`${dayKey}T12:00:00`);
}

// Buckets activity into 5 visual levels (0 = none) rather than a continuous
// scale — matches the GitHub contribution graph convention and stays legible
// at 366 tiny squares regardless of how spiky one day's count is.
function intensityLevel(answers: number, maxAnswers: number): 0 | 1 | 2 | 3 | 4 {
  if (answers <= 0 || maxAnswers <= 0) return 0;
  const ratio = answers / maxAnswers;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

export type YearActivityDay = { dayKey: string; answers: number; minutes: number };

export function ContributionHeatmap({ days, locale }: { days: YearActivityDay[]; locale: 'de' | 'en' | 'it' }) {
  const { t } = useLearnPreferences();
  const scrollRef = useRef<HTMLDivElement>(null);
  const maxAnswers = Math.max(...days.map((day) => day.answers), 1);

  // When the grid is wider than the panel (small/tablet screens), start the
  // horizontal scroll at the most recent week instead of the oldest one —
  // matching what a learner actually wants to see first.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollLeft = node.scrollWidth;
  }, [days]);

  // Pad the front so the grid always starts on the same weekday column,
  // matching GitHub's week-column layout.
  const firstWeekday = days.length > 0 ? parseDay(days[0]!.dayKey).getDay() : 0;
  const padding = Array.from({ length: firstWeekday }, () => null);
  const cells: Array<{ dayKey: string; answers: number; minutes: number } | null> = [...padding, ...days];
  while (cells.length < WEEKS * DAYS_PER_WEEK) cells.push(null);

  const weeks: Array<Array<{ dayKey: string; answers: number; minutes: number } | null>> = [];
  for (let week = 0; week < WEEKS; week += 1) {
    weeks.push(cells.slice(week * DAYS_PER_WEEK, week * DAYS_PER_WEEK + DAYS_PER_WEEK));
  }

  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'short' });
  let lastMonth = -1;
  const monthLabels = weeks.map((week) => {
    const firstRealDay = week.find((cell) => cell !== null);
    if (!firstRealDay) return '';
    const month = parseDay(firstRealDay.dayKey).getMonth();
    if (month === lastMonth) return '';
    lastMonth = month;
    return monthFormatter.format(parseDay(firstRealDay.dayKey)).replace('.', '');
  });

  const dateFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="contribution-heatmap">
      <div className="contribution-heatmap__scroll" ref={scrollRef}>
        <div className="contribution-heatmap__inner">
          <div className="contribution-heatmap__months" aria-hidden="true">
            {monthLabels.map((label, index) => <span key={index}>{label}</span>)}
          </div>
          <div className="contribution-heatmap__grid" role="img" aria-label={t('profile.heatmapAria')}>
            {weeks.map((week, weekIndex) => (
              <div className="contribution-heatmap__week" key={weekIndex}>
                {week.map((cell, dayIndex) => cell
                  ? (
                    <span
                      key={cell.dayKey}
                      className={`contribution-heatmap__cell contribution-heatmap__cell--${intensityLevel(cell.answers, maxAnswers)}`}
                      title={`${dateFormatter.format(parseDay(cell.dayKey))}: ${t('profile.heatmapTooltip', { answers: String(cell.answers), minutes: String(cell.minutes) })}`}
                    />
                  )
                  : <span className="contribution-heatmap__cell contribution-heatmap__cell--pad" key={`pad-${weekIndex}-${dayIndex}`} aria-hidden="true" />)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="contribution-heatmap__legend" aria-hidden="true">
        <span>{t('profile.heatmapLess')}</span>
        {[0, 1, 2, 3, 4].map((level) => <span className={`contribution-heatmap__cell contribution-heatmap__cell--${level}`} key={level} />)}
        <span>{t('profile.heatmapMore')}</span>
      </div>
    </div>
  );
}

export function ProfileView({ data }: { data: DashboardData }) {
  const { locale, t } = useLearnPreferences();
  const year = data.analytics.yearActivity;
  const totalAnswers = year.reduce((sum, day) => sum + day.answers, 0);
  const totalMinutes = year.reduce((sum, day) => sum + day.minutes, 0);
  const activeDays = year.filter((day) => day.answers > 0).length;

  return (
    <div className="page-wrap profile-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{t('profile.eyebrow')}</p>
          <h1>{t('profile.title', { name: data.displayName })}</h1>
          <p className="page-lead">{t('profile.lead')}</p>
        </div>
      </section>

      <section className="profile-stats">
        <article className="goal-card">
          <div className="goal-card__header"><span className="icon-orb icon-orb--sun"><Flame size={19} /></span><span>{t('dashboard.streak')}</span></div>
          <strong>{data.analytics.totals.streakDays}<small> {t('profile.daysUnit')}</small></strong>
          <p>{t('profile.streakBody')}</p>
        </article>
        <article className="goal-card">
          <div className="goal-card__header"><span className="icon-orb icon-orb--violet"><Target size={19} /></span><span>{t('profile.minutesLearned')}</span></div>
          <strong>{totalMinutes}<small> {t('profile.minutesUnit')}</small></strong>
          <p>{t('profile.minutesBody')}</p>
        </article>
        <article className="goal-card">
          <div className="goal-card__header"><span className="icon-orb icon-orb--mint"><TrendingUp size={19} /></span><span>{t('profile.activeDays')}</span></div>
          <strong>{activeDays}<small> / {year.length} {t('profile.daysUnit')}</small></strong>
          <p>{t('profile.activeDaysBody', { count: String(totalAnswers) })}</p>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><p className="section-kicker">{t('profile.contributions')}</p><h2>{t('profile.contributionsTitle')}</h2></div></div>
        {totalAnswers > 0
          ? <ContributionHeatmap days={year} locale={locale} />
          : <div className="inline-empty"><TrendingUp size={18} /><div><b>{t('profile.emptyHeatmapTitle')}</b><p>{t('profile.emptyHeatmap')}</p></div></div>}
      </section>
    </div>
  );
}
