import { AppShell } from '@/components/layout/app-shell';
import { Text } from '@/components/i18n/text';
import { TeamCreateForm } from '@/components/learn/team-create-form';
import { requireLearnAdministrator } from '@/lib/server/learn-admin';

export const dynamic = 'force-dynamic';

export default async function NewTeamPage() {
  const { identity } = await requireLearnAdministrator('/teams/new');
  return <AppShell initialIdentity={identity}><div className="page-wrap create-page"><section className="page-heading"><div><p className="eyebrow"><Text id="newTeam.eyebrow" /></p><h1><Text id="newTeam.title" /></h1><p className="page-lead"><Text id="newTeam.body" /></p></div></section><TeamCreateForm /></div></AppShell>;
}
