import { notFound } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { CourseStudio } from '@/components/learn/course-studio';
import { getCourse } from '@/lib/server/data';
import { requireLearnUser } from '@/lib/server/learn-admin';

export const dynamic = 'force-dynamic';

export default async function CourseEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { token, identity } = await requireLearnUser(`/courses/${slug}/edit`);

  const course = await getCourse(slug, token);
  if (!course || !course.canEdit) notFound();

  return <AppShell initialIdentity={identity}><div className="page-wrap"><CourseStudio course={course} /></div></AppShell>;
}
