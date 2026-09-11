import { AppShell } from '@/components/layout/app-shell';
import { TeamCreateForm } from '@/components/learn/team-create-form';

export default function NewTeamPage() {
  return <AppShell><div className="page-wrap create-page"><section className="page-heading"><div><p className="eyebrow">Gemeinsam lernen</p><h1>Ein Team mit klaren Grenzen.</h1><p className="page-lead">Mitglieder und Kurse bleiben getrennt von deinen privaten Lernständen.</p></div></section><TeamCreateForm /></div></AppShell>;
}
