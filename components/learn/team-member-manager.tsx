'use client';

import { Loader2, Search, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { learnApi } from '@/lib/client/api';

type MemberRole = 'OWNER' | 'MANAGER' | 'MEMBER';
type AssignableRole = 'MANAGER' | 'MEMBER';

interface TeamMember {
  stableUid: string;
  role: MemberRole;
  joinedAt: string;
  username: string | null;
}

interface Candidate {
  stableUid: string;
  username: string;
}

function roleLabel(role: MemberRole): string {
  if (role === 'OWNER') return 'Eigentümer';
  if (role === 'MANAGER') return 'Verwalter';
  return 'Mitglied';
}

export function TeamMemberManager({ teamId, canManageMembers }: { teamId: string; canManageMembers: boolean }) {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [role, setRole] = useState<AssignableRole>('MEMBER');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Reusable for a manual refresh after adding a member (called from a click
  // handler, where a synchronous setState is fine). The mount effect below
  // deliberately does NOT call this — the lint rule that flags synchronous
  // setState inside an effect also flags a named async function invoked
  // directly there, even though its own setState only runs after its first
  // `await` — so the mount load is inlined instead.
  const loadMembers = useCallback(async () => {
    const result = await learnApi<{ members: TeamMember[] }>(`teams/${teamId}/members`);
    setMembers(result.members);
  }, [teamId]);

  useEffect(() => {
    // `loading` already starts `true` (see useState above) — this effect
    // only needs to flip it back to `false` once the request settles.
    let cancelled = false;
    learnApi<{ members: TeamMember[] }>(`teams/${teamId}/members`)
      .then((result) => { if (!cancelled) setMembers(result.members); })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Mitglieder konnten nicht geladen werden.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teamId]);

  useEffect(() => {
    // Browsable, not just searchable: an empty query still fetches (the
    // backend's candidate-members route already returns a page of eligible
    // users with no `q`), gated on the field being focused so it doesn't
    // fetch on mount before the owner has shown any intent to add someone.
    if (!canManageMembers || !searchFocused) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      setSearching(true);
      learnApi<{ candidates: Candidate[] }>(`teams/${teamId}/candidate-members?q=${encodeURIComponent(query.trim())}`)
        .then((result) => { if (!cancelled) setCandidates(result.candidates); })
        .catch(() => { if (!cancelled) setCandidates([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query, teamId, canManageMembers, searchFocused]);

  async function addMember() {
    if (!selected) return;
    setAdding(true);
    setAddError('');
    try {
      await learnApi(`teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId: selected.stableUid, role }),
      });
      setSelected(null);
      setQuery('');
      setCandidates([]);
      setRole('MEMBER');
      await loadMembers();
    } catch (cause) {
      setAddError(cause instanceof Error ? cause.message : 'Mitglied konnte nicht hinzugefügt werden.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className="panel library-card team-member-manager">
      <span className="icon-orb icon-orb--violet"><UsersRound size={20} /></span>
      <h2>Mitglieder</h2>
      {canManageMembers ? (
        <p>Als Eigentümer kannst du hier Mitglieder suchen und hinzufügen. Rechte werden weiterhin serverseitig geprüft.</p>
      ) : (
        <p>Diese Liste zeigt nur Mitglieder deines eigenen Teams.</p>
      )}

      {loading ? (
        <p className="team-member-manager__status"><Loader2 size={14} className="spin" /> Lädt…</p>
      ) : error ? (
        <p className="auth-error" role="alert">{error}</p>
      ) : (
        <ul className="team-member-manager__list">
          {(members ?? []).map((member) => (
            <li key={member.stableUid}>
              <Link className="team-member-manager__name team-member-manager__name--link" href={`/teams/${teamId}/members/${member.stableUid}`}>
                {member.username ?? 'Unbekannt'}
              </Link>
              <span className={`team-member-manager__role team-member-manager__role--${member.role.toLowerCase()}`}>{roleLabel(member.role)}</span>
            </li>
          ))}
        </ul>
      )}

      {canManageMembers && (
        <div className="team-member-manager__add">
          <label htmlFor={`team-member-search-${teamId}`} className="sr-only">Mitglied suchen</label>
          <div className="team-member-manager__search">
            <Search size={15} aria-hidden />
            <input
              id={`team-member-search-${teamId}`}
              type="text"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setSelected(null); }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="POKYH-Benutzername suchen oder auswählen…"
              autoComplete="off"
            />
            {searching && <Loader2 size={14} className="spin" />}
          </div>

          {searchFocused && !selected && candidates.length > 0 && (
            <ul className="team-member-manager__candidates" role="listbox">
              {candidates.map((candidate) => (
                <li key={candidate.stableUid}>
                  <button type="button" onMouseDown={(event) => { event.preventDefault(); setSelected(candidate); setQuery(candidate.username); setCandidates([]); }}>
                    {candidate.username}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchFocused && !selected && !searching && candidates.length === 0 && (
            <p className="team-member-manager__empty">Keine passenden Nutzer gefunden.</p>
          )}

          {selected && (
            <div className="team-member-manager__confirm">
              <label htmlFor={`team-member-role-${teamId}`} className="sr-only">Rolle</label>
              <select id={`team-member-role-${teamId}`} value={role} onChange={(event) => setRole(event.target.value as AssignableRole)}>
                <option value="MEMBER">Mitglied</option>
                <option value="MANAGER">Verwalter</option>
              </select>
              <button type="button" className="button button--dark" onClick={() => void addMember()} disabled={adding}>
                {adding ? <Loader2 size={14} className="spin" /> : <UserPlus size={14} />} {selected.username} hinzufügen
              </button>
            </div>
          )}
          {addError && <p className="auth-error" role="alert">{addError}</p>}
        </div>
      )}

      <p className="team-member-manager__footnote"><ShieldCheck size={13} /> Rechte werden bei jeder Aktion serverseitig geprüft.</p>
    </article>
  );
}
