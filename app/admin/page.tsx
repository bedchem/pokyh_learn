import { BadgeCheck, BookOpenCheck, Shield, SlidersHorizontal, UsersRound } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';

const areas = [
  ['Kursfreigaben', 'Katalog-Inhalte prüfen, veröffentlichen oder zurückziehen.', BookOpenCheck],
  ['Zugriffsrechte', 'Schreibrechte für Personen und Teams nachvollziehbar vergeben.', UsersRound],
  ['Moderation', 'Öffentliche Inhalte und gemeldete Einträge prüfen.', BadgeCheck],
  ['Plattformregeln', 'Grenzwerte, Provider-Policy und Lernkonfiguration verwalten.', SlidersHorizontal],
];

export default function AdminPage() {
  return <AppShell><div className="page-wrap"><section className="page-heading"><div><p className="eyebrow">Plattformverwaltung</p><h1>Verantwortungsvoll verwalten.</h1><p className="page-lead">Dieser Bereich ist ausschließlich für serverseitig bestätigte Pokyh-Administratoren bestimmt.</p></div><span className="admin-shield"><Shield size={19} /> Admin</span></section><div className="admin-area-grid">{areas.map(([title, description, Icon]) => { const Component = Icon as typeof Shield; return <a href="#" className="panel admin-area" key={title as string}><span><Component size={22} /></span><h2>{title as string}</h2><p>{description as string}</p><i>Öffnen →</i></a>; })}</div></div></AppShell>;
}
