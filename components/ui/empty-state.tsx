import { ArrowRight, CircleAlert } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function EmptyState({
  title,
  body,
  href,
  action,
  icon,
}: {
  title: string;
  body: string;
  href?: string;
  action?: string;
  icon?: ReactNode;
}) {
  return (
    <section className="empty-state">
      <span className="empty-state__icon">{icon || <CircleAlert size={22} />}</span>
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      {href && action && <Link className="button button--dark" href={href}>{action}<ArrowRight size={16} /></Link>}
    </section>
  );
}
