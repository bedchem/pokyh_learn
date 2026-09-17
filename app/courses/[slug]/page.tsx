import { notFound, redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { CourseDetail } from '@/components/learn/course-detail';
import { getCourse } from '@/lib/server/data';
import { requireLearnUser } from '@/lib/server/learn-admin';

export const dynamic = 'force-dynamic';

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { token, identity } = await requireLearnUser(`/courses/${slug}`);
  const course = await getCourse(slug, token);
  if (!course) notFound();
  // Not every course a user can reach a link to is catalog-eligible (e.g. a
  // TEAM-visibility course) — redirecting to /catalog/:slug for one of those
  // would 404 instead of showing something useful. /courses always exists.
  if (!course.isEnrolled && !course.canEdit) redirect('/courses');
  return <AppShell initialIdentity={identity}><CourseDetail course={course} enrolled={Boolean(course.isEnrolled)} authenticated /></AppShell>;
}
