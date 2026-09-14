import { AppShell } from '@/components/layout/app-shell';
import { Text } from '@/components/i18n/text';
import { LibraryTransfer } from '@/components/learn/library-transfer';
import { requireLearnUser } from '@/lib/server/learn-admin';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const { identity } = await requireLearnUser('/library');
  return <AppShell initialIdentity={identity}><div className="page-wrap"><section className="page-heading"><div><p className="eyebrow"><Text id="library.eyebrow" /></p><h1><Text id="library.title" /></h1><p className="page-lead"><Text id="library.body" /></p></div></section><LibraryTransfer /></div></AppShell>;
}
