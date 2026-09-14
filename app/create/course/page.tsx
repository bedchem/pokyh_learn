import { AppShell } from '@/components/layout/app-shell';
import { Text } from '@/components/i18n/text';
import { CourseCreatorForm } from '@/components/learn/course-creator-form';
import { getTeams } from '@/lib/server/data';
import { requireLearnUser } from '@/lib/server/learn-admin';

export const dynamic = 'force-dynamic';

export default async function CreateCoursePage() {
  const { token, identity } = await requireLearnUser('/create/course');

  const canCreateTeamCourse = identity.isAdmin;
  const teams = canCreateTeamCourse ? await getTeams(token).catch(() => []) : [];
  return <AppShell initialIdentity={identity}><div className="page-wrap create-page"><section className="page-heading"><div><p className="eyebrow"><Text id="createCourse.eyebrow" /></p><h1><Text id="createCourse.title" /></h1><p className="page-lead"><Text id="createCourse.body" /></p></div></section><CourseCreatorForm canCreateTeamCourse={canCreateTeamCourse} teams={teams} /></div></AppShell>;
}
