'use client';

import { Check, ChevronDown, Languages, Moon, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { localeNames, supportedLocales, type Locale } from '@/lib/i18n';
import { useLearnPreferences } from '@/components/providers/learn-preferences';

export function PreferenceControls({ compact = false }: { compact?: boolean }) {
  const { locale, resolvedTheme, setLocale, setTheme, t } = useLearnPreferences();
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
  const [localeOpen, setLocaleOpen] = useState(false);
  const localeRef = useRef<HTMLDivElement>(null);

  // A native <select>'s open popup is rendered by the OS, not the page — on
  // Windows it ignores the app's dark palette even with color-scheme set on
  // <html>, producing a jarring plain-white listbox mid-dark-theme. A custom
  // listbox keeps every pixel themed, matching the workspace-menu pattern in
  // app-shell.tsx (same click-outside/Escape close behaviour).
  useEffect(() => {
    if (!localeOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (localeRef.current && !localeRef.current.contains(event.target as Node)) setLocaleOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLocaleOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [localeOpen]);

  function chooseLocale(next: Locale) {
    setLocale(next);
    setLocaleOpen(false);
  }

  return (
    <div className={compact ? 'preference-controls preference-controls--compact' : 'preference-controls'}>
      <div className="preference-controls__locale" ref={localeRef}>
        <button
          type="button"
          className="preference-controls__locale-trigger"
          onClick={() => setLocaleOpen((value) => !value)}
          aria-haspopup="listbox"
          aria-expanded={localeOpen}
          aria-label={t('preferences.language')}
        >
          <Languages size={15} aria-hidden="true" />
          <span>{localeNames[locale]}</span>
          <ChevronDown size={13} aria-hidden="true" className={localeOpen ? 'preference-controls__chevron preference-controls__chevron--open' : 'preference-controls__chevron'} />
        </button>
        {localeOpen && (
          <ul className="preference-controls__locale-list" role="listbox" aria-label={t('preferences.language')}>
            {supportedLocales.map((item) => (
              <li key={item} role="presentation">
                <button type="button" role="option" aria-selected={item === locale} onClick={() => chooseLocale(item)}>
                  <span>{localeNames[item]}</span>
                  {item === locale && <Check size={14} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
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
