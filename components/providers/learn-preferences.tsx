'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';

import { translate, type Locale, type ThemeMode } from '@/lib/i18n';
import { learnApi } from '@/lib/client/api';

type ResolvedTheme = 'light' | 'dark';

type PreferencesContextValue = {
  locale: Locale;
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setLocale: (locale: Locale, sync?: boolean) => void;
  setTheme: (theme: ThemeMode, sync?: boolean) => void;
  t: (key: string, replacements?: Record<string, string>) => string;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function subscribeToSystemTheme(onChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function readSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function writePreferenceCookie(name: string, value: string) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function LearnPreferencesProvider({
  children,
  initialLocale,
  initialTheme,
  hasSession = false,
}: {
  children: ReactNode;
  initialLocale: Locale;
  initialTheme: ThemeMode;
  hasSession?: boolean;
}) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [theme, setThemeState] = useState(initialTheme);
  const systemTheme = useSyncExternalStore<ResolvedTheme>(subscribeToSystemTheme, readSystemTheme, (): ResolvedTheme => 'light');
  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const persistProfile = useCallback(async (patch: { locale?: Locale; theme?: ThemeMode }) => {
    if (!hasSession) return;
    try {
      await learnApi('me', { method: 'PATCH', body: JSON.stringify(patch) });
    } catch {
      // Guests only persist non-sensitive display preferences in a same-site cookie.
    }
  }, [hasSession]);

  const setLocale = useCallback((nextLocale: Locale, sync = true) => {
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
    writePreferenceCookie('pokyh_learn_locale', nextLocale);
    if (sync) void persistProfile({ locale: nextLocale });
  }, [persistProfile]);

  const setTheme = useCallback((nextTheme: ThemeMode, sync = true) => {
    setThemeState(nextTheme);
    writePreferenceCookie('pokyh_learn_theme', nextTheme);
    if (sync) void persistProfile({ theme: nextTheme });
  }, [persistProfile]);

  useEffect(() => {
    if (!hasSession) return;
    const hasLocale = document.cookie.includes('pokyh_learn_locale=');
    const hasTheme = document.cookie.includes('pokyh_learn_theme=');
    if (hasLocale && hasTheme) return;

    void learnApi<{ profile: { locale?: Locale; theme?: ThemeMode } }>('me')
      .then(({ profile }) => {
        if (!hasLocale && profile.locale) setLocale(profile.locale, false);
        if (!hasTheme && profile.theme) setTheme(profile.theme, false);
      })
      .catch(() => {
        // An unauthenticated visitor has no server profile to restore.
      });
  }, [hasSession, setLocale, setTheme]);

  const value = useMemo<PreferencesContextValue>(() => ({
    locale,
    theme,
    resolvedTheme,
    setLocale,
    setTheme,
    t: (key, replacements) => translate(locale, key, replacements),
  }), [locale, resolvedTheme, setLocale, setTheme, theme]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useLearnPreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('useLearnPreferences must be used within LearnPreferencesProvider');
  return value;
}
