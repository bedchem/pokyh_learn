import { AppShell } from '@/components/layout/app-shell';
import { Text } from '@/components/i18n/text';
import { CourseCard } from '@/components/ui/course-card';
import { EmptyState } from '@/components/ui/empty-state';
import { getDashboard } from '@/lib/server/data';
import { requireLearnUser } from '@/lib/server/learn-admin';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const { token, identity } = await requireLearnUser('/courses');
  const data = await getDashboard(token).catch(() => null);
  return <AppShell initialIdentity={identity}><div className="page-wrap"><section className="page-heading page-heading--inline"><div><p className="eyebrow"><Text id="courses.eyebrow" /></p><h1><Text id="courses.title" /></h1><p className="page-lead"><Text id="courses.body" /></p></div><Link className="button button--dark" href="/catalog"><Text id="courses.openCatalog" /></Link></section>{data?.activeCourses.length ? <div className="course-grid course-grid--catalog">{data.activeCourses.map((course) => <CourseCard course={course} href={`/courses/${course.slug}`} key={course.id} />)}</div> : <EmptyState title={<Text id="courses.emptyTitle" />} body={<Text id="courses.emptyBody" />} href="/catalog" action={<Text id="courses.openCatalog" />} />}</div></AppShell>;
}
