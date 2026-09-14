'use client';

import { CheckCircle2, Clock3, FolderLock, Globe2, Languages, MonitorCog, Save, ShieldCheck, UserRound } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

import { useLearnPreferences } from '@/components/providers/learn-preferences';
import { learnApi } from '@/lib/client/api';
import { localeNames, supportedLocales, type Locale, type ThemeMode } from '@/lib/i18n';

export function LearnerSettings({ username, initialProfile }: {
  username: string;
  initialProfile: { dailyGoalMinutes: number; timezone: string; locale: Locale; theme: ThemeMode };
}) {
  const { locale, theme, setLocale, setTheme, t } = useLearnPreferences();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedLocale, setSelectedLocale] = useState<Locale>(initialProfile.locale || locale);
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(initialProfile.theme || theme);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dailyGoalMinutes = Number(form.get('dailyGoalMinutes'));
    const timezone = String(form.get('timezone') || '').trim();
    if (!Number.isInteger(dailyGoalMinutes) || dailyGoalMinutes < 1 || dailyGoalMinutes > 1_440 || !timezone) return;

    setPending(true);
    setNotice(null);
    try {
      await learnApi('me', {
        method: 'PATCH',
        body: JSON.stringify({ dailyGoalMinutes, timezone, locale: selectedLocale, theme: selectedTheme }),
      });
      setLocale(selectedLocale, false);
      setTheme(selectedTheme, false);
      setNotice(t('settings.saved'));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('settings.saveError'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="learner-settings">
      <section className="panel learner-settings__intro">
        <span className="icon-orb icon-orb--violet"><UserRound size={19} /></span>
        <div><p className="section-kicker">{t('settings.account')}</p><h1>{t('settings.title')}</h1><p>{t('settings.description', { username })}</p></div>
      </section>
      {notice && <div className="inline-notice" role="status"><CheckCircle2 size={16} /> {notice}<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice">×</button></div>}
      <div className="learner-settings__grid">
        <form className="panel learner-settings__form" onSubmit={save}>
          <div><p className="section-kicker">{t('settings.learningRhythm')}</p><h2>{t('settings.goalTitle')}</h2><p>{t('settings.goalBody')}</p></div>
          <label><span><Clock3 size={15} /> {t('settings.minutes')}</span><input name="dailyGoalMinutes" type="number" min={1} max={1440} required defaultValue={initialProfile.dailyGoalMinutes} /></label>
          <label><span><Globe2 size={15} /> {t('settings.timezone')}</span><input name="timezone" maxLength={80} required defaultValue={initialProfile.timezone} placeholder="Europe/Rome" /></label>
          <label><span><Languages size={15} /> {t('preferences.language')}</span><select value={selectedLocale} onChange={(event) => setSelectedLocale(event.target.value as Locale)}>{supportedLocales.map((item) => <option key={item} value={item}>{localeNames[item]}</option>)}</select></label>
          <label><span><MonitorCog size={15} /> {t('preferences.theme')}</span><select value={selectedTheme} onChange={(event) => setSelectedTheme(event.target.value as ThemeMode)}><option value="light">{t('preferences.themeLight')}</option><option value="dark">{t('preferences.themeDark')}</option><option value="system">{t('preferences.themeSystem')}</option></select></label>
          <button className="button button--dark" type="submit" disabled={pending}><Save size={16} /> {pending ? t('settings.saving') : t('settings.save')}</button>
        </form>
        <aside className="learner-settings__side">
          <article className="panel"><span className="icon-orb icon-orb--sun"><FolderLock size={18} /></span><h2>{t('settings.dataTitle')}</h2><p>{t('settings.dataBody')}</p><Link href="/library" className="text-link">{t('settings.library')}</Link></article>
          <article className="panel"><span className="icon-orb icon-orb--mint"><ShieldCheck size={18} /></span><h2>{t('settings.securityTitle')}</h2><p>{t('settings.securityBody')}</p></article>
        </aside>
      </div>
    </div>
  );
}
