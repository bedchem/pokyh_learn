'use client';

import { useLearnPreferences } from '@/components/providers/learn-preferences';

/**
 * Use this small boundary from server-rendered routes for product UI copy.
 * Authored lesson/course content deliberately remains in its author-selected
 * language; it is not silently machine-translated by the product.
 */
export function Text({ id, values }: { id: string; values?: Record<string, string> }) {
  const { t } = useLearnPreferences();
  return <>{t(id, values)}</>;
}
