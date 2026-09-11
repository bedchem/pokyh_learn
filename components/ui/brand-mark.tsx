import { GraduationCap } from 'lucide-react';
import Link from 'next/link';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand-mark" href="/" aria-label="Pokyh Learn – Startseite">
      <span className="brand-symbol" aria-hidden="true">
        <GraduationCap size={compact ? 19 : 21} strokeWidth={2.25} />
      </span>
      {!compact && <span className="brand-name">pokyh<span>learn</span></span>}
    </Link>
  );
}
