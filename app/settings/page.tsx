import { AppShell } from '@/components/layout/app-shell';
import { LearnerSettings } from '@/components/learn/learner-settings';
import { getLearnerSettings } from '@/lib/server/data';
import { requireLearnUser } from '@/lib/server/learn-admin';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { token, identity } = await requireLearnUser('/settings');
  const settings = await getLearnerSettings(token);
  if (!settings) return null;
  return <AppShell initialIdentity={identity}><div className="page-wrap"><LearnerSettings username={settings.username} initialProfile={settings.profile} /></div></AppShell>;
}
