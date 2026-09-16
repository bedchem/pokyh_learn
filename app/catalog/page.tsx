import { PublicCatalogFrame } from '@/components/layout/public-catalog-frame';
import { AppShell } from '@/components/layout/app-shell';
import { CatalogExplorer } from '@/components/learn/catalog-explorer';
import { Text } from '@/components/i18n/text';
import { EmptyState } from '@/components/ui/empty-state';
import { getCatalog, getLearnIdentity } from '@/lib/server/data';
import type { Course } from '@/lib/types';
import { getAccessToken } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export default async function CatalogPage() {
  const token = await getAccessToken();
  const [catalogResult, identity] = await Promise.all([
    getCatalog().then((courses) => ({ courses, available: true })).catch(() => ({ courses: [] as Course[], available: false })),
    token ? getLearnIdentity(token).catch(() => null) : null,
  ]);
  const { courses, available } = catalogResult;
  const content = (
    <div className="public-catalog__content">
      <section className="public-catalog__heading">
        <p className="eyebrow"><Text id="catalog.eyebrow" /></p>
        <h1><Text id="catalog.title" /></h1>
        <p className="page-lead"><Text id="catalog.body" /></p>
      </section>
      {!available ? <EmptyState title={<Text id="catalog.unavailable" />} body={<Text id="catalog.unavailableBody" />} /> : courses.length ? <CatalogExplorer courses={courses} authenticated={Boolean(identity)} /> : <EmptyState title={<Text id="catalog.emptyTitle" />} body={<Text id="catalog.emptyBody" />} />}
    </div>
  );

  if (identity) return <AppShell initialIdentity={identity}><div className="page-wrap">{content}</div></AppShell>;
  return <PublicCatalogFrame authenticated={false}>{content}</PublicCatalogFrame>;
}
