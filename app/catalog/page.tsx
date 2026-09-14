import { PublicCatalogFrame } from '@/components/layout/public-catalog-frame';
import { CatalogExplorer } from '@/components/learn/catalog-explorer';
import { Text } from '@/components/i18n/text';
import { EmptyState } from '@/components/ui/empty-state';
import { getCatalog, getLearnIdentity } from '@/lib/server/data';
import { getAccessToken } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export default async function CatalogPage() {
  const token = await getAccessToken();
  const [courses, identity] = await Promise.all([
    getCatalog().catch(() => []),
    token ? getLearnIdentity(token).catch(() => null) : null,
  ]);

  return (
    <PublicCatalogFrame authenticated={Boolean(identity)}>
      <div className="public-catalog__content">
        <section className="public-catalog__heading">
          <p className="eyebrow"><Text id="catalog.eyebrow" /></p>
          <h1><Text id="catalog.title" /></h1>
          <p className="page-lead"><Text id="catalog.body" /></p>
        </section>
        {courses.length ? <CatalogExplorer courses={courses} authenticated={Boolean(identity)} /> : <EmptyState title={<Text id="catalog.unavailable" />} body={<Text id="catalog.unavailableBody" />} />}
      </div>
    </PublicCatalogFrame>
  );
}
