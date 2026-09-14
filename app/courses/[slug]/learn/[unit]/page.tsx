import { ArrowLeft, CheckCircle2, ChevronRight, ListChecks, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { LessonCompletionButton } from '@/components/learn/lesson-progress-sync';
import type { CourseSection } from '@/lib/types';
import { getCourse } from '@/lib/server/data';
import { requireLearnUser } from '@/lib/server/learn-admin';

export const dynamic = 'force-dynamic';

function readableContent(content: CourseSection['content']): string[] {
  if (typeof content === 'string') return [content];
  if (!content || typeof content !== 'object' || Array.isArray(content)) return [];
  const record = content as Record<string, unknown>;
  const directKeys = ['intro', 'body', 'text', 'instructions', 'example'];
  const direct = directKeys.flatMap((key) => typeof record[key] === 'string' ? [record[key] as string] : []);
  const paragraphs = Array.isArray(record.paragraphs)
    ? record.paragraphs.filter((value): value is string => typeof value === 'string')
    : [];
  return [...direct, ...paragraphs].filter((value) => value.trim().length > 0).slice(0, 12);
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string; unit: string }> }) {
  const { slug, unit } = await params;
  const returnTo = `/courses/${slug}/learn/${unit}`;
  const { token, identity } = await requireLearnUser(returnTo);

  const course = await getCourse(slug, token);
  // The server remains authoritative. This redirect is only a helpful
  // navigation outcome after the backend declined material access because the
  // learner has not added the catalogue course yet.
  if (!course?.isEnrolled) redirect(`/courses/${slug}`);
  const sections = course.sections || [];
  const sectionIndex = sections.findIndex((section) => section.id === unit);
  if (sectionIndex < 0) notFound();
  const section = sections[sectionIndex];
  const content = readableContent(section.content);
  const next = sections[sectionIndex + 1];
  const progress = Math.round(course.progress ?? 0);

  return <AppShell initialIdentity={identity}><div className="page-wrap lesson-page"><Link className="back-link" href={`/courses/${course.slug}`}><ArrowLeft size={16} /> Zur Kursübersicht</Link><div className="lesson-layout"><article className="lesson-content panel"><p className="eyebrow">{course.title} · {section.type.toLocaleLowerCase('de-DE')}</p><h1>{section.title}</h1><p className="lesson-intro">{section.summary || 'Dieser Abschnitt wird durch den Kursautor serverseitig gepflegt.'}</p>{content.length ? <section className="lesson-authored-content">{content.map((paragraph, index) => <p key={`${section.id}-${index}`} lang={course.language.toLocaleLowerCase('de-DE').includes('ital') ? 'it' : course.language.toLocaleLowerCase('de-DE').includes('engl') ? 'en' : undefined}>{paragraph}</p>)}</section> : <section className="lesson-example"><span><Volume2 size={17} /> Eigener Inhalt</span><p>Der Kursautor hat für diesen Abschnitt noch keinen lesbaren Inhalt veröffentlicht. Sobald er ergänzt wird, erscheint er hier direkt aus dem Backend.</p></section>}<div className="lesson-footer"><Link href={`/courses/${course.slug}`} className="button button--plain">Später fortsetzen</Link><LessonCompletionButton courseId={course.id} sectionId={section.id} />{next ? <Link href={`/courses/${course.slug}/learn/${next.id}`} className="button button--dark">Weiter <ChevronRight size={16} /></Link> : <Link href="/practice" className="button button--dark">Wiederholen <ChevronRight size={16} /></Link>}</div></article><aside className="lesson-sidebar"><div className="lesson-progress"><span><CheckCircle2 size={16} /> {progress}% sicher gespeichert</span><div className="progress-track"><i style={{ width: `${progress}%` }} /></div></div><div className="panel"><p className="section-kicker"><ListChecks size={15} /> Dieser Abschnitt</p><h2>{section.type === 'VOCABULARY' ? 'Wörter im Kontext' : section.type === 'GRAMMAR' ? 'Regel anwenden' : section.type === 'QUIZ' ? 'Wissen abrufen' : 'Lerninhalt'}</h2><ul><li>{section.summary || 'Eigener Kursinhalt'}</li><li>Fortschritt wird erst nach deinem Klick serverseitig gespeichert</li></ul></div></aside></div></div></AppShell>;
}
