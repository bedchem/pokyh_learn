import { BrainCircuit, Clock3, Flame, Sparkles } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';
import { Text } from '@/components/i18n/text';
import { QuizRunner } from '@/components/learn/quiz-runner';
import { getReviewQuestions } from '@/lib/server/data';
import { requireLearnUser } from '@/lib/server/learn-admin';

export const dynamic = 'force-dynamic';

type QueueParam = 'mistakes' | 'due' | undefined;

function forceScopeFor(queue: QueueParam): 'WRONG' | 'DUE' | undefined {
  if (queue === 'mistakes') return 'WRONG';
  if (queue === 'due') return 'DUE';
  return undefined;
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  const { queue } = await searchParams;
  const forceScope = forceScopeFor(queue === 'mistakes' || queue === 'due' ? queue : undefined);
  const { token, identity } = await requireLearnUser(`/practice${queue ? `?queue=${encodeURIComponent(queue)}` : ''}`);
  const questions = await getReviewQuestions(token, forceScope).catch(() => []);
  const mistakes = questions.filter((question) => question.kind === 'mistake').length;
  return <AppShell initialIdentity={identity}><div className="page-wrap practice-page"><section className="page-heading page-heading--inline"><div><p className="eyebrow"><Text id="practice.eyebrow" /></p><h1><Text id="practice.title" /></h1><p className="page-lead"><Text id="practice.body" /></p></div><div className="practice-stats"><span><BrainCircuit size={17} /> {mistakes ? <Text id="practice.errorsFirst" values={{ count: String(mistakes) }} /> : <Text id="practice.targetedReview" />}</span><span><Clock3 size={17} /> {questions.length ? <Text id="practice.cardsReady" values={{ count: String(questions.length) }} /> : <Text id="practice.caughtUp" />}</span></div></section>{questions.length > 0 && <section className="practice-setup"><div className="practice-setup__item"><span className="icon-orb icon-orb--rose"><Flame size={18} /></span><div><b>{mistakes ? <Text id="practice.errorsPractice" values={{ count: String(mistakes) }} /> : <Text id="practice.newReview" />}</b><p><Text id="practice.serverState" /></p></div></div><div className="practice-setup__item"><span className="icon-orb icon-orb--violet"><Sparkles size={18} /></span><div><b><Text id="practice.cardsReady" values={{ count: String(questions.length) }} /></b><p><Text id="practice.personalInterval" /></p></div></div></section>}<QuizRunner questions={questions} /></div></AppShell>;
}
