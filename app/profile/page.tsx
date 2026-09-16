import { AppShell } from '@/components/layout/app-shell';
import { Text } from '@/components/i18n/text';
import { ProfileView } from '@/components/learn/profile-view';
import { EmptyState } from '@/components/ui/empty-state';
import { getDashboard } from '@/lib/server/data';
import { requireLearnUser } from '@/lib/server/learn-admin';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const { token, identity } = await requireLearnUser('/profile');
  const data = await getDashboard(token).catch(() => null);
  return <AppShell initialIdentity={identity}>{data ? <ProfileView data={data} /> : <div className="page-wrap"><EmptyState title={<Text id="dashboard.preparingTitle" />} body={<Text id="dashboard.preparingBody" />} /></div>}</AppShell>;
}
