import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import '@fontsource-variable/manrope';
import '@fontsource/dm-mono/latin.css';
import './globals.css';

import { LearnPreferencesProvider } from '@/components/providers/learn-preferences';
import { LocaleQuerySync } from '@/components/providers/locale-query-sync';
import { SmoothScroll } from '@/components/motion/smooth-scroll';
import { parseLocale, parseTheme } from '@/lib/i18n';
import { getAccessToken } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

function siteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) return undefined;
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

const metadataBase = siteUrl();

export const metadata: Metadata = {
  metadataBase,
  title: { default: 'POKYHlearn', template: '%s · POKYHlearn' },
  description: 'A calm, privacy-minded learning space for courses, vocabulary, and targeted review.',
  applicationName: 'POKYHlearn',
  category: 'Education',
  keywords: ['POKYHlearn', 'learning', 'vocabulary', 'Italian', 'English', 'courses', 'spaced review'],
  alternates: {
    canonical: '/',
    languages: { de: '/?lang=de', en: '/?lang=en', it: '/?lang=it', 'x-default': '/' },
  },
  openGraph: {
    type: 'website',
    locale: 'de_IT',
    alternateLocale: ['en_US', 'it_IT'],
    siteName: 'POKYHlearn',
    title: 'POKYHlearn',
    description: 'Courses, vocabulary, and targeted review in one focused learning space.',
  },
  twitter: { card: 'summary', title: 'POKYHlearn', description: 'Courses, vocabulary, and targeted review.' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1f0f8' },
    { media: '(prefers-color-scheme: dark)', color: '#09090c' },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const locale = parseLocale(store.get('pokyh_learn_locale')?.value);
  const theme = parseTheme(store.get('pokyh_learn_theme')?.value);
  const initialResolvedTheme = theme === 'dark' ? 'dark' : 'light';
  // Do not make an anonymous browser call to `/learn/me`: a guest is an
  // expected state, not a failed request. The HTTP-only session cookie lets
  // the server decide whether optional profile synchronization is appropriate.
  const hasSession = Boolean(await getAccessToken());

  return (
    <html lang={locale} data-theme={initialResolvedTheme} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <LearnPreferencesProvider initialLocale={locale} initialTheme={theme} hasSession={hasSession}>
          <SmoothScroll />
          <LocaleQuerySync />
          {children}
        </LearnPreferencesProvider>
        <script
          type="application/ld+json"
          // Static product metadata only; no user data or deployment secrets.
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'POKYHlearn',
            applicationCategory: 'EducationalApplication',
            operatingSystem: 'Web',
            inLanguage: ['de', 'en', 'it'],
            description: 'Courses, vocabulary, and targeted review in one focused learning space.',
          }) }}
        />
      </body>
    </html>
  );
}
