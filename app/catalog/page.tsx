import { AppShell } from '@/components/layout/app-shell';
import { CatalogExplorer } from '@/components/learn/catalog-explorer';
import { EmptyState } from '@/components/ui/empty-state';
import { getCatalog } from '@/lib/server/data';

export const dynamic = 'force-dynamic';

export default async function CatalogPage() {
  const courses = await getCatalog().catch(() => []);
  return <AppShell><div className="page-wrap"><section className="page-heading"><div><p className="eyebrow">Kurskatalog</p><h1>Wähle, was du lernen möchtest.</h1><p className="page-lead">Entdecke frei lesbare Kurse und nimm genau die Inhalte in deinen Lernplan auf, die zu dir passen.</p></div></section>{courses.length ? <CatalogExplorer courses={courses} /> : <EmptyState title="Der Katalog ist gerade nicht erreichbar" body="Bitte prüfe die Backend-Verbindung oder versuche es später noch einmal." />}</div></AppShell>;
}
