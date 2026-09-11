import { AppShell } from '@/components/layout/app-shell';
import { CourseCard } from '@/components/ui/course-card';
import { EmptyState } from '@/components/ui/empty-state';
import { getDashboard } from '@/lib/server/data';
import { getAccessToken } from '@/lib/server/session';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const data = await getDashboard(await getAccessToken()).catch(() => null);
  return <AppShell><div className="page-wrap"><section className="page-heading page-heading--inline"><div><p className="eyebrow">Deine Auswahl</p><h1>Meine Kurse</h1><p className="page-lead">Dein Lernfortschritt, deine Inhalte und dein nächster sinnvoller Schritt.</p></div><Link className="button button--dark" href="/catalog">Katalog öffnen</Link></section>{data?.activeCourses.length ? <div className="course-grid course-grid--catalog">{data.activeCourses.map((course) => <CourseCard course={course} href={`/courses/${course.slug}`} key={course.id} />)}</div> : <EmptyState title="Noch kein Kurs ausgewählt" body="Im Katalog kannst du Inhalte lesen und die passenden Kurse zu deinem Lernplan hinzufügen." href="/catalog" action="Katalog öffnen" />}</div></AppShell>;
}
