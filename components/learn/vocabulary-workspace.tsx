'use client';

import { CheckCircle2, CircleAlert, Plus, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

import { learnApi } from '@/lib/client/api';
import type { Course, VocabularyItem } from '@/lib/types';

const states = { new: 'Neu', learning: 'Lernt gerade', due: 'Fällig', mastered: 'Sitzt', mistake: 'Nochmal üben' } as const;

type VocabularyResponse = {
  id: string;
  courseId: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  article?: string;
  partOfSpeech?: string;
  notes?: string;
  verificationStatus?: string;
  contextSentence?: string;
  readyForQuiz?: boolean;
};

function languageCode(language: string) {
  const normalized = language.toLocaleLowerCase('de-DE');
  if (normalized.includes('ital')) return 'it';
  if (normalized.includes('engl')) return 'en';
  if (normalized.includes('deutsch')) return 'de';
  return normalized.slice(0, 20) || 'und';
}

function fromResponse(entry: VocabularyResponse): VocabularyItem {
  const validation = entry.verificationStatus === 'VERIFIED'
    ? 'verified'
    : entry.verificationStatus === 'FLAGGED'
      ? 'manual'
      : 'pending';
  return {
    id: entry.id,
    courseId: entry.courseId,
    source: entry.sourceText,
    sourceLanguage: entry.sourceLanguage,
    targetLanguage: entry.targetLanguage,
    article: entry.article || undefined,
    partOfSpeech: entry.partOfSpeech || undefined,
    contextSentence: entry.contextSentence,
    note: entry.notes || undefined,
    state: validation === 'verified' ? 'learning' : 'new',
    validation,
    readyForQuiz: Boolean(entry.readyForQuiz),
  };
}

export function VocabularyWorkspace({
  initialItems,
  courses,
  defaultCourseId,
  editable = true,
}: {
  initialItems: VocabularyItem[];
  courses: Course[];
  defaultCourseId?: string;
  editable?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(defaultCourseId || courses[0]?.id || '');
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const filtered = useMemo(() => items.filter((item) => {
    if (selectedCourseId && item.courseId !== selectedCourseId) return false;
    const haystack = `${item.article || ''} ${item.source} ${item.contextSentence || ''}`.toLocaleLowerCase('de');
    return haystack.includes(query.toLocaleLowerCase('de'));
  }), [items, query, selectedCourseId]);

  async function addWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourse) return;
    const data = new FormData(event.currentTarget);
    const sourceText = String(data.get('sourceText') || '').trim();
    if (!sourceText) return;

    setPending(true);
    setNotice(null);
    try {
      const created = await learnApi<VocabularyResponse>('vocabulary', {
        method: 'POST',
        body: JSON.stringify({
          courseId: selectedCourse.id,
          sourceLanguage: languageCode(selectedCourse.language),
          targetLanguage: 'de',
          sourceText,
        }),
      });
      setItems((current) => [fromResponse(created), ...current]);
      setShowForm(false);
      setNotice('Wort gespeichert. Der Server hat einen Satz in der Kurssprache ergänzt.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Das Wort konnte nicht gespeichert werden.');
    } finally {
      setPending(false);
    }
  }

  return <div className="vocabulary-workspace">
    <div className="vocabulary-toolbar">
      <label className="search-field"><Search size={18} /><span className="sr-only">Vokabeln durchsuchen</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Wort oder Satz suchen" /></label>
      {courses.length > 1 && <label className="course-select"><span className="sr-only">Kurs auswählen</span><select value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>{courses.map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}</select></label>}
      <button className="button button--soft" type="button" aria-label="Vokabelfilter"><SlidersHorizontal size={16} /> Filtern</button>
      {editable && <button className="button button--dark" type="button" disabled={!selectedCourse} onClick={() => setShowForm(true)}><Plus size={16} /> Wort hinzufügen</button>}
    </div>
    {notice && <div className="inline-notice" role="status"><Sparkles size={16} /> {notice}<button type="button" onClick={() => setNotice(null)} aria-label="Hinweis schließen">×</button></div>}
    {showForm && <section className="word-form panel"><div><p className="section-kicker">Neuer Eintrag</p><h2>Ein Wort genügt.</h2><p>Der Server speichert das Wort und erzeugt einen Kontextsatz in <b>{selectedCourse?.language || 'der Kurssprache'}</b>. Erst redaktionell freigegebene Antworten gelangen in ein Quiz.</p></div><form onSubmit={addWord}><label>Wort<input name="sourceText" lang={languageCode(selectedCourse?.language || '')} placeholder={selectedCourse?.language.includes('Italien') ? 'z. B. stazione' : selectedCourse?.language.includes('Engl') ? 'e. g. delay' : 'Wort eingeben'} required autoFocus /></label><div className="word-form__actions"><button type="button" className="button button--plain" disabled={pending} onClick={() => setShowForm(false)}>Abbrechen</button><button type="submit" className="button button--dark" disabled={pending}><CheckCircle2 size={16} /> {pending ? 'Speichert…' : 'Speichern'}</button></div></form></section>}
    <div className="vocabulary-table" role="table" aria-label="Vokabelliste"><div className="vocabulary-table__head" role="row"><span>Wort</span><span>Satz im Kontext</span><span>Stand</span></div>{filtered.map((item) => <div className="vocabulary-row" role="row" key={item.id}><div><b lang={item.sourceLanguage}>{item.article && <em>{item.article}</em>} {item.source}</b><small>{item.partOfSpeech || selectedCourse?.language || '—'}</small></div><div><span lang={item.sourceLanguage}>{item.contextSentence || 'Kontext wird vorbereitet.'}</span>{!item.readyForQuiz && <small>Wird für ein Quiz erst nach redaktioneller Antwortfreigabe genutzt.</small>}</div><div><span className={`state-badge state-badge--${item.state}`}>{states[item.state]}</span>{item.validation && <small className="validation"><CheckCircle2 size={13} /> {item.validation === 'verified' ? 'geprüft' : item.validation === 'pending' ? 'Antwort wird ergänzt' : 'manuell prüfen'}</small>}</div></div>)}</div>
    {!filtered.length && <div className="catalog-no-results"><CircleAlert size={23} /><h2>{items.length ? 'Keine Vokabel gefunden' : 'Noch keine Wörter in diesem Kurs'}</h2><p>{items.length ? 'Ändere deine Suche oder wähle einen anderen Kurs.' : 'Füge ein Wort hinzu. Der Kontextsatz kommt sicher vom Server.'}</p>{editable && selectedCourse && <button type="button" className="button button--soft" onClick={() => setShowForm(true)}>Wort hinzufügen</button>}</div>}
  </div>;
}
