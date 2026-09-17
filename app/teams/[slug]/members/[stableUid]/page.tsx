import { notFound } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { TeammateStatsView } from '@/components/learn/teammate-stats-view';
import { getTeammateAnalytics, getTeams } from '@/lib/server/data';
import { requireLearnUser } from '@/lib/server/learn-admin';

export const dynamic = 'force-dynamic';

export default async function TeammateStatsPage({ params }: { params: Promise<{ slug: string; stableUid: string }> }) {
  const { slug, stableUid } = await params;
  const { token, identity } = await requireLearnUser(`/teams/${slug}/members/${stableUid}`);
  // getTeams only ever returns teams the caller is actually a member of (or
  // every team for a platform admin) — finding it here is what proves the
  // caller belongs to this team, same pattern as /teams/[slug] itself.
  const teams = await getTeams(token).catch(() => []);
  const team = teams.find((item) => item.slug === slug);
  if (!team) notFound();
  const stats = await getTeammateAnalytics(slug, stableUid, token);
  if (!stats) notFound();
  return <AppShell initialIdentity={identity}><TeammateStatsView teamId={slug} teamName={team.name} stats={stats} /></AppShell>;
}
