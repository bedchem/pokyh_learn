import { ArrowLeft, FolderKanban, ShieldCheck, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { getTeams } from '@/lib/server/data';
import { getAccessToken } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const teams = await getTeams(await getAccessToken()).catch(() => []);
  const team = teams.find((item) => item.slug === slug);
  if (!team) notFound();
  return <AppShell><div className="page-wrap"><Link className="back-link" href="/teams"><ArrowLeft size={16} /> Teams</Link><section className={`course-hero course-hero--${team.accent}`}><div className="course-hero__content"><span className="course-language">Team · {team.role}</span><h1>{team.name}</h1><p>{team.description || 'Dieses Team ist bereit für gemeinsame Kurse und klare Zugriffsrechte.'}</p><div className="course-hero__meta"><span><UsersRound size={16} /> {team.memberCount} Mitglieder</span><span><FolderKanban size={16} /> {team.courseCount} Kurse</span><span><ShieldCheck size={16} /> Rechte serverseitig</span></div></div></section><section className="library-grid"><article className="panel library-card"><span className="icon-orb icon-orb--violet"><UsersRound size={20} /></span><h2>Mitglieder</h2><p>Einladungen und Rollen werden nur durch berechtigte Team-Owner oder Manager im Backend verwaltet.</p></article><article className="panel library-card"><span className="icon-orb icon-orb--rose"><FolderKanban size={20} /></span><h2>Geteilte Kurse</h2><p>Teammitglieder erhalten Leserechte nur für Kurse, die ausdrücklich diesem Team zugeordnet sind.</p><Link className="text-link" href="/create/course">Teamkurs erstellen</Link></article></section></div></AppShell>;
}
