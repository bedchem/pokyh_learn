import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { AuthForm } from '@/components/learn/auth-form';
import { BrandMark } from '@/components/ui/brand-mark';
import { Suspense } from 'react';

export default function RegisterPage() {
  return <main className="auth-page"><section className="auth-intro"><BrandMark /><Link className="auth-back" href="/"><ArrowLeft size={16} /> Zur Startseite</Link><div><p className="eyebrow"><Sparkles size={15} /> Dein persönlicher Lernraum</p><h1>Mach Lernen zu deinem eigenen System.</h1><p>Erstelle Listen, wähle Kurse und behalte den Überblick über das, was noch einmal drankommt.</p></div><ul><li><CheckCircle2 size={18} /> Kurse bewusst auswählen</li><li><CheckCircle2 size={18} /> Privaten Lernfortschritt behalten</li></ul></section><section className="auth-panel"><div><p className="eyebrow">Neu bei Pokyh Learn</p><h2>Konto erstellen</h2><p>Deine Zugangsdaten gelten für deinen persönlichen Lernraum.</p></div><Suspense fallback={null}><AuthForm mode="register" /></Suspense></section></main>;
}
