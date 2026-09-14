'use client';

import { ArrowDown, ArrowUp, CheckCircle2, FileText, GripVertical, Plus, Save, Trash2, UserPlus, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { learnApi } from '@/lib/client/api';
import type { Course, CourseSection } from '@/lib/types';

type CourseAccessEntry = { stableUid: string; username: string; permission: 'VIEW' | 'EDIT' | 'MANAGE'; grantedBy: string | null; createdAt: string };

type EditableSection = CourseSection & { content: Record<string, unknown> };

function readableContent(content: CourseSection['content']) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return '';
  const value = content as Record<string, unknown>;
  const paragraphs = Array.isArray(value.paragraphs)
    ? value.paragraphs.filter((item): item is string => typeof item === 'string')
    : [];
  return paragraphs.join('\n\n');
}

function blankSection(): EditableSection {
  return { id: '', title: '', summary: '', type: 'LESSON', sortOrder: 0, content: { paragraphs: [] } };
}

function asContent(value: string) {
  return { paragraphs: value.split(/\n\s*\n/g).map((paragraph) => paragraph.trim()).filter(Boolean) };
}

function formatSection(section: CourseSection): EditableSection {
  return { ...section, content: section.content && typeof section.content === 'object' && !Array.isArray(section.content) ? section.content as Record<string, unknown> : {} };
}

export function CourseStudio({ course }: { course: Course }) {
  const router = useRouter();
  const [sections, setSections] = useState<EditableSection[]>(() => (course.sections || []).map(formatSection));
  const [draft, setDraft] = useState<EditableSection | null>(null);
  const [contentText, setContentText] = useState('');
  const [metadataPending, setMetadataPending] = useState(false);
  const [sectionPending, setSectionPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [access, setAccess] = useState<CourseAccessEntry[]>([]);
  const [shareUsername, setShareUsername] = useState('');
  const [sharePermission, setSharePermission] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [sharePending, setSharePending] = useState(false);
  const sectionCountLabel = useMemo(() => `${sections.length} ${sections.length === 1 ? 'Abschnitt' : 'Abschnitte'}`, [sections.length]);

  useEffect(() => {
    if (!course.canManage) return;
    let cancelled = false;
    learnApi<{ access: CourseAccessEntry[] }>(`courses/${course.id}/access`)
      .then((payload) => { if (!cancelled) setAccess(payload.access); })
      .catch(() => { /* non-fatal — the sharing panel just stays empty */ });
    return () => { cancelled = true; };
  }, [course.canManage, course.id]);

  async function shareWithPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userId = shareUsername.trim();
    if (!userId) return;
    setSharePending(true);
    setNotice(null);
    try {
      const grant = await learnApi<{ stableUid: string; username: string; permission: 'VIEW' | 'EDIT' }>(`courses/${course.id}/access`, {
        method: 'POST',
        body: JSON.stringify({ userId, permission: sharePermission }),
      });
      setAccess((current) => [...current.filter((entry) => entry.stableUid !== grant.stableUid), { ...grant, grantedBy: null, createdAt: new Date().toISOString() }]);
      setShareUsername('');
      setNotice(`Kurs mit ${grant.username} geteilt.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Der Kurs konnte nicht geteilt werden.');
    } finally {
      setSharePending(false);
    }
  }

  async function revokeAccess(entry: CourseAccessEntry) {
    setSharePending(true);
    setNotice(null);
    try {
      await learnApi(`courses/${course.id}/access/${entry.stableUid}`, { method: 'DELETE' });
      setAccess((current) => current.filter((item) => item.stableUid !== entry.stableUid));
      setNotice(`Zugriff für ${entry.username} entfernt.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Der Zugriff konnte nicht entfernt werden.');
    } finally {
      setSharePending(false);
    }
  }

  function openDraft(section?: EditableSection) {
    const next = section ? { ...section } : { ...blankSection(), sortOrder: sections.length };
    setDraft(next);
    setContentText(section ? readableContent(section.content) : '');
    setNotice(null);
  }

  async function saveMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!course.canManage) return;
    const form = new FormData(event.currentTarget);
    setMetadataPending(true);
    setNotice(null);
    try {
      await learnApi(`courses/${course.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: String(form.get('title') || '').trim(),
          summary: String(form.get('summary') || '').trim(),
          subject: String(form.get('subject') || '').trim(),
          language: String(form.get('language') || '').trim(),
          level: String(form.get('level') || '').trim(),
        }),
      });
      setNotice('Kursdaten wurden serverseitig gespeichert.');
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Die Kursdaten konnten nicht gespeichert werden.');
    } finally {
      setMetadataPending(false);
    }
  }

  async function saveSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const payload = {
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      type: draft.type,
      content: asContent(contentText),
    };
    if (!payload.title) return;
    setSectionPending(true);
    setNotice(null);
    try {
      const saved = draft.id
        ? await learnApi<CourseSection>(`courses/${course.id}/sections/${draft.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : await learnApi<CourseSection>(`courses/${course.id}/sections`, { method: 'POST', body: JSON.stringify(payload) });
      const normalized = formatSection(saved);
      setSections((current) => draft.id
        ? current.map((section) => section.id === normalized.id ? normalized : section)
        : [...current, normalized]);
      setDraft(null);
      setNotice(draft.id ? 'Abschnitt aktualisiert.' : 'Abschnitt hinzugefügt.');
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Der Abschnitt konnte nicht gespeichert werden.');
    } finally {
      setSectionPending(false);
    }
  }

  async function reorder(sourceIndex: number, direction: -1 | 1) {
    const targetIndex = sourceIndex + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const previous = sections;
    const next = [...sections];
    [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
    setSections(next.map((section, sortOrder) => ({ ...section, sortOrder })));
    setSectionPending(true);
    setNotice(null);
    try {
      const payload = await learnApi<{ sections: CourseSection[] }>(`courses/${course.id}/sections/reorder`, {
        method: 'POST',
        body: JSON.stringify({ sectionIds: next.map((section) => section.id) }),
      });
      setSections(payload.sections.map(formatSection));
      setNotice('Reihenfolge gespeichert.');
      router.refresh();
    } catch (error) {
      setSections(previous);
      setNotice(error instanceof Error ? error.message : 'Die Reihenfolge konnte nicht gespeichert werden.');
    } finally {
      setSectionPending(false);
    }
  }

  async function removeSection(section: EditableSection) {
    if (!course.canManage || !window.confirm(`„${section.title}“ wirklich entfernen? Die zugehörigen Vokabeln bleiben im Kurs erhalten.`)) return;
    setSectionPending(true);
    setNotice(null);
    try {
      await learnApi(`courses/${course.id}/sections/${section.id}`, { method: 'DELETE' });
      setSections((current) => current.filter((item) => item.id !== section.id).map((item, sortOrder) => ({ ...item, sortOrder })));
      if (draft?.id === section.id) setDraft(null);
      setNotice('Abschnitt entfernt. Vokabeln wurden nicht gelöscht.');
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Der Abschnitt konnte nicht entfernt werden.');
    } finally {
      setSectionPending(false);
    }
  }

  return <div className="course-studio">
    <section className="course-studio__hero panel">
      <div><p className="section-kicker">Kursstudio</p><h1>{course.title}</h1><p>Baue einen klaren Lernpfad aus eigenen Lektionen, Grammatik, Vokabular und gezielten Übungen. Inhalte bleiben auf dem Server.</p></div>
      <div className="course-studio__hero-meta"><span><FileText size={17} /> {sectionCountLabel}</span><span>{course.canManage ? 'Du verwaltest diesen Kurs' : 'Du bearbeitest die Inhalte'}</span></div>
    </section>

    {notice && <div className="inline-notice" role="status"><CheckCircle2 size={16} /> {notice}<button type="button" onClick={() => setNotice(null)} aria-label="Hinweis schließen">×</button></div>}

    <div className="course-studio__grid">
      <section className="panel course-studio__path"><div className="panel-heading"><div><p className="section-kicker">Lernpfad</p><h2>Eigene Abschnitte</h2></div><button className="button button--dark button--small" type="button" disabled={sectionPending || sections.length >= 100} onClick={() => openDraft()}><Plus size={15} /> Abschnitt</button></div>
        {sections.length ? <ol className="studio-section-list">{sections.map((section, index) => <li key={section.id}><span className="studio-section-list__number"><GripVertical size={16} /> {index + 1}</span><div><b>{section.title}</b><small>{section.summary || section.type}</small></div><div className="studio-section-list__actions"><button type="button" className="icon-button" aria-label={`${section.title} nach oben verschieben`} disabled={sectionPending || index === 0} onClick={() => reorder(index, -1)}><ArrowUp size={16} /></button><button type="button" className="icon-button" aria-label={`${section.title} nach unten verschieben`} disabled={sectionPending || index === sections.length - 1} onClick={() => reorder(index, 1)}><ArrowDown size={16} /></button><button type="button" className="button button--soft button--small" disabled={sectionPending} onClick={() => openDraft(section)}>Bearbeiten</button>{course.canManage && <button type="button" className="icon-button icon-button--danger" aria-label={`${section.title} entfernen`} disabled={sectionPending} onClick={() => removeSection(section)}><Trash2 size={16} /></button>}</div></li>)}</ol> : <div className="inline-empty"><FileText size={18} /><div><b>Der Lernpfad beginnt hier.</b><p>Füge die erste Lektion hinzu und formuliere danach Vokabeln und Übungen aus deinem eigenen Inhalt.</p></div></div>}
      </section>

      <aside className="course-studio__side">{course.canManage && <form className="panel course-studio__metadata" onSubmit={saveMetadata}><p className="section-kicker">Kursrahmen</p><h2>Grunddaten</h2><label>Kursname<input name="title" defaultValue={course.title} maxLength={160} required /></label><label>Beschreibung<textarea name="summary" defaultValue={course.description} rows={4} maxLength={2000} /></label><div className="form-grid"><label>Fach<input name="subject" defaultValue={course.category} maxLength={120} /></label><label>Sprache<input name="language" defaultValue={course.language} maxLength={80} /></label><label>Niveau<input name="level" defaultValue={course.level} maxLength={50} /></label></div><button className="button button--dark" type="submit" disabled={metadataPending}><Save size={16} /> {metadataPending ? 'Speichert…' : 'Grunddaten speichern'}</button></form>}
        {course.canManage && <section className="panel course-studio__sharing"><p className="section-kicker">Freigabe</p><h2>Mit einer Person teilen</h2><p className="course-studio__sharing-hint">Nur diese Person erhält Zugriff — unabhängig von Teams. Der Kurs bleibt sonst privat.</p>
          <form onSubmit={shareWithPerson} className="course-studio__share-form"><label className="sr-only" htmlFor="share-username">Benutzername</label><input id="share-username" value={shareUsername} onChange={(event) => setShareUsername(event.target.value)} placeholder="Benutzername" maxLength={100} required /><select value={sharePermission} onChange={(event) => setSharePermission(event.target.value as 'VIEW' | 'EDIT')} aria-label="Berechtigung"><option value="VIEW">Nur ansehen</option><option value="EDIT">Bearbeiten</option></select><button type="submit" className="button button--dark button--small" disabled={sharePending || !shareUsername.trim()}><UserPlus size={15} /> Teilen</button></form>
          {access.length > 0 ? <ul className="course-studio__share-list">{access.map((entry) => <li key={entry.stableUid}><span>{entry.username}</span><span className="course-studio__share-permission">{entry.permission === 'EDIT' ? 'Bearbeiten' : entry.permission === 'MANAGE' ? 'Verwalten' : 'Ansehen'}</span><button type="button" className="icon-button icon-button--danger" aria-label={`Zugriff für ${entry.username} entfernen`} disabled={sharePending} onClick={() => revokeAccess(entry)}><Trash2 size={15} /></button></li>)}</ul> : <p className="course-studio__share-empty">Noch mit niemandem einzeln geteilt.</p>}
        </section>}
        <section className="panel course-studio__guidance"><p className="section-kicker">Qualitätscheck</p><h2>Vor dem Veröffentlichen</h2><ul><li>Jeder Abschnitt hat ein konkretes Lernziel.</li><li>Grammatik wird direkt mit Beispielen angewendet.</li><li>Quizantworten werden redaktionell geprüft.</li><li>Die Reihenfolge ergibt einen nachvollziehbaren Lernweg.</li></ul></section></aside>
    </div>

    {draft && <section className="panel course-studio__editor"><div className="panel-heading"><div><p className="section-kicker">{draft.id ? 'Abschnitt bearbeiten' : 'Neuer Abschnitt'}</p><h2>{draft.id ? draft.title || 'Abschnitt' : 'Inhalt strukturieren'}</h2></div><button type="button" className="icon-button" aria-label="Editor schließen" disabled={sectionPending} onClick={() => setDraft(null)}><X size={18} /></button></div><form onSubmit={saveSection}><div className="form-grid"><label>Titel<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={200} required autoFocus /></label><label>Typ<select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}><option value="LESSON">Lektion</option><option value="GRAMMAR">Grammatik</option><option value="VOCABULARY">Vokabular</option><option value="QUIZ">Übung</option></select></label></div><label>Kurzbeschreibung<textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} rows={3} maxLength={2000} /></label><label>Eigener Lerninhalt<textarea value={contentText} onChange={(event) => setContentText(event.target.value)} rows={12} placeholder="Ein Gedanke pro Absatz. Dieser Text erscheint sicher als lesbarer Kursinhalt." /></label><div className="course-studio__editor-actions"><button type="button" className="button button--plain" disabled={sectionPending} onClick={() => setDraft(null)}>Abbrechen</button><button type="submit" className="button button--dark" disabled={sectionPending || !draft.title.trim()}><Save size={16} /> {sectionPending ? 'Speichert…' : 'Abschnitt speichern'}</button></div></form></section>}
  </div>;
}
