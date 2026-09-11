import { AppShell } from '@/components/layout/app-shell';
import { DashboardView } from '@/components/learn/dashboard-view';
import { EmptyState } from '@/components/ui/empty-state';
import { getDashboard } from '@/lib/server/data';
import { getAccessToken } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const token = await getAccessToken();
  const data = await getDashboard(token).catch(() => null);
  return <AppShell>{data ? <DashboardView data={data} /> : <div className="page-wrap"><EmptyState title="Dein Lernraum wird vorbereitet" body="Melde dich mit deinem Pokyh-Konto an oder prüfe die Verbindung zum Lernserver." href="/sign-in" action="Anmelden" /></div>}</AppShell>;
}
