'use client';

import { BrainCircuit, CheckCircle2, CircleAlert, PencilLine, Plus, Search, SearchCheck, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { learnApi } from '@/lib/client/api';
import type { Course, VocabularyItem } from '@/lib/types';
import { useLearnPreferences } from '@/components/providers/learn-preferences';
import { VocabularyQuickAddForm, type VocabularyResponse } from '@/components/learn/vocabulary-quick-add';

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
    canEdit: entry.canEdit,
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
  const { t } = useLearnPreferences();
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(defaultCourseId || courses[0]?.id || '');
  const [notice, setNotice] = useState<string | null>(null);
  const [answerEntryId, setAnswerEntryId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [answerPending, setAnswerPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const canAuthorCourse = editable && Boolean(selectedCourse?.canEdit);
  const filtered = useMemo(() => items.filter((item) => {
    if (selectedCourseId && item.courseId !== selectedCourseId) return false;
    const haystack = `${item.article || ''} ${item.source} ${item.contextSentence || ''}`.toLocaleLowerCase('de');
    return haystack.includes(query.toLocaleLowerCase('de'));
  }), [items, query, selectedCourseId]);

  function handleWordSaved(entry: VocabularyResponse) {
    setItems((current) => [{ ...fromResponse(entry), canEdit: true }, ...current]);
  }

  function startAnswerEditor(item: VocabularyItem) {
    setAnswerEntryId(item.id);
    setAnswerText('');
    setSuggestion(null);
    setNotice(null);
    // Best-effort, silent: pre-fill a dictionary suggestion the moment the
    // editor opens so most words need only a review + save, not an extra
    // click. Stays advisory only — the human still has to press "Save answer"
    // before it becomes the quiz-grading answer (see CLAUDE.md's dictionary
    // policy). Silently does nothing if the provider is disabled/unreachable.
    void lookupSuggestion(item, { silent: true });
  }

  function replaceItem(entry: VocabularyResponse) {
    setItems((current) => current.map((item) => item.id === entry.id
      ? { ...fromResponse(entry), canEdit: item.canEdit }
      : item));
  }

  async function lookupSuggestion(item: VocabularyItem, options: { silent?: boolean } = {}) {
    if (!options.silent) {
      setAnswerPending(true);
      setNotice(null);
    }
    try {
      const payload = await learnApi<{ suggestion: { translation: string; provider: string; cached: boolean } }>('vocabulary/lookup', {
        method: 'POST',
        body: JSON.stringify({
          courseId: item.courseId,
          sourceLanguage: item.sourceLanguage,
          targetLanguage: item.targetLanguage || 'de',
          sourceText: item.source,
        }),
      });
      setSuggestion(payload.suggestion.translation);
      setAnswerText((current) => current || payload.suggestion.translation);
      if (!options.silent) setNotice(t('vocab.suggestionLoaded', { provider: payload.suggestion.provider }));
    } catch (error) {
      // A silent, editor-open-triggered attempt fails quietly (e.g. the
      // dictionary provider is disabled by default) — only an explicit
      // "Get suggestion" click surfaces the error.
      if (!options.silent) setNotice(error instanceof Error ? error.message : t('vocab.suggestionError'));
    } finally {
      if (!options.silent) setAnswerPending(false);
    }
  }

  async function saveAnswer(item: VocabularyItem) {
    const targetText = answerText.trim();
    if (!targetText) return;
    setAnswerPending(true);
    setNotice(null);
    try {
      const entry = await learnApi<VocabularyResponse>(`vocabulary/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ targetText }),
      });
      replaceItem(entry);
      setAnswerEntryId(null);
      setSuggestion(null);
      // Verify immediately, in the same action, rather than leaving it as a
      // separate button someone has to remember to press afterward — this
      // is still advisory only (see verifyAnswer below), never a silent
      // grading change, but the check itself is no longer skippable.
      await verifyAnswer({ ...item, ...fromResponse(entry) }, { savedNotice: true });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('vocab.answerSaveError'));
    } finally {
      setAnswerPending(false);
    }
  }

  async function verifyAnswer(item: VocabularyItem, options: { savedNotice?: boolean } = {}) {
    if (!options.savedNotice) { setAnswerPending(true); setNotice(null); }
    try {
      const payload = await learnApi<{
        entry: VocabularyResponse;
        verification: { matches: boolean; suggestion: { translation: string; provider: string } };
      }>(`vocabulary/${item.id}/verify`, { method: 'POST' });
      replaceItem(payload.entry);
      const verifyNotice = payload.verification.matches
        ? t('vocab.answerMatches', { provider: payload.verification.suggestion.provider })
        : t('vocab.answerDiffers', { suggestion: payload.verification.suggestion.translation });
      setNotice(options.savedNotice ? `${t('vocab.answerSaved')} ${verifyNotice}` : verifyNotice);
    } catch (error) {
      // The dictionary provider may simply be disabled/unreachable (see
      // learnDictionary.ts) — the answer itself is already saved either
      // way, so this is informational, never a reason to alarm the author.
      setNotice(options.savedNotice ? t('vocab.answerSaved') : (error instanceof Error ? error.message : t('vocab.answerCheckError')));
    } finally {
      if (!options.savedNotice) setAnswerPending(false);
    }
  }

  async function deleteWord(item: VocabularyItem) {
    if (!window.confirm(t('vocab.deleteConfirm', { word: item.source }))) return;
    setDeletingId(item.id);
    setNotice(null);
    try {
      await learnApi(`vocabulary/${item.id}`, { method: 'DELETE' });
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setNotice(t('vocab.deleted'));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('vocab.deleteError'));
    } finally {
      setDeletingId(null);
    }
  }

  return <div className="vocabulary-workspace">
    <div className="vocabulary-toolbar">
      <label className="search-field"><Search size={18} /><span className="sr-only">{t('vocab.search')}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('vocab.searchPlaceholder')} /></label>
      {courses.length > 1 && <label className="course-select"><span className="sr-only">{t('vocab.courseSelect')}</span><select value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>{courses.map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}</select></label>}
      {selectedCourse && <Link href={`/practice?courseId=${selectedCourse.id}`} className="button button--soft"><BrainCircuit size={16} /> {t('vocab.trainThis')}</Link>}
      {canAuthorCourse && <button className="button button--dark" type="button" onClick={() => setShowForm(true)}><Plus size={16} /> {t('vocab.add')}</button>}
    </div>

    {notice && <div className="inline-notice" role="status"><Sparkles size={16} /> {notice}<button type="button" onClick={() => setNotice(null)} aria-label={t('vocab.dismiss')}>×</button></div>}

    {showForm && selectedCourse && <VocabularyQuickAddForm
      courses={[selectedCourse]}
      defaultCourseId={selectedCourse.id}
      onSaved={handleWordSaved}
      onCancel={() => setShowForm(false)}
    />}

    <div className="vocabulary-table" role="table" aria-label={t('vocab.table')}>
      <div className="vocabulary-table__head" role="row"><span>{t('vocab.word')}</span><span>{t('vocab.context')}</span><span>{t('vocab.status')}</span></div>
      {filtered.map((item) => {
        const canEditItem = editable && item.canEdit !== false;
        const isEditing = answerEntryId === item.id;
        return <div className="vocabulary-row" role="row" key={item.id}>
          <div><b lang={item.sourceLanguage}>{item.article && <em>{item.article}</em>} {item.source}</b><small>{item.partOfSpeech || selectedCourse?.language || '—'}</small></div>
          <div><span lang={item.sourceLanguage}>{item.contextSentence || t('vocab.contextPending')}</span>{!item.readyForQuiz && <small>{t('vocab.answerMissing')}</small>}</div>
          <div className="vocabulary-row__status"><span className={`state-badge state-badge--${item.state}`}>{t(`vocab.state.${item.state}`)}</span>{item.validation && <small className="validation"><CheckCircle2 size={13} /> {item.validation === 'verified' ? t('vocab.verified') : item.validation === 'pending' ? item.readyForQuiz ? t('vocab.editorConfirmed') : t('vocab.answerRequired') : t('vocab.manualReview')}</small>}{canEditItem && !item.readyForQuiz && <button type="button" className="text-link" onClick={() => startAnswerEditor(item)}><PencilLine size={14} /> {t('vocab.addAnswer')}</button>}{canEditItem && item.readyForQuiz && <button type="button" className="text-link" disabled={answerPending} onClick={() => verifyAnswer(item)}><ShieldCheck size={14} /> {t('vocab.verify')}</button>}{canEditItem && <button type="button" className="text-link text-link--danger" disabled={deletingId === item.id} onClick={() => void deleteWord(item)} aria-label={t('vocab.deleteAria', { word: item.source })}><Trash2 size={14} /> {deletingId === item.id ? t('vocab.deleting') : t('vocab.delete')}</button>}</div>
          {isEditing && <div className="vocabulary-answer-editor"><label>{t('vocab.targetAnswer')}<input value={answerText} onChange={(event) => setAnswerText(event.target.value)} placeholder={t('vocab.targetPlaceholder')} autoFocus /></label><div><button type="button" className="button button--soft button--small" disabled={answerPending} onClick={() => lookupSuggestion(item)}><SearchCheck size={15} /> {answerPending ? t('vocab.checking') : t('vocab.getSuggestion')}</button><button type="button" className="button button--dark button--small" disabled={answerPending || !answerText.trim()} onClick={() => saveAnswer(item)}><CheckCircle2 size={15} /> {t('vocab.saveAnswer')}</button><button type="button" className="button button--plain button--small" disabled={answerPending} onClick={() => { setAnswerEntryId(null); setSuggestion(null); }}>{t('vocab.cancel')}</button></div>{suggestion && <small>{t('vocab.suggestionPrefix')} „{suggestion}“ — {t('vocab.suggestionReview')}</small>}</div>}
        </div>;
      })}
    </div>

    {!filtered.length && <div className="catalog-no-results"><CircleAlert size={23} /><h2>{items.length ? t('vocab.noneFound') : t('vocab.noneInCourse')}</h2><p>{items.length ? t('vocab.changeSearch') : canAuthorCourse ? t('vocab.addFirst') : t('vocab.readOnly')}</p>{canAuthorCourse && <button type="button" className="button button--soft" onClick={() => setShowForm(true)}>{t('vocab.add')}</button>}</div>}
  </div>;
}
