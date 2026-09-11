import { ArrowRight, BookOpen, CheckCircle2, Clock3, Flame, GraduationCap, Sparkles, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import { CourseCard } from '@/components/ui/course-card';
import type { DashboardData } from '@/lib/types';

function ProgressBars({ data }: { data: DashboardData }) {
  const peak = Math.max(...data.progressSeries.map((point) => point.value), 1);
  return (
    <div className="activity-chart" aria-label="Lernaktivität dieser Woche">
      {data.progressSeries.map((point) => (
        <div className="activity-chart__column" key={point.label}>
          <span className="activity-chart__bar" style={{ height: `${(point.value / peak) * 100}%` }} />
          <small>{point.label}</small>
        </div>
      ))}
    </div>
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  const activeCourse = data.activeCourses[0];
  return (
    <div className="page-wrap dashboard-page">
      <section className="page-heading page-heading--dashboard">
        <div>
          <p className="eyebrow">Dein Lernraum</p>
          <h1>Guten Morgen, {data.displayName}.</h1>
          <p className="page-lead">Ein kleiner, klarer Schritt bringt dich heute weiter.</p>
        </div>
        <div className="streak-pill" aria-label={`${data.streakDays} Tage Lernserie`}><Flame size={19} /><b>{data.streakDays}</b><span>Tage am Ball</span></div>
      </section>

      <section className="dashboard-grid dashboard-grid--top">
        <article className="continue-card">
          <div className="continue-card__copy">
            <span className="section-kicker"><Sparkles size={15} /> Als Nächstes</span>
            <h2>{activeCourse?.nextLesson || 'Finde deinen nächsten Kurs'}</h2>
            <p>{activeCourse ? `${activeCourse.title} · ${activeCourse.modules} ${activeCourse.modules === 1 ? 'Abschnitt' : 'Abschnitte'}` : 'Wähle einen Kurs aus dem Katalog aus.'}</p>
            <Link className="button button--dark" href={activeCourse ? `/courses/${activeCourse.slug}` : '/catalog'}>
              {activeCourse ? 'Weiterlernen' : 'Katalog öffnen'} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="continue-card__shape" aria-hidden="true"><span>la</span><i>il</i><b>lo</b></div>
        </article>

        <article className="goal-card">
          <div className="goal-card__header"><span className="icon-orb icon-orb--violet"><Target size={19} /></span><span>Lernfokus</span></div>
          <strong>{data.weeklyGoalProgress}<small> / {data.weeklyGoal}</small></strong>
          <p>Antworten im aktuellen Fokus</p>
          <div className="progress-track"><i style={{ width: `${Math.min(100, (data.weeklyGoalProgress / data.weeklyGoal) * 100)}%` }} /></div>
          <span className="goal-card__note"><CheckCircle2 size={15} /> Noch {Math.max(0, data.weeklyGoal - data.weeklyGoalProgress)} bis zum Ziel</span>
        </article>
      </section>

      <section className="dashboard-grid dashboard-grid--middle">
        <article className="panel activity-panel">
          <div className="panel-heading"><div><p className="section-kicker"><TrendingUp size={15} /> Lernrhythmus</p><h2>Diese Woche</h2></div><span className="metric-chip"><Clock3 size={14} /> {data.minutesThisWeek} Antworten</span></div>
          <ProgressBars data={data} />
          <div className="chart-legend"><span><i className="legend-dot legend-dot--violet" />Beantwortete Karten</span><span><i className="legend-dot legend-dot--rose" />Serverseitig gespeichert</span><span>Aktualisiert mit jeder Übung</span></div>
        </article>

        <article className="panel review-panel">
          <div className="panel-heading"><div><p className="section-kicker"><BookOpen size={15} /> Für dich vorbereitet</p><h2>Gezielt wiederholen</h2></div><Link href="/practice" className="text-link">Alles ansehen <ArrowRight size={15} /></Link></div>
          <div className="review-counts">
            <Link href="/practice?queue=due"><b>{data.dueReviews}</b><span>fällig</span></Link>
            <Link href="/practice?queue=mistakes"><b>{data.mistakesToReview}</b><span>Fehler</span></Link>
          </div>
          <div className="review-preview">
            {data.reviewCards.slice(0, 2).map((card) => <div key={card.id}><span className={`status-dot status-dot--${card.kind}`} /><p><b>{card.prompt}</b><small>{card.context}</small></p></div>)}
          </div>
          <Link href="/practice" className="button button--soft">Training starten <ArrowRight size={16} /></Link>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">Deine Auswahl</p><h2>Aktive Kurse</h2></div><Link href="/courses" className="text-link">Alle Kurse <ArrowRight size={15} /></Link></div>
        <div className="course-grid">{data.activeCourses.map((course) => <CourseCard course={course} href={`/courses/${course.slug}`} key={course.id} />)}</div>
      </section>

      <section className="suggestion-banner"><div className="icon-orb icon-orb--rose"><GraduationCap size={21} /></div><div><b>Eigene Liste, eigener Lernweg.</b><p>Erstelle eine private Wortliste oder teile einen Kurs gezielt mit deinem Team.</p></div><Link href="/create/course" className="text-link">Kurs erstellen <ArrowRight size={16} /></Link></section>
    </div>
  );
}
