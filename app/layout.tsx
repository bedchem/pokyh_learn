import type { Metadata } from 'next';
import '@fontsource-variable/manrope';
import '@fontsource/dm-mono/latin.css';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Pokyh Learn', template: '%s · Pokyh Learn' },
  description: 'Eine ruhige, sichere Lernplattform für Kurse, Vokabeln und gezieltes Wiederholen.',
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}
