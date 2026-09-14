import { notFound, redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { VocabularyWorkspace } from '@/components/learn/vocabulary-workspace';
import { getCourse, getVocabulary } from '@/lib/server/data';
import { requireLearnUser } from '@/lib/server/learn-admin';

export const dynamic = 'force-dynamic';

export default async function CourseVocabularyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { token, identity } = await requireLearnUser(`/courses/${slug}/vocabulary`);
  const course = await getCourse(slug, token);
  if (!course) notFound();
  if (!course.isEnrolled && !course.canEdit) redirect(`/catalog/${encodeURIComponent(slug)}`);
  const items = await getVocabulary(token, course.id).catch(() => []);
  return <AppShell initialIdentity={identity}><div className="page-wrap"><section className="page-heading page-heading--inline"><div><p className="eyebrow">Kursvokabular</p><h1>Wörter mit Kontext.</h1><p className="page-lead">In dieser Liste steht nur die Kurssprache. Antworten bleiben bis zum passenden Quiz auf dem Server geschützt.</p></div></section><VocabularyWorkspace initialItems={items} courses={[course]} defaultCourseId={course.id} editable={Boolean(course.canEdit)} /></div></AppShell>;
}
