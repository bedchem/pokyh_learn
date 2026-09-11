'use client';

import {
  BookMarked,
  BookOpen,
  ChevronDown,
  CircleUserRound,
  Compass,
  GraduationCap,
  Home,
  LibraryBig,
  Menu,
  Search,
  Settings,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { BrandMark } from '@/components/ui/brand-mark';

const navigation = [
  { href: '/dashboard', label: 'Übersicht', icon: Home },
  { href: '/catalog', label: 'Katalog', icon: Compass },
  { href: '/courses', label: 'Meine Kurse', icon: BookOpen },
  { href: '/practice', label: 'Trainieren', icon: Sparkles },
  { href: '/vocabulary', label: 'Vokabeln', icon: BookMarked },
  { href: '/teams', label: 'Teams', icon: UsersRound },
  { href: '/library', label: 'Bibliothek', icon: LibraryBig },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="primary-nav" aria-label="Hauptnavigation">
      {navigation.map(({ href, label, icon: Icon }) => {
        const current = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
        return (
          <Link className={current ? 'is-current' : ''} href={href} key={href} onClick={onNavigate}>
            <Icon size={19} strokeWidth={current ? 2.4 : 2} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <BrandMark />
        <NavItems />
        <div className="sidebar__footer">
          <Link href="/settings" className="sidebar-settings"><Settings size={18} /> Einstellungen</Link>
          <div className="user-mini">
            <span className="user-mini__avatar">F</span>
            <span><b>Dein Konto</b><small>Pokyh Learn</small></span>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>

      <header className="mobile-header">
        <BrandMark compact />
        <button className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Navigation öffnen"><Menu size={21} /></button>
      </header>

      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="mobile-menu__head"><BrandMark /><button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Navigation schließen">×</button></div>
          <NavItems onNavigate={() => setMenuOpen(false)} />
        </div>
      )}

      <main className="main-content">
        <div className="topbar">
          <button className="search-trigger" aria-label="Katalog durchsuchen"><Search size={18} /><span>Suche nach Kursen oder Themen</span><kbd>⌘ K</kbd></button>
          <div className="topbar__actions">
            <Link href="/create/course" className="button button--dark button--small"><GraduationCap size={16} /> Kurs erstellen</Link>
            <Link href="/settings" className="avatar-button" aria-label="Kontoeinstellungen"><CircleUserRound size={21} /></Link>
          </div>
        </div>
        {children}
      </main>

      <nav className="bottom-nav" aria-label="Mobile Navigation">
        {navigation.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const current = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
          return <Link className={current ? 'is-current' : ''} href={href} key={href}><Icon size={19} /><span>{label}</span></Link>;
        })}
      </nav>
    </div>
  );
}
