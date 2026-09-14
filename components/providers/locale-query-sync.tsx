'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { parseLocale, parseTheme, type ThemeMode } from '@/lib/i18n';
import { useLearnPreferences } from '@/components/providers/learn-preferences';

/** Makes public display-preference links shareable without trusting them for auth. */
export function LocaleQuerySync() {
  const searchParams = useSearchParams();
  const { locale, theme, setLocale, setTheme } = useLearnPreferences();
  const requested = searchParams.get('lang');
  const requestedTheme = searchParams.get('theme');

  useEffect(() => {
    if (!requested) return;
    const nextLocale = parseLocale(requested);
    if (nextLocale !== locale) setLocale(nextLocale);
  }, [locale, requested, setLocale]);

  useEffect(() => {
    if (requestedTheme !== 'light' && requestedTheme !== 'dark' && requestedTheme !== 'system') return;
    const nextTheme: ThemeMode = parseTheme(requestedTheme);
    if (nextTheme !== theme) setTheme(nextTheme);
  }, [requestedTheme, setTheme, theme]);

  return null;
}
