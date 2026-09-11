import { BrainCircuit, Clock3, Flame, Sparkles } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { QuizRunner } from '@/components/learn/quiz-runner';
import { getReviewQuestions } from '@/lib/server/data';
import { getAccessToken } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export default async function PracticePage() {
  const questions = await getReviewQuestions(await getAccessToken()).catch(() => []);
  const mistakes = questions.filter((question) => question.kind === 'mistake').length;
  return <AppShell><div className="page-wrap practice-page"><section className="page-heading page-heading--inline"><div><p className="eyebrow">Dein Wiederholungsraum</p><h1>Trainiere, was noch nicht sitzt.</h1><p className="page-lead">Der Server priorisiert echte Fehler, fällige Wörter und neue Inhalte – ohne Antworten im Browser vorab preiszugeben.</p></div><div className="practice-stats"><span><BrainCircuit size={17} /> {mistakes ? `${mistakes} Fehler zuerst` : 'Gezielte Wiederholung'}</span><span><Clock3 size={17} /> {questions.length ? `${questions.length} Karten bereit` : 'Alles aufgeholt'}</span></div></section>{questions.length > 0 && <section className="practice-setup"><div className="practice-setup__item"><span className="icon-orb icon-orb--rose"><Flame size={18} /></span><div><b>{mistakes ? `${mistakes} Fehler gezielt üben` : 'Neue Wiederholung starten'}</b><p>Aus deinem serverseitigen Lernstand</p></div></div><div className="practice-setup__item"><span className="icon-orb icon-orb--violet"><Sparkles size={18} /></span><div><b>{questions.length} Karten bereit</b><p>Mit persönlichem Wiederholungsintervall</p></div></div></section>}<QuizRunner questions={questions} /></div></AppShell>;
}
