import { AppShell } from '@/components/layout/app-shell';
import { VocabularyWorkspace } from '@/components/learn/vocabulary-workspace';
import { EmptyState } from '@/components/ui/empty-state';
import { getCourseOptions, getVocabulary } from '@/lib/server/data';
import { getAccessToken } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export default async function VocabularyPage() {
  const token = await getAccessToken();
  const [courses, items] = await Promise.all([
    getCourseOptions(token).catch(() => []),
    getVocabulary(token).catch(() => []),
  ]);
  return <AppShell><div className="page-wrap"><section className="page-heading page-heading--inline"><div><p className="eyebrow">Deine Wortlisten</p><h1>Vokabeln, die du wirklich brauchst.</h1><p className="page-lead">Ein Wort genügt: Der Server ergänzt einen Kontextsatz in der Kurssprache und hält Antworten für das Quiz geschützt.</p></div></section>{courses.length ? <VocabularyWorkspace initialItems={items} courses={courses} /> : <EmptyState title="Wähle zuerst einen Kurs" body="Füge einen Kurs aus dem Katalog hinzu, bevor du eigene Vokabeln verwaltest." href="/catalog" action="Katalog öffnen" />}</div></AppShell>;
}
