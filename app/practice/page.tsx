import { BrainCircuit, Clock3, Flame, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { AppShell } from '@/components/layout/app-shell';
import { Text } from '@/components/i18n/text';
import { QuizRunner } from '@/components/learn/quiz-runner';
import { getCourseOptions, getReviewQuestions } from '@/lib/server/data';
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
  searchParams: Promise<{ queue?: string; courseId?: string }>;
}) {
  const { queue, courseId } = await searchParams;
  const forceScope = forceScopeFor(queue === 'mistakes' || queue === 'due' ? queue : undefined);
  const returnParams = new URLSearchParams();
  if (queue) returnParams.set('queue', queue);
  if (courseId) returnParams.set('courseId', courseId);
  const { token, identity } = await requireLearnUser(`/practice${returnParams.size ? `?${returnParams}` : ''}`);
  const [questions, courses] = await Promise.all([
    getReviewQuestions(token, forceScope, courseId).catch(() => []),
    // Only needed to render the current filter's course name — skip the
    // extra request entirely when training across every course.
    courseId ? getCourseOptions(token).catch(() => []) : Promise.resolve([]),
  ]);
  const filteredCourse = courseId ? courses.find((course) => course.id === courseId) : undefined;
  const mistakes = questions.filter((question) => question.kind === 'mistake').length;
  const clearFilterHref = queue ? `/practice?queue=${encodeURIComponent(queue)}` : '/practice';
  return <AppShell initialIdentity={identity}><div className="page-wrap practice-page"><section className="page-heading page-heading--inline"><div><p className="eyebrow"><Text id="practice.eyebrow" /></p><h1><Text id="practice.title" /></h1><p className="page-lead"><Text id="practice.body" /></p>{courseId && <p className="practice-language-filter">{filteredCourse ? <Text id="practice.filteredTo" values={{ course: filteredCourse.title }} /> : <Text id="practice.filteredToUnknown" />} <Link href={clearFilterHref} className="text-link">{'· '}<Text id="practice.clearFilter" /></Link></p>}</div><div className="practice-stats"><span><BrainCircuit size={17} /> {mistakes ? <Text id="practice.errorsFirst" values={{ count: String(mistakes) }} /> : <Text id="practice.targetedReview" />}</span><span><Clock3 size={17} /> {questions.length ? <Text id="practice.cardsReady" values={{ count: String(questions.length) }} /> : <Text id="practice.caughtUp" />}</span></div></section>{questions.length > 0 && <section className="practice-setup"><div className="practice-setup__item"><span className="icon-orb icon-orb--rose"><Flame size={18} /></span><div><b>{mistakes ? <Text id="practice.errorsPractice" values={{ count: String(mistakes) }} /> : <Text id="practice.newReview" />}</b><p><Text id="practice.serverState" /></p></div></div><div className="practice-setup__item"><span className="icon-orb icon-orb--violet"><Sparkles size={18} /></span><div><b><Text id="practice.cardsReady" values={{ count: String(questions.length) }} /></b><p><Text id="practice.personalInterval" /></p></div></div></section>}<QuizRunner questions={questions} aiTrainingEnabled={identity.canUseAiAssistant} /></div></AppShell>;
}
