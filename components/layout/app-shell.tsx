'use client';

import {
  BookOpen,
  ChevronDown,
  Compass,
  GraduationCap,
  Home,
  LibraryBig,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import { BrandMark } from '@/components/ui/brand-mark';
import { Avatar } from '@/components/ui/avatar';
import { PreferenceControls } from '@/components/layout/preference-controls';
import { useLearnPreferences } from '@/components/providers/learn-preferences';
import { learnApi, logout } from '@/lib/client/api';

export type CurrentIdentity = { username: string; isAdmin: boolean };

// Fetched once client-side so every AppShell-wrapped page gets a real avatar
// and role-safe navigation without threading identity props through ~20 server
// page components. The backend remains authoritative for every route.
function useCurrentIdentity(initialIdentity?: CurrentIdentity | null): CurrentIdentity | null {
  const [identity, setIdentity] = useState<CurrentIdentity | null>(initialIdentity ?? null);
  useEffect(() => {
    if (initialIdentity) return;
    let cancelled = false;
    learnApi<{ user: { username: string }; isAdmin: boolean }>('me')
      .then((data) => { if (!cancelled) setIdentity({ username: data.user.username, isAdmin: data.isAdmin }); })
      .catch(() => { /* not signed in, or offline — fallback avatar stays */ });
    return () => { cancelled = true; };
  }, [initialIdentity]);
  return identity;
}

const navigation: Array<{ href: string; labelKey: string; icon: typeof Home; adminOnly?: boolean }> = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: Home },
  { href: '/catalog', labelKey: 'nav.catalog', icon: Compass },
  { href: '/courses', labelKey: 'nav.courses', icon: BookOpen },
  { href: '/practice', labelKey: 'nav.practice', icon: Sparkles },
  { href: '/teams', labelKey: 'nav.teams', icon: UsersRound },
  { href: '/library', labelKey: 'nav.library', icon: LibraryBig },
];

function NavItems({ onNavigate, identity }: { onNavigate?: () => void; identity: CurrentIdentity | null }) {
  const pathname = usePathname();
  const { t } = useLearnPreferences();
  if (!identity) return null;

  return (
    <nav className="primary-nav" aria-label={t('nav.primary')}>
      {navigation.filter((item) => !item.adminOnly || identity.isAdmin).map(({ href, labelKey, icon: Icon }) => {
        const current = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
        return (
          <Link className={current ? 'is-current' : ''} href={href} key={href} onClick={onNavigate}>
            <Icon size={19} strokeWidth={current ? 2.4 : 2} />
            <span>{t(labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// The platform never changes during a session, so there is nothing to
// subscribe to — matching this file's own useSyncExternalStore pattern for
// system theme (see LearnPreferencesProvider) rather than a state+effect,
// which avoids a hydration mismatch without an extra render after mount.
function subscribeToPlatform() {
  return () => {};
}

function readIsApplePlatform(): boolean {
  type UaData = { platform?: string };
  const uaData = (navigator as Navigator & { userAgentData?: UaData }).userAgentData;
  const platform = uaData?.platform ?? navigator.platform ?? navigator.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

function useShortcutKeyLabel(): string {
  const isApple = useSyncExternalStore(subscribeToPlatform, readIsApplePlatform, (): boolean => true);
  return isApple ? '⌘ K' : 'Strg K';
}

export function AppShell({
  children,
  initialIdentity,
}: {
  children: ReactNode;
  initialIdentity?: CurrentIdentity | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const shortcutKeyLabel = useShortcutKeyLabel();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLearnPreferences();
  const identity = useCurrentIdentity(initialIdentity);

  useEffect(() => {
    if (!workspaceMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) setWorkspaceMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setWorkspaceMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [workspaceMenuOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push('/sign-in');
      router.refresh();
    }
  }

  useEffect(() => {
    if (!menuOpen) return;

    const menu = menuRef.current;
    const menuButton = menuButtonRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusClose = window.setTimeout(() => menu?.querySelector<HTMLElement>('[data-menu-close]')?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !menu) return;
      const focusable = Array.from(menu.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusClose);
      document.removeEventListener('keydown', onKeyDown);
      // Return keyboard users to the trigger after an explicit close. Route
      // navigation then takes focus through Next's normal page transition.
      (previousFocus ?? menuButton)?.focus();
    };
  }, [menuOpen]);

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">{t('action.skipToContent')}</a>
      <aside className="sidebar">
        <BrandMark />
        <NavItems identity={identity} />
        {identity && <div className="sidebar__footer">
          <div className="workspace-menu" ref={workspaceMenuRef}>
            <button
              type="button"
              className="user-mini"
              onClick={() => setWorkspaceMenuOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={workspaceMenuOpen}
            >
              <Avatar name={identity.username} size={33} />
              <span><b>{identity.username}</b><small>{t('account.product')}</small></span>
              <ChevronDown size={15} className={workspaceMenuOpen ? 'workspace-menu__chevron workspace-menu__chevron--open' : 'workspace-menu__chevron'} />
            </button>
            {workspaceMenuOpen && (
              <div className="workspace-menu__panel" role="menu">
                <Link href="/settings" role="menuitem" className="workspace-menu__item" onClick={() => setWorkspaceMenuOpen(false)}>
                  <Settings size={16} /> {t('action.settings')}
                </Link>
                <button type="button" role="menuitem" className="workspace-menu__item workspace-menu__item--danger" onClick={() => void handleLogout()} disabled={loggingOut}>
                  <LogOut size={16} /> {loggingOut ? t('action.loggingOut') : t('action.logout')}
                </button>
              </div>
            )}
          </div>
        </div>}
      </aside>

      <header className="mobile-header">
        <BrandMark compact />
        {identity && <button ref={menuButtonRef} className="icon-button" onClick={() => setMenuOpen(true)} aria-label={t('action.openNavigation')}><Menu size={21} /></button>}
      </header>

      {menuOpen && (
        <div ref={menuRef} className="mobile-menu" role="dialog" aria-modal="true" aria-label={t('nav.primary')} data-lenis-prevent>
          <div className="mobile-menu__head"><BrandMark /><button data-menu-close className="icon-button" onClick={() => setMenuOpen(false)} aria-label={t('action.closeNavigation')}>×</button></div>
          <NavItems onNavigate={() => setMenuOpen(false)} identity={identity} />
          {identity && (
            <div className="mobile-menu__footer">
              <Link href="/settings" className="workspace-menu__item" onClick={() => setMenuOpen(false)}>
                <Settings size={16} /> {t('action.settings')}
              </Link>
              <button type="button" className="workspace-menu__item workspace-menu__item--danger" onClick={() => void handleLogout()} disabled={loggingOut}>
                <LogOut size={16} /> {loggingOut ? t('action.loggingOut') : t('action.logout')}
              </button>
            </div>
          )}
        </div>
      )}

      <main className="main-content" id="main-content" aria-hidden={menuOpen || undefined} inert={menuOpen || undefined}>
        <div className="topbar">
          {identity && <>
            <Link href="/catalog" className="search-trigger" aria-label={t('action.search')}><Search size={18} /><span>{t('action.search')}</span><kbd>{shortcutKeyLabel}</kbd></Link>
            <div className="topbar__actions">
              <PreferenceControls compact />
              <Link href="/create/course" className="button button--dark button--small"><GraduationCap size={16} /> {t('action.createCourse')}</Link>
              <Link href="/settings" className="avatar-button" aria-label={t('action.settings')}><Avatar name={identity.username} size={30} /></Link>
            </div>
          </>}
        </div>
        {children}
      </main>

      {identity && <nav className="bottom-nav" aria-label={t('nav.mobile')} aria-hidden={menuOpen || undefined} inert={menuOpen || undefined}>
        {navigation.filter((item) => !item.adminOnly || identity.isAdmin).slice(0, 5).map(({ href, labelKey, icon: Icon }) => {
          const current = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
          return <Link className={current ? 'is-current' : ''} href={href} key={href}><Icon size={19} /><span>{t(labelKey)}</span></Link>;
        })}
      </nav>}
    </div>
  );
}
