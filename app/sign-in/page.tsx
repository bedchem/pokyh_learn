import { ArrowLeft, BookOpenCheck, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { AuthForm } from '@/components/learn/auth-form';
import { BrandMark } from '@/components/ui/brand-mark';
import { Suspense } from 'react';

export default function SignInPage() {
  return <main className="auth-page"><section className="auth-intro"><BrandMark /><Link className="auth-back" href="/"><ArrowLeft size={16} /> Zur Startseite</Link><div><p className="eyebrow"><Sparkles size={15} /> Dein persönlicher Lernraum</p><h1>Weiterlernen, genau dort, wo du aufgehört hast.</h1><p>Deine Kurse, Wiederholungen und Berechtigungen werden sicher über dein Pokyh-Konto verwaltet.</p></div><ul><li><BookOpenCheck size={18} /> Kursfortschritt auf allen Geräten</li><li><ShieldCheck size={18} /> Serverseitig geschützte Inhalte</li></ul></section><section className="auth-panel"><div><p className="eyebrow">Willkommen zurück</p><h2>Anmelden</h2><p>Nutze dein bestehendes Pokyh-Konto.</p></div><Suspense fallback={null}><AuthForm mode="login" /></Suspense></section></main>;
}
