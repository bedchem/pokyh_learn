'use client';

import { ArrowRight, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { learnApi } from '@/lib/client/api';

export function TeamCreateForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      const team = await learnApi<{ id: string }>('teams', {
        method: 'POST',
        body: JSON.stringify({
          name: String(data.get('name') || '').trim(),
          description: String(data.get('description') || '').trim(),
        }),
      });
      router.push(`/teams/${team.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Das Team konnte nicht angelegt werden.');
    } finally {
      setPending(false);
    }
  }

  return <form className="course-form panel" onSubmit={submit}><section><p className="section-kicker">Neues Team</p><h1>Gemeinsam lernen, mit klaren Grenzen.</h1><p>Du wirst Team-Owner. Kursrechte bleiben separat und werden weiterhin auf dem Server geprüft.</p><label>Teamname<input name="name" required maxLength={120} placeholder="z. B. Italienisch am Mittwoch" /></label><label>Beschreibung<textarea name="description" rows={4} maxLength={1000} placeholder="Wofür ist dieses Team da?" /></label></section>{error && <p className="auth-error" role="alert">{error}</p>}<div className="course-form__actions"><Link className="button button--plain" href="/teams">Abbrechen</Link><button className="button button--dark" type="submit" disabled={pending}><UsersRound size={16} /> {pending ? 'Erstellt…' : 'Team erstellen'} <ArrowRight size={16} /></button></div></form>;
}
