'use client';

import { CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { learnApi } from '@/lib/client/api';

export function LessonCompletionButton({ courseId, sectionId }: { courseId: string; sectionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setPending(true);
    setError(null);
    try {
      await learnApi(`courses/${courseId}/sections/${sectionId}/complete`, { method: 'POST' });
      setCompleted(true);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Der Lernfortschritt konnte nicht gespeichert werden.');
    } finally {
      setPending(false);
    }
  }

  return <div className="lesson-completion">
    <button className={completed ? 'button button--soft' : 'button button--dark'} type="button" disabled={pending || completed} onClick={complete}>
      <CheckCircle2 size={16} /> {completed ? 'Als abgeschlossen gespeichert' : pending ? 'Speichert…' : 'Abschnitt abschließen'}
    </button>
    {error && <small role="alert">{error}</small>}
  </div>;
}
