import { Bell, DatabaseZap, Globe2, ShieldCheck, UserRound } from 'lucide-react';

import { AppShell } from '@/components/layout/app-shell';

const settings = [
  ['Profil', 'Name, Sprache und persönliche Lernpräferenzen.', UserRound],
  ['Benachrichtigungen', 'Erinnerungen für fällige Wiederholungen und Team-Einladungen.', Bell],
  ['Datenschutz', 'Export, Löschung und Sichtbarkeit deiner Lerninformationen.', ShieldCheck],
  ['Offline & Synchronisierung', 'Lokale Entwürfe und ausstehende Antworten verwalten.', DatabaseZap],
  ['Sprache', 'Oberflächensprache und bevorzugte Lernsprachen.', Globe2],
];

export default function SettingsPage() {
  return <AppShell><div className="page-wrap"><section className="page-heading"><div><p className="eyebrow">Dein Konto</p><h1>Einstellungen</h1><p className="page-lead">Alles Persönliche an einem Ort – klar getrennt von Kurs-, Team- und Plattformrechten.</p></div></section><div className="settings-list panel">{settings.map(([title, description, Icon]) => { const Component = Icon as typeof UserRound; return <a href="#" key={title as string}><span><Component size={19} /></span><div><b>{title as string}</b><p>{description as string}</p></div><i>›</i></a>; })}</div></div></AppShell>;
}
