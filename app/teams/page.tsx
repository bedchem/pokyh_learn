import { AppShell } from '@/components/layout/app-shell';
import { Text } from '@/components/i18n/text';
import { TeamsView } from '@/components/learn/teams-view';
import { EmptyState } from '@/components/ui/empty-state';
import { getTeams } from '@/lib/server/data';
import { requireLearnUser } from '@/lib/server/learn-admin';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  const { token, identity } = await requireLearnUser('/teams');
  const teams = await getTeams(token).catch(() => []);
  return <AppShell initialIdentity={identity}><div className="page-wrap"><section className="page-heading page-heading--inline"><div><p className="eyebrow"><Text id="teams.eyebrow" /></p><h1><Text id="teams.title" /></h1><p className="page-lead"><Text id="teams.body" /></p></div></section>{teams.length ? <TeamsView teams={teams} /> : <EmptyState title={<Text id="teams.emptyTitle" />} body={<Text id="teams.emptyBodyNoCreate" />} />}</div></AppShell>;
}
