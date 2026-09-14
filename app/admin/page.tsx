import { notFound, redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { LearnAdminConsole } from '@/components/learn/learn-admin-console';
import { getLearnAdminOverview, getLearnIdentity } from '@/lib/server/data';
import { getAccessToken } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const token = await getAccessToken();
  if (!token) redirect('/sign-in?returnTo=/admin');
  const identity = await getLearnIdentity(token);
  if (!identity?.isAdmin) notFound();
  const overview = await getLearnAdminOverview(token);
  if (!overview) notFound();
  return <AppShell initialIdentity={identity}><div className="page-wrap"><LearnAdminConsole overview={overview} username={identity.username} /></div></AppShell>;
}
