'use client';

import { Check, ChevronRight, Lightbulb, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';

import { learnApi } from '@/lib/client/api';
import { demoQuestions } from '@/lib/demo-data';
import type { ReviewQuestion } from '@/lib/types';
import { useLearnPreferences } from '@/components/providers/learn-preferences';

type Feedback = {
  correct: boolean;
  correctAnswer?: string;
  explanation: string;
};

function normalise(value: string, locale: string) {
  return value.trim().toLocaleLowerCase(locale).replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ');
}

export function QuizRunner({ questions = demoQuestions }: { questions?: ReviewQuestion[] }) {
  const { locale, t } = useLearnPreferences();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  // Real time actively spent on the current question, start to submit — not
  // an estimate. Date.now() is impure, so it can't run directly during
  // render; the mount effect below sets the initial value, and
  // next()/restart() (plain event handlers) reset it for each new question.
  const questionStartedAt = useRef<number | null>(null);
  useEffect(() => { questionStartedAt.current = Date.now(); }, []);
  const question = questions[index];
  const finished = index >= questions.length;

  async function check(event: FormEvent) {
    event.preventDefault();
    if (!question || !answer.trim() || pending) return;
    setError('');

    if (question.demoAcceptedAnswers) {
      const correct = question.demoAcceptedAnswers.some((item) => normalise(item, locale) === normalise(answer, locale));
      setFeedback({
        correct,
        correctAnswer: question.demoAnswer,
        explanation: question.demoExplanation || t('quiz.demoExplanation'),
      });
      return;
    }

    setPending(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const payload = await learnApi<{
        results?: Array<{ entryId: string; correct: boolean; correctAnswer?: string }>;
      }>('quiz-attempts', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          courseId: question.courseId,
          mode: question.kind === 'mistake' ? 'WRONG_ANSWERS' : 'REVIEW',
          idempotencyKey,
          answers: [{ entryId: question.id, answer, direction: question.direction }],
          durationMs: questionStartedAt.current === null ? 0 : Date.now() - questionStartedAt.current,
        }),
      });
      const result = payload.results?.[0];
      if (!result) throw new Error(t('quiz.noServerResult'));
      setFeedback({
        correct: result.correct,
        correctAnswer: result.correctAnswer,
        explanation: result.correct
          ? t('quiz.correctSaved')
          : t('quiz.wrongSaved'),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('quiz.saveError'));
    } finally {
      setPending(false);
    }
  }

  function next() {
    if (feedback?.correct) setCorrectCount((value) => value + 1);
    setIndex((value) => value + 1);
    setAnswer('');
    setFeedback(null);
    setError('');
    questionStartedAt.current = Date.now();
  }

  function restart() {
    setIndex(0);
    setAnswer('');
    setFeedback(null);
    setError('');
    setCorrectCount(0);
    questionStartedAt.current = Date.now();
  }

  if (!questions.length) {
    return <section className="quiz-finish panel"><span className="finish-orb"><Sparkles size={29} /></span><p className="eyebrow">{t('quiz.caughtUp')}</p><h2>{t('quiz.emptyTitle')}</h2><p>{t('quiz.emptyBody')}</p><Link className="button button--dark" href="/courses">{t('quiz.toCourses')} <ChevronRight size={16} /></Link></section>;
  }

  if (finished) {
    return <section className="quiz-finish panel"><span className="finish-orb"><Sparkles size={29} /></span><p className="eyebrow">{t('quiz.finished')}</p><h2>{t('quiz.result', { correct: String(correctCount), total: String(questions.length) })}</h2><p>{t('quiz.finishedBody')}</p><div><button className="button button--dark" type="button" onClick={restart}><RotateCcw size={16} /> {t('quiz.again')}</button><Link className="button button--soft" href="/dashboard">{t('quiz.toDashboard')} <ChevronRight size={16} /></Link></div></section>;
  }

  return <section className="quiz-shell">
    <header className="quiz-head"><span>{index + 1} / {questions.length}</span><div className="quiz-progress"><i style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div><span className={`quiz-kind quiz-kind--${question.kind}`}>{question.kind === 'mistake' ? t('quiz.mistake') : question.kind === 'due' ? t('quiz.due') : t('quiz.new')}</span></header>
    <article className="quiz-card panel">
      <p className="section-kicker">{question.courseTitle}</p>
      <h1 lang={question.sourceLanguage}>{question.prompt}</h1>
      {question.hint && <p className="quiz-hint"><Lightbulb size={16} /> {question.hint}</p>}
      <form onSubmit={check}>
        <label className="quiz-input-label" htmlFor="answer">{t('quiz.answer')}</label>
        <div className="quiz-input-row"><input id="answer" autoComplete="off" autoFocus disabled={Boolean(feedback) || pending} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={t('quiz.answerPlaceholder')} /><button className="button button--dark" disabled={!answer.trim() || Boolean(feedback) || pending} type="submit">{pending ? t('quiz.checking') : <>{t('quiz.check')} <Send size={16} /></>}</button></div>
      </form>
      {error && <p className="auth-error" role="alert">{error}</p>}
    </article>
    {feedback && <section className={`feedback-card feedback-card--${feedback.correct ? 'correct' : 'wrong'}`} aria-live="polite"><span>{feedback.correct ? <Check size={22} /> : <X size={22} />}</span><div><b>{feedback.correct ? t('quiz.correct') : t('quiz.wrong')}</b>{!feedback.correct && feedback.correctAnswer && <strong lang={question.targetLanguage}>{feedback.correctAnswer}</strong>}<p>{feedback.explanation}</p>{question.article && <small>{t('quiz.article')} <b>{question.article}</b></small>}{question.example && <blockquote lang={question.targetLanguage}>{question.example}</blockquote>}</div><button className="button button--dark" type="button" onClick={next}>{index + 1 === questions.length ? t('quiz.resultAction') : t('quiz.next')} <ChevronRight size={16} /></button></section>}
  </section>;
}
