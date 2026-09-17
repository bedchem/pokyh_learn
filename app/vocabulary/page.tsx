import { AppShell } from '@/components/layout/app-shell';
import { Text } from '@/components/i18n/text';
import { EmptyState } from '@/components/ui/empty-state';
import { VocabularyWorkspace } from '@/components/learn/vocabulary-workspace';
import { getCourseOptions, getVocabulary } from '@/lib/server/data';
import { requireLearnUser } from '@/lib/server/learn-admin';

export const dynamic = 'force-dynamic';

// The single, always-reachable place to add or review vocabulary across
// every course you can edit — the nav's "Vokabeln" entry, and the global
// quick-add button, both point here. A previous version of this route only
// ever redirected to /courses; that left "where can I add a word?" with no
// direct answer outside a specific course's own page.
export default async function VocabularyPage() {
  const { token, identity } = await requireLearnUser('/vocabulary');
  const courses = await getCourseOptions(token).catch(() => []);
  const items = await getVocabulary(token).catch(() => []);
  const defaultCourseId = courses.find((course) => course.canEdit)?.id ?? courses[0]?.id;

  return <AppShell initialIdentity={identity}>
    <div className="page-wrap">
      <section className="page-heading page-heading--inline">
        <div>
          <p className="eyebrow"><Text id="vocabularyPage.eyebrow" /></p>
          <h1><Text id="vocabularyPage.title" /></h1>
          <p className="page-lead"><Text id="vocabularyPage.body" /></p>
        </div>
      </section>
      {courses.length
        ? <VocabularyWorkspace initialItems={items} courses={courses} defaultCourseId={defaultCourseId} />
        : <EmptyState
            title={<Text id="vocabularyPage.emptyTitle" />}
            body={<Text id="vocabularyPage.emptyBody" />}
            href="/catalog"
            action={<Text id="courses.openCatalog" />}
          />}
    </div>
  </AppShell>;
}
