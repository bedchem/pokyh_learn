import { notFound } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { CourseDetail } from '@/components/learn/course-detail';
import { getCourse } from '@/lib/server/data';
import { getAccessToken } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export default async function CatalogCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = await getAccessToken();
  const course = await getCourse(slug, token);
  if (!course) notFound();
  return <AppShell><CourseDetail course={course} authenticated={Boolean(token)} /></AppShell>;
}
