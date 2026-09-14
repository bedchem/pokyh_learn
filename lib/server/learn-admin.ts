import 'server-only';

import { redirect } from 'next/navigation';

import { getLearnIdentity } from '@/lib/server/data';
import { getAccessToken } from '@/lib/server/session';

/**
 * Resolves a current Learn identity before rendering a personal surface.
 *
 * This is intentionally a server-side gate, not a navigation-only hint: a
 * missing, expired, or invalid session never renders a learner workspace.
 * The backend still authorizes every data request independently.
 */
export async function requireLearnUser(returnTo: string) {
  const token = await getAccessToken();
  if (!token) redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);

  const identity = await getLearnIdentity(token).catch(() => null);
  if (!identity) redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);

  return { token, identity };
}

/**
 * Resolves the canonical administrator capability from the backend before a
 * management page fetches any team data. The backend repeats this check for
 * every mutation; this helper only keeps the server-rendered UI aligned.
 */
export async function requireLearnAdministrator(returnTo: string) {
  const { token, identity } = await requireLearnUser(returnTo);
  if (!identity?.isAdmin) redirect('/catalog');

  return { token, identity };
}
