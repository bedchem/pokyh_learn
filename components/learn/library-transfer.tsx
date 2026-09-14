'use client';

import { CheckCircle2, Download, FileJson2, FolderLock, Upload } from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { learnApi } from '@/lib/client/api';

type ImportResult = {
  imported: {
    courses: Array<{ title: string }>;
    sectionCount: number;
    vocabularyCount: number;
  };
};

export function LibraryTransfer() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<'export' | 'import' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function exportLibrary() {
    setPending('export');
    setNotice(null);
    try {
      const payload = await learnApi<unknown>('library/export');
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = `pokyh-learn-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
      setNotice('Dein persönlicher JSON-Export wurde lokal heruntergeladen. Er enthält keine Teams, Rechte oder Zugangsdaten.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Der Export konnte nicht erstellt werden.');
    } finally {
      setPending(null);
    }
  }

  async function importLibrary(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPending('import');
    setNotice(null);
    try {
      const raw = await file.text();
      const payload = JSON.parse(raw) as unknown;
      const result = await learnApi<ImportResult>('library/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const courseCount = result.imported.courses.length;
      setNotice(`${courseCount} ${courseCount === 1 ? 'Kurs wurde' : 'Kurse wurden'} als private Entwürfe importiert (${result.imported.sectionCount} Abschnitte, ${result.imported.vocabularyCount} Vokabeln).`);
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Die Datei ist kein gültiger persönlicher Learn-Export.');
    } finally {
      setPending(null);
    }
  }

  return <>
    {notice && <div className="inline-notice library-transfer__notice" role="status"><CheckCircle2 size={16} /> {notice}<button type="button" onClick={() => setNotice(null)} aria-label="Hinweis schließen">×</button></div>}
    <section className="library-grid">
      <article className="panel library-card"><span className="icon-orb icon-orb--violet"><FileJson2 size={20} /></span><h2>JSON exportieren</h2><p>Exportiere ausschließlich deine eigenen Kurse, eigenen Vokabeln und deinen Lernstand. Teams, Freigaben, andere Personen und Zugangsdaten werden nie exportiert.</p><button className="button button--dark" type="button" disabled={pending !== null} onClick={exportLibrary}><Download size={16} /> {pending === 'export' ? 'Exportiert…' : 'Export herunterladen'}</button></article>
      <article className="panel library-card"><span className="icon-orb icon-orb--rose"><Upload size={20} /></span><h2>JSON importieren</h2><p>Nur versionierte persönliche Learn-Exports werden angenommen. Jeder importierte Kurs wird neu angelegt, privat gehalten und kann keine Rollen oder Rechte verändern.</p><input ref={inputRef} className="sr-only" type="file" accept="application/json,.json" onChange={importLibrary} /><button className="button button--soft" type="button" disabled={pending !== null} onClick={() => inputRef.current?.click()}><Upload size={16} /> {pending === 'import' ? 'Importiert…' : 'Exportdatei auswählen'}</button></article>
      <article className="panel library-card"><span className="icon-orb icon-orb--sun"><FolderLock size={20} /></span><h2>Private Entwürfe</h2><p>Neue und importierte Kurse bleiben zuerst nur für dich sichtbar. Erst eine ausdrücklich berechtigte Verwaltung kann einen Kurs im Katalog veröffentlichen.</p><a className="text-link" href="/create/course">Entwurf erstellen</a></article>
    </section>
  </>;
}
