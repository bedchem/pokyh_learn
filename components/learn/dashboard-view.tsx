'use client';

import { ArrowRight, BookOpen, Clock3, Flame, GraduationCap, Sparkles, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import { useLearnPreferences } from '@/components/providers/learn-preferences';
import { CourseCard } from '@/components/ui/course-card';
import type { DashboardData, LearningAnalytics } from '@/lib/types';

function dayLabel(dayKey: string, locale: 'de' | 'en' | 'it') {
  const date = new Date(`${dayKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dayKey;
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date).replace('.', '');
}

function ActivityChart({ analytics }: { analytics: LearningAnalytics }) {
  const { locale, t } = useLearnPreferences();
  const peak = Math.max(...analytics.days.map((point) => point.answers), 1);
  return (
    <figure className="activity-chart-figure" aria-labelledby="activity-chart-caption">
      <div className="activity-chart" aria-hidden="true">
        {analytics.days.map((point) => (
          <div className="activity-chart__column" key={point.dayKey}>
            <span className="activity-chart__bar" style={{ height: `${(point.answers / peak) * 100}%` }} />
            <small>{dayLabel(point.dayKey, locale)}</small>
          </div>
        ))}
      </div>
      <figcaption className="sr-only" id="activity-chart-caption">{t('dashboard.activityAria')}</figcaption>
      <ol className="sr-only">
        {analytics.days.map((point) => <li key={point.dayKey}>{t('dashboard.activityDay', { day: point.dayKey, answers: String(point.answers) })}</li>)}
      </ol>
    </figure>
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  const { t } = useLearnPreferences();
  const activeCourse = data.activeCourses[0];
  const todayAnswers = data.analytics.days.at(-1)?.answers ?? 0;
  const accuracy = data.analytics.totals.accuracyPercent === null
    ? t('dashboard.noAccuracyYet')
    : t('dashboard.accuracy', { count: String(data.analytics.totals.accuracyPercent) });
  const recommendationHref = data.analytics.recommendation.href.startsWith('/')
    ? data.analytics.recommendation.href
    : '/practice';
  return (
    <div className="page-wrap dashboard-page">
      <section className="page-heading page-heading--dashboard">
        <div>
          <p className="eyebrow">{t('dashboard.space')}</p>
          <h1>{t('dashboard.greeting', { name: data.displayName })}</h1>
          <p className="page-lead">{t('dashboard.lead')}</p>
        </div>
        <Link className="streak-pill" href="/profile" aria-label={t('dashboard.streakAria', { count: String(data.analytics.totals.streakDays) })}><Flame size={19} /><b>{data.analytics.totals.streakDays}</b><span>{t('dashboard.streak')}</span></Link>
      </section>

      <section className="dashboard-grid dashboard-grid--top">
        <article className="continue-card">
          <div className="continue-card__copy">
            <span className="section-kicker"><Sparkles size={15} /> {t('dashboard.next')}</span>
            <h2>{activeCourse?.nextLesson || t('dashboard.findCourse')}</h2>
            <p>{activeCourse ? t('dashboard.courseSections', { title: activeCourse.title, count: String(activeCourse.modules) }) : t('dashboard.chooseCourse')}</p>
            <Link className="button button--dark" href={activeCourse ? `/courses/${activeCourse.slug}` : '/catalog'}>
              {activeCourse ? t('dashboard.continue') : t('courses.openCatalog')} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="continue-card__shape" aria-hidden="true"><span>la</span><i>il</i><b>lo</b></div>
        </article>

        <article className="goal-card">
          <div className="goal-card__header"><span className="icon-orb icon-orb--violet"><Target size={19} /></span><span>{t('dashboard.focus')}</span></div>
          <strong>{todayAnswers}<small> {t('dashboard.answersUnit')}</small></strong>
          <p>{t('dashboard.todayAnswers')}</p>
          <span className="goal-card__note"><Clock3 size={15} /> {t('dashboard.planMinutes', { count: String(data.dailyGoalMinutes) })}</span>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--middle">
        <article className="panel activity-panel">
          <div className="panel-heading"><div><p className="section-kicker"><TrendingUp size={15} /> {t('dashboard.rhythm')}</p><h2>{t('dashboard.thisWeek')}</h2></div><span className="metric-chip"><Clock3 size={14} /> {t('dashboard.answers', { count: String(data.analytics.totals.answers) })}</span></div>
          <ActivityChart analytics={data.analytics} />
          <div className="chart-legend"><span><i className="legend-dot legend-dot--violet" />{t('dashboard.answeredCards')}</span><span>{accuracy} · {t('dashboard.activeDays', { count: String(data.analytics.totals.activeDays) })}</span></div>
        </article>

        <article className="panel review-panel">
          <div className="panel-heading"><div><p className="section-kicker"><BookOpen size={15} /> {t('dashboard.prepared')}</p><h2>{t('dashboard.targeted')}</h2></div><Link href="/practice" className="text-link">{t('dashboard.viewAll')} <ArrowRight size={15} /></Link></div>
          <div className="review-counts">
            <Link href="/practice?queue=due"><b>{data.analytics.queues.due}</b><span>{t('dashboard.due')}</span></Link>
            <Link href="/practice?queue=mistakes"><b>{data.analytics.queues.wrong}</b><span>{t('dashboard.mistakes')}</span></Link>
          </div>
          <div className="review-preview">
            {data.reviewCards.slice(0, 2).map((card) => <div key={card.id}><span className={`status-dot status-dot--${card.kind}`} /><p><b>{card.prompt}</b><small>{t('dashboard.reviewFrom', { course: card.courseTitle })}</small></p></div>)}
          </div>
          <Link href={recommendationHref} className="button button--soft">{t('dashboard.startTraining')} <ArrowRight size={16} /></Link>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">{t('dashboard.selection')}</p><h2>{t('dashboard.activeCourses')}</h2></div><Link href="/courses" className="text-link">{t('dashboard.allCourses')} <ArrowRight size={15} /></Link></div>
        <div className="course-grid">{data.activeCourses.map((course) => <CourseCard course={course} href={`/courses/${course.slug}`} key={course.id} />)}</div>
      </section>

      <section className="suggestion-banner"><div className="icon-orb icon-orb--rose"><GraduationCap size={21} /></div><div><b>{t('dashboard.ownPath')}</b><p>{t('dashboard.ownPathBody')}</p></div><Link href="/create/course" className="text-link">{t('action.createCourse')} <ArrowRight size={16} /></Link></section>
    </div>
  );
}
