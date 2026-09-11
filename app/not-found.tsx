import Link from 'next/link';

export default function NotFound() {
  return <main className="not-found"><p className="eyebrow">404</p><h1>Diese Seite gibt es nicht.</h1><p>Vielleicht wurde ein Kurs verschoben oder du hast keine Berechtigung dafür.</p><Link className="button button--dark" href="/catalog">Zum Katalog</Link></main>;
}
