'use client';

import { CirclePlay, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { learnApi } from '@/lib/client/api';

export function EnrollmentButton({ courseId, courseSlug, continueHref, enrolled }: { courseId: string; courseSlug: string; continueHref: string; enrolled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function enroll() {
    setPending(true);
    setError('');
    try {
      await learnApi(`courses/${courseId}/enroll`, { method: 'POST' });
      router.push(`/courses/${courseSlug}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Der Kurs konnte nicht hinzugefügt werden.');
    } finally {
      setPending(false);
    }
  }

  if (enrolled) {
    return <a href={continueHref} className="button button--dark"><CirclePlay size={17} /> Weiterlernen</a>;
  }

  return <span className="enrollment-action"><button className="button button--dark" type="button" onClick={enroll} disabled={pending}><Plus size={17} /> {pending ? 'Wird hinzugefügt…' : 'Zu meinen Kursen'}</button>{error && <small role="alert">{error}</small>}</span>;
}
