'use client';

import { ArrowRight, CheckCircle2, Eye, Globe2, LockKeyhole, UsersRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { learnApi } from '@/lib/client/api';
import type { Team } from '@/lib/types';

type CreatedCourse = { slug: string };

export function CourseCreatorForm({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<'private' | 'team' | 'public'>('private');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const teamId = String(data.get('teamId') || '');
    if (visibility === 'team' && !teamId) {
      setError('Wähle ein Team aus, bevor du den Kurs teilst.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const course = await learnApi<CreatedCourse>('courses', {
        method: 'POST',
        body: JSON.stringify({
          title: String(data.get('title') || '').trim(),
          summary: String(data.get('summary') || '').trim(),
          subject: 'Sprachen',
          language: String(data.get('language') || ''),
          level: String(data.get('level') || ''),
          visibility: visibility.toUpperCase(),
          // Public courses start as a server-held draft. A platform reviewer
          // controls publication; private and team drafts are immediately usable.
          status: 'DRAFT',
          ...(visibility === 'team' ? { teamId } : {}),
        }),
      });
      router.push(`/courses/${course.slug}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Der Kurs konnte nicht angelegt werden.');
    } finally {
      setPending(false);
    }
  }

  return <><form className="course-form panel" onSubmit={submit}><section><p className="section-kicker">1 · Grundlage</p><label>Kursname<input name="title" placeholder="z. B. Italienisch für meine Reise" required maxLength={160} /></label><label>Worum geht es?<textarea name="summary" rows={4} placeholder="Beschreibe kurz, was Lernende nach dem Kurs können sollen." maxLength={2000} /></label><div className="form-grid"><label>Kurssprache<select name="language" defaultValue="it"><option value="it">Italienisch</option><option value="en">Englisch</option><option value="de">Deutsch</option></select></label><label>Niveau<select name="level" defaultValue="A1"><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>C2</option><option>Gemischt</option></select></label></div></section><section><p className="section-kicker">2 · Sichtbarkeit</p><div className="visibility-options"><label><input checked={visibility === 'private'} name="visibility" type="radio" value="private" onChange={() => setVisibility('private')} /><span><LockKeyhole size={19} /><b>Privat</b><small>Nur du kannst den Kurs sehen und bearbeiten.</small></span></label><label><input checked={visibility === 'team'} name="visibility" type="radio" value="team" onChange={() => setVisibility('team')} /><span><UsersRound size={19} /><b>Team</b><small>Teile den Kurs mit einem Team, das du verwaltest.</small></span></label><label><input checked={visibility === 'public'} name="visibility" type="radio" value="public" onChange={() => setVisibility('public')} /><span><Globe2 size={19} /><b>Öffentlich</b><small>Wird als Entwurf gespeichert und erst nach serverseitiger Freigabe im Katalog sichtbar.</small></span></label></div>{visibility === 'team' && <label className="team-picker">Team<select name="teamId" defaultValue=""><option value="" disabled>Team auswählen</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}</section><section className="course-form__summary"><Eye size={18} /><p><b>Du behältst die Kontrolle.</b> Der Kurs und seine Sichtbarkeit werden serverseitig gespeichert. Eigene Inhalte fügst du anschließend als Abschnitte hinzu.</p></section>{error && <p className="auth-error" role="alert">{error}</p>}<div className="course-form__actions"><a className="button button--plain" href="/library">Zur Bibliothek</a><button className="button button--dark" type="submit" disabled={pending}>Kurs anlegen <ArrowRight size={16} /></button></div></form><div className="form-footnote"><CheckCircle2 size={15} /> Inhalte werden nicht im Browser als Quelle der Wahrheit gespeichert.</div></>;
}
