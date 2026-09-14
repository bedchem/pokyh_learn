import { notFound } from 'next/navigation';

import { PublicCatalogFrame } from '@/components/layout/public-catalog-frame';
import { CourseDetail } from '@/components/learn/course-detail';
import { getCourse, getLearnIdentity } from '@/lib/server/data';
import { getAccessToken } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export default async function CatalogCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = await getAccessToken();
  const identity = token ? await getLearnIdentity(token).catch(() => null) : null;
  const course = await getCourse(slug, identity ? token : null);
  if (!course) notFound();
  return <PublicCatalogFrame authenticated={Boolean(identity)}><CourseDetail course={course} authenticated={Boolean(identity)} catalogContext /></PublicCatalogFrame>;
}
