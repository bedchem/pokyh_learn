import { AppShell } from '@/components/layout/app-shell';
import { TeamsView } from '@/components/learn/teams-view';
import { EmptyState } from '@/components/ui/empty-state';
import { getTeams } from '@/lib/server/data';
import { getAccessToken } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  const teams = await getTeams(await getAccessToken()).catch(() => []);
  return <AppShell><div className="page-wrap"><section className="page-heading page-heading--inline"><div><p className="eyebrow">Gemeinsam lernen</p><h1>Teams mit klaren Grenzen.</h1><p className="page-lead">Teile Kurse gezielt, verteilte Schreibrechte transparent und behalte deinen privaten Lernraum privat.</p></div></section>{teams.length ? <TeamsView teams={teams} /> : <EmptyState title="Noch kein Team" body="Erstelle ein Team, lade Menschen gezielt ein und entscheide pro Kurs, wer lesen oder schreiben darf." href="/teams/new" action="Team erstellen" />}</div></AppShell>;
}
