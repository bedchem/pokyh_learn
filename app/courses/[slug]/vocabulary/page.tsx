import { AppShell } from '@/components/layout/app-shell';
import { VocabularyWorkspace } from '@/components/learn/vocabulary-workspace';
import { EmptyState } from '@/components/ui/empty-state';
import { getCourse, getVocabulary } from '@/lib/server/data';
import { getAccessToken } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export default async function CourseVocabularyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = await getAccessToken();
  const course = await getCourse(slug, token);
  if (!course) return <AppShell><div className="page-wrap"><EmptyState title="Kurs nicht verfügbar" body="Der Kurs ist nicht mehr erreichbar oder du hast keinen Zugriff." href="/courses" action="Meine Kurse" /></div></AppShell>;
  const items = await getVocabulary(token, course.id).catch(() => []);
  return <AppShell><div className="page-wrap"><section className="page-heading page-heading--inline"><div><p className="eyebrow">Kursvokabular</p><h1>Wörter mit Kontext.</h1><p className="page-lead">In dieser Liste steht nur die Kurssprache. Antworten bleiben bis zum passenden Quiz auf dem Server geschützt.</p></div></section><VocabularyWorkspace initialItems={items} courses={[course]} defaultCourseId={course.id} editable={Boolean(course.canEdit)} /></div></AppShell>;
}
