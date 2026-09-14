import type { ReactNode } from 'react';
import Link from 'next/link';

import { Text } from '@/components/i18n/text';
import { PreferenceControls } from '@/components/layout/preference-controls';
import { BrandMark } from '@/components/ui/brand-mark';

/**
 * Read-only course-discovery frame. It deliberately has no learner sidebar or
 * authoring controls, so public visitors only see actions they can use.
 */
export function PublicCatalogFrame({
  children,
  authenticated,
}: {
  children: ReactNode;
  authenticated: boolean;
}) {
  return (
    <div className="public-catalog">
      <a className="skip-link" href="#catalog-content"><Text id="action.skipToContent" /></a>
      <header className="public-catalog__header">
        <BrandMark />
        <div className="public-catalog__actions">
          <PreferenceControls compact />
          {authenticated ? (
            <Link className="button button--dark button--small" href="/dashboard"><Text id="nav.dashboard" /></Link>
          ) : (
            <Link className="button button--dark button--small" href="/sign-in?returnTo=%2Fcatalog"><Text id="landing.signIn" /></Link>
          )}
        </div>
      </header>
      <main className="public-catalog__main" id="catalog-content">{children}</main>
    </div>
  );
}
