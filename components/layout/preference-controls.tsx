'use client';

import { Languages, Moon, Sun } from 'lucide-react';

import { localeNames, supportedLocales } from '@/lib/i18n';
import { useLearnPreferences } from '@/components/providers/learn-preferences';

export function PreferenceControls({ compact = false }: { compact?: boolean }) {
  const { locale, resolvedTheme, setLocale, setTheme, t } = useLearnPreferences();
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

  return (
    <div className={compact ? 'preference-controls preference-controls--compact' : 'preference-controls'}>
      <label className="preference-controls__locale">
        <span className="sr-only">{t('preferences.language')}</span>
        <Languages size={15} aria-hidden="true" />
        <select value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)} aria-label={t('preferences.language')}>
          {supportedLocales.map((item) => <option key={item} value={item}>{localeNames[item]}</option>)}
        </select>
      </label>
      <button
        className="icon-button preference-controls__theme"
        type="button"
        onClick={() => setTheme(nextTheme)}
        aria-label={resolvedTheme === 'dark' ? t('preferences.switchToLight') : t('preferences.switchToDark')}
        title={t('preferences.theme')}
      >
        {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </div>
  );
}
