'use client';

import { ArrowRight, CheckCircle2, Eye, Globe2, LockKeyhole, UsersRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { learnApi } from '@/lib/client/api';
import { useLearnPreferences } from '@/components/providers/learn-preferences';
import type { Team } from '@/lib/types';

type CreatedCourse = { slug: string };

export function CourseCreatorForm({
  canCreateTeamCourse,
  teams,
}: {
  canCreateTeamCourse: boolean;
  teams: Team[];
}) {
  const router = useRouter();
  const { t } = useLearnPreferences();
  const [visibility, setVisibility] = useState<'private' | 'team' | 'public'>('private');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const isTeamCourse = canCreateTeamCourse && visibility === 'team';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const teamId = String(data.get('teamId') || '');
    if (isTeamCourse && !teamId) {
      setError(t('courseForm.teamRequired'));
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
          subject: String(data.get('subject') || '').trim(),
          language: String(data.get('language') || ''),
          level: String(data.get('level') || ''),
          visibility: isTeamCourse ? 'TEAM' : visibility === 'public' ? 'PUBLIC' : 'PRIVATE',
          // Public courses start as a server-held draft. A platform reviewer
          // controls publication; private and team drafts are immediately usable.
          status: 'DRAFT',
          ...(isTeamCourse ? { teamId } : {}),
        }),
      });
      router.push(`/courses/${course.slug}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('courseForm.createError'));
    } finally {
      setPending(false);
    }
  }

  return <>
    <form className="course-form panel" onSubmit={submit}>
      <section>
        <p className="section-kicker">1 · {t('courseForm.basics')}</p>
        <label>{t('courseForm.title')}<input name="title" placeholder={t('courseForm.titlePlaceholder')} required maxLength={160} /></label>
        <label>{t('courseForm.summary')}<textarea name="summary" rows={4} placeholder={t('courseForm.summaryPlaceholder')} maxLength={2000} /></label>
        <div className="form-grid">
          <label>{t('courseForm.subject')}<input name="subject" placeholder={t('courseForm.subjectPlaceholder')} required maxLength={120} /></label>
          <label>{t('courseForm.language')}<select name="language" defaultValue="it"><option value="it">{t('courseForm.italian')}</option><option value="en">{t('courseForm.english')}</option><option value="de">{t('courseForm.german')}</option></select></label>
          <label>{t('courseForm.level')}<select name="level" defaultValue="A1"><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>C2</option><option value="mixed">{t('courseForm.mixed')}</option></select></label>
        </div>
      </section>
      <section>
        <p className="section-kicker">2 · {t('courseForm.visibility')}</p>
        <div className={`visibility-options${canCreateTeamCourse ? '' : ' visibility-options--two'}`}>
          <label><input checked={visibility === 'private'} name="visibility" type="radio" value="private" onChange={() => setVisibility('private')} /><span><LockKeyhole size={19} /><b>{t('courseForm.private')}</b><small>{t('courseForm.privateBody')}</small></span></label>
          {canCreateTeamCourse && <label><input checked={visibility === 'team'} name="visibility" type="radio" value="team" onChange={() => setVisibility('team')} /><span><UsersRound size={19} /><b>{t('courseForm.team')}</b><small>{t('courseForm.teamBody')}</small></span></label>}
          <label><input checked={visibility === 'public'} name="visibility" type="radio" value="public" onChange={() => setVisibility('public')} /><span><Globe2 size={19} /><b>{t('courseForm.public')}</b><small>{t('courseForm.publicBody')}</small></span></label>
        </div>
        {isTeamCourse && <label className="team-picker">{t('courseForm.team')}<select name="teamId" defaultValue=""><option value="" disabled>{t('courseForm.chooseTeam')}</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>}
      </section>
      <section className="course-form__summary"><Eye size={18} /><p><b>{t('courseForm.controlTitle')}</b> {t('courseForm.controlBody')}</p></section>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="course-form__actions"><a className="button button--plain" href="/library">{t('courseForm.library')}</a><button className="button button--dark" type="submit" disabled={pending}>{pending ? t('courseForm.creating') : t('courseForm.create')} <ArrowRight size={16} /></button></div>
    </form>
    <div className="form-footnote"><CheckCircle2 size={15} /> {t('courseForm.serverNote')}</div>
  </>;
}
