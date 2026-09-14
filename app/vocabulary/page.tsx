import { AppShell } from '@/components/layout/app-shell';
import { Text } from '@/components/i18n/text';
import { VocabularyWorkspace } from '@/components/learn/vocabulary-workspace';
import { EmptyState } from '@/components/ui/empty-state';
import { getCourseOptions, getVocabulary } from '@/lib/server/data';
import { requireLearnUser } from '@/lib/server/learn-admin';

export const dynamic = 'force-dynamic';

export default async function VocabularyPage() {
  const { token, identity } = await requireLearnUser('/vocabulary');
  const [courses, items] = await Promise.all([
    getCourseOptions(token).catch(() => []),
    getVocabulary(token).catch(() => []),
  ]);
  return <AppShell initialIdentity={identity}><div className="page-wrap"><section className="page-heading page-heading--inline"><div><p className="eyebrow"><Text id="vocabulary.eyebrow" /></p><h1><Text id="vocabulary.title" /></h1><p className="page-lead"><Text id="vocabulary.body" /></p></div></section>{courses.length ? <VocabularyWorkspace initialItems={items} courses={courses} /> : <EmptyState title={<Text id="vocabulary.emptyTitle" />} body={<Text id="vocabulary.emptyBody" />} href="/catalog" action={<Text id="courses.openCatalog" />} />}</div></AppShell>;
}
