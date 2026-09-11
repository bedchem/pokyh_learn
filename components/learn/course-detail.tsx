import { ArrowLeft, ArrowRight, BookOpen, Check, Clock3, Lock, MoreHorizontal, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';

import { EnrollmentButton } from '@/components/learn/enrollment-button';
import type { Course } from '@/lib/types';

const sectionLabel: Record<string, string> = {
  LESSON: 'Lektion',
  VOCABULARY: 'Vokabular',
  GRAMMAR: 'Grammatik',
  QUIZ: 'Übung',
};

export function CourseDetail({ course, enrolled = false, authenticated = false }: { course: Course; enrolled?: boolean; authenticated?: boolean }) {
  const sections = course.sections || [];
  const isEnrolled = enrolled || Boolean(course.isEnrolled);
  const firstSection = sections[0];
  const continueHref = firstSection ? `/courses/${course.slug}/learn/${firstSection.id}` : `/courses/${course.slug}`;
  const hasTeamVisibility = course.visibility === 'team';

  return <div className="page-wrap course-detail-page">
    <Link className="back-link" href={isEnrolled ? '/courses' : '/catalog'}><ArrowLeft size={16} /> {isEnrolled ? 'Meine Kurse' : 'Katalog'}</Link>
    <section className={`course-hero course-hero--${course.accent}`}>
      <div className="course-hero__content"><span className="course-language">{course.language} · {course.level}</span><h1>{course.title}</h1><p>{course.description}</p><div className="course-hero__meta"><span><BookOpen size={16} /> {course.modules} {course.modules === 1 ? 'Abschnitt' : 'Abschnitte'}</span><span><Clock3 size={16} /> Eigenes Tempo</span><span>{hasTeamVisibility ? <Users size={16} /> : <Lock size={15} />} {hasTeamVisibility ? 'Für dein Team' : course.visibility === 'public' ? 'Im Katalog' : 'Privater Kurs'}</span></div><div className="course-hero__actions">{isEnrolled ? <EnrollmentButton courseId={course.id} courseSlug={course.slug} continueHref={continueHref} enrolled /> : authenticated ? <EnrollmentButton courseId={course.id} courseSlug={course.slug} continueHref={continueHref} enrolled={false} /> : <Link href={`/sign-in?returnTo=/catalog/${course.slug}`} className="button button--dark">Anmelden, um hinzuzufügen <ArrowRight size={17} /></Link>}{isEnrolled && <Link href={`/courses/${course.slug}/vocabulary`} className="button button--plain">Vokabeln ansehen</Link>}</div></div><div className="course-hero__motif" aria-hidden="true"><span>{course.language === 'Italienisch' ? 'la' : '•'}</span><i>{course.language === 'Italienisch' ? 'il' : '·'}</i><b>{course.language === 'Italienisch' ? 'lo' : '—'}</b></div>
    </section>
    <section className="course-detail-grid"><article className="panel curriculum-panel"><div className="panel-heading"><div><p className="section-kicker">Lernpfad</p><h2>In deinem Tempo lernen</h2></div><button type="button" className="icon-button" aria-label="Weitere Kursoptionen"><MoreHorizontal size={20} /></button></div>{sections.length ? <ol className="lesson-path">{sections.map((section, index) => <li key={section.id} className={index === 0 && isEnrolled ? 'is-next' : ''}><span>{index === 0 && isEnrolled ? <Check size={15} /> : index + 1}</span><div><b>{section.title}</b><small>{section.summary || sectionLabel[section.type] || 'Lernabschnitt'}</small></div>{isEnrolled ? <Link className={index === 0 ? 'button button--dark button--small' : 'text-link'} href={`/courses/${course.slug}/learn/${section.id}`}>{index === 0 ? <>Starten <ArrowRight size={15} /></> : 'Öffnen'}</Link> : <Lock size={16} />}</li>)}</ol> : <div className="inline-empty"><Sparkles size={18} /><div><b>Der Kursinhalt wird vom Autor aufgebaut.</b><p>Es sind noch keine Abschnitte veröffentlicht. Die Kursstruktur bleibt vollständig serververwaltet.</p></div></div>}</article><aside className="course-side-stack"><article className="panel info-panel"><span className="icon-orb icon-orb--rose"><Sparkles size={18} /></span><h2>Das lernst du</h2>{sections.length ? <ul>{sections.slice(0, 3).map((section) => <li key={section.id}>{section.title}</li>)}</ul> : <p>Der Kursautor ergänzt hier eigene Lektionen, Übungen und Vokabeln.</p>}</article><article className="panel course-creator"><span>Kursstatus</span><b>{course.state === 'draft' ? 'Entwurf' : course.state === 'archived' ? 'Archiviert' : 'Aktiv'}</b><p>{course.updatedAt ? `Letzte Aktualisierung: ${course.updatedAt}` : 'Aktualisierungen werden auf dem Server verwaltet.'}</p></article></aside></section>
  </div>;
}
