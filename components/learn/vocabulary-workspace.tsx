'use client';

import { CheckCircle2, CircleAlert, Loader2, PencilLine, Plus, Search, SearchCheck, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { learnApi } from '@/lib/client/api';
import type { Course, VocabularyItem } from '@/lib/types';
import { useLearnPreferences } from '@/components/providers/learn-preferences';

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
  canEdit?: boolean;
};

type WordValidationReasonCode = 'no_vowel' | 'triple_repeat' | 'consonant_run' | 'near_duplicate' | 'no_issue_found';

type WordSuggestion = { translation: string; provider: string };

type WordValidation = {
  provider: 'dictionaryapi' | 'local';
  language: string;
  status: 'verified' | 'not_found' | 'manual' | 'unavailable';
  definition: string | null;
  example: string | null;
  partOfSpeech: string | null;
  cached: boolean;
  stale: boolean;
  message: string | null;
  // Machine-readable outcome of the local, dependency-free spelling check
  // (see learnDictionary.ts on the backend) — translated client-side rather
  // than shown as the backend's raw English message. Null for a result that
  // came from the external dictionary API instead.
  reasonCode: WordValidationReasonCode | null;
  similarWord: string | null;
};

function localValidationReason(t: (key: string, vars?: Record<string, string>) => string, validation: WordValidation): string | null {
  switch (validation.reasonCode) {
    case 'no_vowel': return t('vocab.reasonNoVowel');
    case 'triple_repeat': return t('vocab.reasonTripleRepeat');
    case 'consonant_run': return t('vocab.reasonConsonantRun');
    case 'near_duplicate': return t('vocab.reasonNearDuplicate', { word: validation.similarWord ?? '' });
    case 'no_issue_found': return t('vocab.reasonNoIssueFound');
    default: return null;
  }
}

// A "looks fine" result (local check found nothing, or a plain dictionary
// hit with no extra content) collapses to a small status icon instead of a
// full notice block — only something actually worth reading (a flagged
// word, a definition/example, or a check that couldn't run) expands it.
function hasNoteworthyDetail(validation: WordValidation): boolean {
  return isBlockingFlag(validation)
    || validation.status === 'not_found'
    || validation.status === 'unavailable'
    || Boolean(validation.definition || validation.example);
}

// A flagged local check (typo-shaped spelling, or too close to an existing
// word) blocks saving on the first attempt — not a hard wall, since the
// heuristic can false-positive on a genuinely rare word, but a deliberate
// second click (draftFlagAcknowledged) rather than something silently
// skippable.
function isBlockingFlag(validation: WordValidation): boolean {
  return validation.provider === 'local' && validation.status === 'not_found';
}

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
  const [draftWord, setDraftWord] = useState('');
  const [draftAnswer, setDraftAnswer] = useState('');
  const [draftValidation, setDraftValidation] = useState<WordValidation | null>(null);
  const [draftValidationPending, setDraftValidationPending] = useState(false);
  const [draftSuggestion, setDraftSuggestion] = useState<WordSuggestion | null>(null);
  const [draftSuggestionPending, setDraftSuggestionPending] = useState(false);
  const [draftFlagAcknowledged, setDraftFlagAcknowledged] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(defaultCourseId || courses[0]?.id || '');
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
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

  function noticeKeyForValidation(validation: WordValidation): string {
    return validation.provider === 'local'
      ? (validation.status === 'not_found' ? 'vocab.wordLocalTypo' : 'vocab.wordLocalOk')
      : validation.status === 'verified'
        ? 'vocab.wordValidated'
        : validation.status === 'not_found'
          ? 'vocab.wordNotFound'
          : validation.status === 'unavailable'
            ? 'vocab.wordCheckOffline'
            : 'vocab.wordManualReview';
  }

  async function runValidation(sourceText: string): Promise<WordValidation | null> {
    if (!selectedCourse) return null;
    try {
      const payload = await learnApi<{ validation: WordValidation }>('vocabulary/validate', {
        method: 'POST',
        body: JSON.stringify({
          courseId: selectedCourse.id,
          sourceLanguage: languageCode(selectedCourse.language),
          sourceText,
        }),
      });
      return payload.validation;
    } catch {
      // A check that couldn't run must never block saving — same
      // fail-open policy as the backend's own "unavailable" outcome.
      return null;
    }
  }

  // Spelling check and translation suggestion both run automatically a
  // moment after the learner stops typing the source word, instead of
  // requiring a manual "check" click before every save. Only setTimeout is
  // called synchronously here; every setState happens inside a .then() off
  // a promise created inside that timeout callback, and `cancelled` guards
  // against a stale result landing after the word changed again or the
  // form closed — same debounce shape as the candidate search in
  // team-member-manager.tsx.
  useEffect(() => {
    if (!showForm) return;
    const course = courses.find((candidate) => candidate.id === selectedCourseId);
    if (!course) return;
    const sourceText = draftWord.trim();
    if (!sourceText) return;
    const courseId = course.id;
    const sourceLanguage = languageCode(course.language);
    const targetLanguage = languageCode(course.sourceLanguage);
    let cancelled = false;
    const handle = setTimeout(() => {
      setDraftValidationPending(true);
      learnApi<{ validation: WordValidation }>('vocabulary/validate', {
        method: 'POST',
        body: JSON.stringify({ courseId, sourceLanguage, sourceText }),
      })
        .then((payload) => { if (!cancelled) setDraftValidation(payload.validation); })
        .catch(() => { /* fail open — an unreachable check must never block typing */ })
        .finally(() => { if (!cancelled) setDraftValidationPending(false); });

      setDraftSuggestionPending(true);
      learnApi<{ suggestion: { translation: string; provider: string; cached: boolean } }>('vocabulary/lookup', {
        method: 'POST',
        body: JSON.stringify({ courseId, sourceLanguage, targetLanguage, sourceText }),
      })
        .then((payload) => {
          if (cancelled) return;
          setDraftSuggestion({ translation: payload.suggestion.translation, provider: payload.suggestion.provider });
          // Never overwrite text the learner already typed themselves —
          // just offer it as a "use suggestion" hint instead (see JSX).
          setDraftAnswer((current) => current || payload.suggestion.translation);
        })
        .catch(() => { /* same fail-open policy */ })
        .finally(() => { if (!cancelled) setDraftSuggestionPending(false); });
    }, 700);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [draftWord, showForm, selectedCourseId, courses]);

  async function addWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourse) return;
    const sourceText = draftWord.trim();
    if (!sourceText) return;
    const targetText = draftAnswer.trim();

    setPending(true);
    setNotice(null);
    try {
      if (!draftFlagAcknowledged) {
        // Reuse an already-completed debounced check for this exact text
        // when there is one; only fire a fresh one for fast typers/instant
        // submitters who outran the debounce.
        const validation = draftValidation ?? await runValidation(sourceText);
        if (validation) {
          setDraftValidation(validation);
          if (isBlockingFlag(validation)) {
            setDraftFlagAcknowledged(true);
            setNotice(t(noticeKeyForValidation(validation)));
            return;
          }
        }
      }

      const created = await learnApi<VocabularyResponse>('vocabulary', {
        method: 'POST',
        body: JSON.stringify({
          courseId: selectedCourse.id,
          sourceLanguage: languageCode(selectedCourse.language),
          // The learner's own base language (e.g. English learning Italian ->
          // targetLanguage 'en'), never a hardcoded language — this is what
          // makes an arbitrary pair like English<->Italian work, not just German.
          targetLanguage: languageCode(selectedCourse.sourceLanguage),
          sourceText,
          targetText,
        }),
      });
      setItems((current) => [{ ...fromResponse(created), canEdit: true }, ...current]);
      setShowForm(false);
      setDraftWord('');
      setDraftAnswer('');
      setDraftValidation(null);
      setDraftSuggestion(null);
      setDraftFlagAcknowledged(false);

      if (!targetText) {
        setNotice(t('vocab.saved'));
      } else {
        // Verify immediately, in the same save action, rather than leaving
        // it as a separate step the author has to remember later — still
        // advisory only (see verifyAnswer below), never a silent grading
        // change. The word and answer are already saved either way.
        try {
          const payload = await learnApi<{
            entry: VocabularyResponse;
            verification: { matches: boolean; suggestion: { translation: string; provider: string } };
          }>(`vocabulary/${created.id}/verify`, { method: 'POST' });
          replaceItem(payload.entry);
          const verifyNotice = payload.verification.matches
            ? t('vocab.answerMatches', { provider: payload.verification.suggestion.provider })
            : t('vocab.answerDiffers', { suggestion: payload.verification.suggestion.translation });
          setNotice(`${t('vocab.savedWithAnswer')} ${verifyNotice}`);
        } catch {
          setNotice(t('vocab.savedWithAnswer'));
        }
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('vocab.saveError'));
    } finally {
      setPending(false);
    }
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
      {canAuthorCourse && <button className="button button--dark" type="button" onClick={() => setShowForm(true)}><Plus size={16} /> {t('vocab.add')}</button>}
    </div>

    {notice && <div className="inline-notice" role="status"><Sparkles size={16} /> {notice}<button type="button" onClick={() => setNotice(null)} aria-label={t('vocab.dismiss')}>×</button></div>}

    {showForm && <section className="word-form panel">
      <div><p className="section-kicker">{t('vocab.newEntry')}</p><h2>{t('vocab.oneWord')}</h2><p>{t('vocab.oneWordBody')}</p></div>
      <form onSubmit={addWord}>
        <label>
          {t('vocab.word')}
          <span className="word-form__input-wrap">
            <input
              name="sourceText"
              value={draftWord}
              onChange={(event) => { setDraftWord(event.target.value); setDraftValidation(null); setDraftSuggestion(null); setDraftFlagAcknowledged(false); }}
              lang={languageCode(selectedCourse?.language || '')}
              placeholder={selectedCourse?.language.includes('Italien') ? 'es. stazione' : selectedCourse?.language.includes('Engl') ? 'e.g. delay' : t('vocab.wordPlaceholder')}
              required
              autoFocus
            />
            {draftValidationPending
              ? <><Loader2 size={15} className="word-form__status-icon spin" aria-hidden /><span className="sr-only">{t('vocab.checking')}</span></>
              : draftValidation && (isBlockingFlag(draftValidation)
                ? <><CircleAlert size={15} className="word-form__status-icon word-form__status-icon--warn" aria-hidden /><span className="sr-only">{t(noticeKeyForValidation(draftValidation))}</span></>
                : <><CheckCircle2 size={15} className="word-form__status-icon word-form__status-icon--ok" aria-hidden /><span className="sr-only">{t(noticeKeyForValidation(draftValidation))}</span></>)}
          </span>
        </label>
        <label>
          {t('vocab.targetAnswer')}
          <span className="word-form__input-wrap">
            <input value={draftAnswer} onChange={(event) => setDraftAnswer(event.target.value)} placeholder={t('vocab.targetPlaceholder')} />
            {draftSuggestionPending && <><Loader2 size={15} className="word-form__status-icon spin" aria-hidden /><span className="sr-only">{t('vocab.checking')}</span></>}
          </span>
          {draftSuggestion && draftSuggestion.translation !== draftAnswer.trim() && <small className="word-form__hint">{t('vocab.suggestionPrefix')} „{draftSuggestion.translation}“<button type="button" className="text-link" onClick={() => setDraftAnswer(draftSuggestion.translation)}>{t('vocab.useSuggestion')}</button></small>}
        </label>
        {draftValidation && hasNoteworthyDetail(draftValidation) && <div className="inline-notice" role="status"><Sparkles size={16} /><span><b>{t(noticeKeyForValidation(draftValidation))}</b>{draftValidation.partOfSpeech && <> · {draftValidation.partOfSpeech}</>}{draftValidation.definition && <><br />{draftValidation.definition}</>}{draftValidation.example && <><br /><em>“{draftValidation.example}”</em></>}{localValidationReason(t, draftValidation) && <><br />{localValidationReason(t, draftValidation)}</>}</span></div>}
        <div className="word-form__actions">
          <button type="button" className="button button--plain" disabled={pending} onClick={() => { setShowForm(false); setDraftWord(''); setDraftAnswer(''); setDraftValidation(null); setDraftSuggestion(null); setDraftFlagAcknowledged(false); }}>{t('vocab.cancel')}</button>
          <button type="submit" className={draftFlagAcknowledged ? 'button button--soft' : 'button button--dark'} disabled={pending}><CheckCircle2 size={16} /> {pending ? t('vocab.saving') : draftFlagAcknowledged ? t('vocab.saveAnyway') : t('vocab.save')}</button>
        </div>
      </form>
    </section>}

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
