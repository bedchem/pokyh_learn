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
  if (!course.isEnrolled && !course.canEdit) redirect(`/catalog/${encodeURIComponent(slug)}`);
  return <AppShell initialIdentity={identity}><CourseDetail course={course} enrolled={Boolean(course.isEnrolled)} authenticated /></AppShell>;
}
