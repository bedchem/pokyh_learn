'use client';

import { Check, ChevronRight, Lightbulb, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

import { learnApi } from '@/lib/client/api';
import { demoQuestions } from '@/lib/demo-data';
import type { ReviewQuestion } from '@/lib/types';

type Feedback = {
  correct: boolean;
  correctAnswer?: string;
  explanation: string;
};

function normalise(value: string) {
  return value.trim().toLocaleLowerCase('de').replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ');
}

export function QuizRunner({ questions = demoQuestions }: { questions?: ReviewQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const question = questions[index];
  const finished = index >= questions.length;

  async function check(event: FormEvent) {
    event.preventDefault();
    if (!question || !answer.trim() || pending) return;
    setError('');

    if (question.demoAcceptedAnswers) {
      const correct = question.demoAcceptedAnswers.some((item) => normalise(item) === normalise(answer));
      setFeedback({
        correct,
        correctAnswer: question.demoAnswer,
        explanation: question.demoExplanation || 'Die Übung wird im Demo-Modus lokal angezeigt.',
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
        }),
      });
      const result = payload.results?.[0];
      if (!result) throw new Error('Der Server hat kein Quiz-Ergebnis zurückgegeben.');
      setFeedback({
        correct: result.correct,
        correctAnswer: result.correctAnswer,
        explanation: result.correct
          ? 'Gespeichert. Die nächste Wiederholung plant der Server anhand deines Lernstands.'
          : 'Gespeichert. Diese Karte kommt gezielt wieder, damit sie sich besser festigt.',
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Antwort konnte nicht gespeichert werden.');
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
  }

  function restart() {
    setIndex(0);
    setAnswer('');
    setFeedback(null);
    setError('');
    setCorrectCount(0);
  }

  if (!questions.length) {
    return <section className="quiz-finish panel"><span className="finish-orb"><Sparkles size={29} /></span><p className="eyebrow">Alles aufgeholt</p><h2>Für diesen Moment ist keine Wiederholung offen.</h2><p>Neue oder falsch beantwortete Wörter erscheinen hier automatisch, sobald der Server sie einplant.</p><Link className="button button--dark" href="/courses">Zu meinen Kursen <ChevronRight size={16} /></Link></section>;
  }

  if (finished) {
    return <section className="quiz-finish panel"><span className="finish-orb"><Sparkles size={29} /></span><p className="eyebrow">Training beendet</p><h2>{correctCount} von {questions.length} Antworten waren richtig.</h2><p>Dein Ergebnis wurde pro Antwort serverseitig gespeichert. Schwierige Karten kommen gezielt wieder.</p><div><button className="button button--dark" type="button" onClick={restart}><RotateCcw size={16} /> Noch einmal</button><Link className="button button--soft" href="/dashboard">Zur Übersicht <ChevronRight size={16} /></Link></div></section>;
  }

  return <section className="quiz-shell">
    <header className="quiz-head"><span>{index + 1} / {questions.length}</span><div className="quiz-progress"><i style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div><span className={`quiz-kind quiz-kind--${question.kind}`}>{question.kind === 'mistake' ? 'Fehler wiederholen' : question.kind === 'due' ? 'Fällig' : 'Neu'}</span></header>
    <article className="quiz-card panel">
      <p className="section-kicker">{question.courseTitle}</p>
      <h1 lang={question.sourceLanguage}>{question.prompt}</h1>
      {question.hint && <p className="quiz-hint"><Lightbulb size={16} /> {question.hint}</p>}
      <form onSubmit={check}>
        <label className="quiz-input-label" htmlFor="answer">Deine Antwort</label>
        <div className="quiz-input-row"><input id="answer" autoComplete="off" autoFocus disabled={Boolean(feedback) || pending} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Antwort eingeben" /><button className="button button--dark" disabled={!answer.trim() || Boolean(feedback) || pending} type="submit">{pending ? 'Prüft…' : <>Prüfen <Send size={16} /></>}</button></div>
      </form>
      {error && <p className="auth-error" role="alert">{error}</p>}
    </article>
    {feedback && <section className={`feedback-card feedback-card--${feedback.correct ? 'correct' : 'wrong'}`} aria-live="polite"><span>{feedback.correct ? <Check size={22} /> : <X size={22} />}</span><div><b>{feedback.correct ? 'Richtig – gut gemacht.' : 'Fast. Die richtige Antwort ist:'}</b>{!feedback.correct && feedback.correctAnswer && <strong lang={question.targetLanguage}>{feedback.correctAnswer}</strong>}<p>{feedback.explanation}</p>{question.article && <small>Artikel: <b>{question.article}</b></small>}{question.example && <blockquote lang={question.targetLanguage}>{question.example}</blockquote>}</div><button className="button button--dark" type="button" onClick={next}>{index + 1 === questions.length ? 'Ergebnis' : 'Weiter'} <ChevronRight size={16} /></button></section>}
  </section>;
}
