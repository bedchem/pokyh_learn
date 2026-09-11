import { AppShell } from '@/components/layout/app-shell';
import { CourseCreatorForm } from '@/components/learn/course-creator-form';
import { getTeams } from '@/lib/server/data';
import { getAccessToken } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export default async function CreateCoursePage() {
  const teams = await getTeams(await getAccessToken()).catch(() => []);
  return <AppShell><div className="page-wrap create-page"><section className="page-heading"><div><p className="eyebrow">Eigener Lernweg</p><h1>Erstelle einen Kurs, der Sinn ergibt.</h1><p className="page-lead">Beginne bewusst privat. Sichtbarkeit, Mitwirkende und Veröffentlichung bleiben serverseitig kontrolliert.</p></div></section><CourseCreatorForm teams={teams} /></div></AppShell>;
}
