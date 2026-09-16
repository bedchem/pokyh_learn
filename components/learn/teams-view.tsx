import { ArrowRight, Crown, FolderKanban, UsersRound } from 'lucide-react';
import Link from 'next/link';

import type { Team } from '@/lib/types';

// Team creation happens only in the api.pokyh.com backend admin panel — see
// this repo's CLAUDE.md. There is deliberately no "create team" action here.
export function TeamsView({ teams }: { teams: Team[] }) {
  return <div className="team-grid">{teams.map((team) => <article className={`team-card team-card--${team.accent}`} key={team.id}><div className="team-card__icon"><UsersRound size={21} /></div><div className="team-card__head"><div><span className="team-role"><Crown size={13} /> {team.role}</span><h2>{team.name}</h2></div><Link href={`/teams/${team.slug}`} aria-label={`${team.name} öffnen`}><ArrowRight size={18} /></Link></div><p>{team.description}</p><div className="team-card__meta"><span><UsersRound size={15} /> {team.memberCount} Mitglieder</span><span><FolderKanban size={15} /> {team.courseCount} Kurse</span></div><Link href={`/teams/${team.slug}`} className="button button--soft">Gruppe öffnen <ArrowRight size={16} /></Link></article>)}</div>;
}
