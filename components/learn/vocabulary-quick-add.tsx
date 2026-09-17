'use client';

import { BookOpenText, CheckCircle2, CircleAlert, Loader2, Plus, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';

import { learnApi } from '@/lib/client/api';
import type { Course } from '@/lib/types';
import { useLearnPreferences } from '@/components/providers/learn-preferences';

// Shared by the per-course vocabulary page and the global quick-add modal
// (see QuickAddVocabularyButton) so both surfaces validate, suggest, and
// save a word through the exact same path — one behavior, two entry points.
export type VocabularyResponse = {
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

export type QuickAddCourse = Pick<Course, 'id' | 'title' | 'language' | 'sourceLanguage'>;

type WordValidationReasonCode = 'no_vowel' | 'triple_repeat' | 'consonant_run' | 'near_duplicate' | 'no_issue_found';

type WordSuggestion = { translation: string; provider: string };

export type WordValidation = {
  provider: 'dictionaryapi' | 'local';
  language: string;
  status: 'verified' | 'not_found' | 'manual' | 'unavailable';
  definition: string | null;
  example: string | null;
  partOfSpeech: string | null;
  cached: boolean;
  stale: boolean;
  message: string | null;
  reasonCode: WordValidationReasonCode | null;
  similarWord: string | null;
};

export function languageCode(language: string) {
  const normalized = language.toLocaleLowerCase('de-DE');
  if (normalized.includes('ital')) return 'it';
  if (normalized.includes('engl')) return 'en';
  if (normalized.includes('deutsch')) return 'de';
  return normalized.slice(0, 20) || 'und';
}

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

/**
 * The whole "one word is enough" add flow: pick a course (only shown when
 * there is a real choice), type the word, get an automatic spelling check +
 * translation suggestion as you type, save. After a save the form clears
 * itself and stays open so several words can be entered back to back
 * without reopening it each time — closing is always a separate, explicit
 * action (onCancel).
 */
export function VocabularyQuickAddForm({
  courses,
  defaultCourseId,
  onSaved,
  onCancel,
  autoFocus = true,
}: {
  courses: QuickAddCourse[];
  defaultCourseId?: string;
  onSaved: (entry: VocabularyResponse, courseId: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  const { t } = useLearnPreferences();
  const [selectedCourseId, setSelectedCourseId] = useState(defaultCourseId || courses[0]?.id || '');
  const [draftWord, setDraftWord] = useState('');
  const [draftAnswer, setDraftAnswer] = useState('');
  const [draftValidation, setDraftValidation] = useState<WordValidation | null>(null);
  const [draftValidationPending, setDraftValidationPending] = useState(false);
  const [draftSuggestion, setDraftSuggestion] = useState<WordSuggestion | null>(null);
  const [draftSuggestionPending, setDraftSuggestionPending] = useState(false);
  const [draftFlagAcknowledged, setDraftFlagAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);

  useEffect(() => {
    if (!selectedCourse) return;
    const sourceText = draftWord.trim();
    if (!sourceText) return;
    const courseId = selectedCourse.id;
    const sourceLanguage = languageCode(selectedCourse.language);
    const targetLanguage = languageCode(selectedCourse.sourceLanguage);
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
          setDraftAnswer((current) => current || payload.suggestion.translation);
        })
        .catch(() => { /* same fail-open policy */ })
        .finally(() => { if (!cancelled) setDraftSuggestionPending(false); });
    }, 700);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [draftWord, selectedCourseId, selectedCourse]);

  async function runValidation(course: QuickAddCourse, sourceText: string): Promise<WordValidation | null> {
    try {
      const payload = await learnApi<{ validation: WordValidation }>('vocabulary/validate', {
        method: 'POST',
        body: JSON.stringify({ courseId: course.id, sourceLanguage: languageCode(course.language), sourceText }),
      });
      return payload.validation;
    } catch {
      return null;
    }
  }

  async function addWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const course = selectedCourse;
    if (!course) return;
    const sourceText = draftWord.trim();
    if (!sourceText) return;
    const targetText = draftAnswer.trim();

    setPending(true);
    setNotice(null);
    try {
      if (!draftFlagAcknowledged) {
        const validation = draftValidation ?? await runValidation(course, sourceText);
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
          courseId: course.id,
          sourceLanguage: languageCode(course.language),
          targetLanguage: languageCode(course.sourceLanguage),
          sourceText,
          targetText,
        }),
      });

      let finalEntry = created;
      let verifyNoticeSuffix = '';
      if (targetText) {
        try {
          const payload = await learnApi<{
            entry: VocabularyResponse;
            verification: { matches: boolean; suggestion: { translation: string; provider: string } };
          }>(`vocabulary/${created.id}/verify`, { method: 'POST' });
          finalEntry = payload.entry;
          verifyNoticeSuffix = ` ${payload.verification.matches
            ? t('vocab.answerMatches', { provider: payload.verification.suggestion.provider })
            : t('vocab.answerDiffers', { suggestion: payload.verification.suggestion.translation })}`;
        } catch {
          // Advisory only — the word and answer are already saved either way.
        }
      }

      onSaved(finalEntry, course.id);
      setSavedCount((count) => count + 1);
      setDraftWord('');
      setDraftAnswer('');
      setDraftValidation(null);
      setDraftSuggestion(null);
      setDraftFlagAcknowledged(false);
      setNotice(`${targetText ? t('vocab.savedWithAnswer') : t('vocab.saved')}${verifyNoticeSuffix}`);
      wordInputRef.current?.focus();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('vocab.saveError'));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="word-form panel">
      <div>
        <p className="section-kicker">{t('vocab.newEntry')}</p>
        <h2>{t('vocab.oneWord')}</h2>
        <p>{t('vocab.oneWordBody')}</p>
      </div>
      <form onSubmit={addWord}>
        {courses.length > 1 && <label className="word-form__course-picker">
          {t('vocab.chooseCourseToAdd')}
          <select value={selectedCourseId} onChange={(event) => { setSelectedCourseId(event.target.value); setDraftValidation(null); setDraftSuggestion(null); setDraftFlagAcknowledged(false); }}>
            {courses.map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}
          </select>
        </label>}
        <label>
          {t('vocab.word')}
          <span className="word-form__input-wrap">
            <input
              ref={wordInputRef}
              name="sourceText"
              value={draftWord}
              onChange={(event) => { setDraftWord(event.target.value); setDraftValidation(null); setDraftSuggestion(null); setDraftFlagAcknowledged(false); }}
              lang={languageCode(selectedCourse?.language || '')}
              placeholder={selectedCourse?.language.includes('Italien') ? 'es. stazione' : selectedCourse?.language.includes('Engl') ? 'e.g. delay' : t('vocab.wordPlaceholder')}
              required
              autoFocus={autoFocus}
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
        {notice && !(draftValidation && hasNoteworthyDetail(draftValidation)) && <div className="inline-notice" role="status"><Sparkles size={16} /> {notice}</div>}
        <div className="word-form__actions">
          <button type="button" className="button button--plain" disabled={pending} onClick={onCancel}>{savedCount > 0 ? t('vocab.done') : t('vocab.cancel')}</button>
          <button type="submit" className={draftFlagAcknowledged ? 'button button--soft' : 'button button--dark'} disabled={pending || !selectedCourse}><CheckCircle2 size={16} /> {pending ? t('vocab.saving') : draftFlagAcknowledged ? t('vocab.saveAnyway') : t('vocab.save')}</button>
        </div>
      </form>
    </section>
  );
}

type RawCourseOption = {
  id: string;
  title: string;
  language?: string;
  subject?: string;
  permissions?: { canEdit?: boolean };
};

/**
 * The "add a word from anywhere" entry point: a single button, always in
 * the same place (top bar on desktop, navigation overlay on mobile), that
 * opens a small dialog with the exact same form as the course vocabulary
 * page. This is the direct answer to "where can I add a word?" — the
 * answer is always "here", regardless of which screen you are on.
 */
export function QuickAddVocabularyButton({ variant = 'topbar', onNavigate }: { variant?: 'topbar' | 'menu'; onNavigate?: () => void }) {
  const { t } = useLearnPreferences();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [courses, setCourses] = useState<QuickAddCourse[] | null>(null);
  const [addedCount, setAddedCount] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openDialog() {
    onNavigate?.();
    setOpen(true);
    setAddedCount(0);
    setLoading(true);
    setError(false);
    learnApi<{ courses: RawCourseOption[] }>('courses')
      .then((payload) => {
        setCourses(payload.courses
          .filter((course) => course.permissions?.canEdit)
          .map((course) => ({
            id: course.id,
            title: course.title,
            language: course.language || course.subject || t('vocab.wordPlaceholder'),
            // The product currently only supports German-answer quiz courses
            // end to end (see mapCourse in lib/server/data.ts) — matched here
            // rather than invented separately for the client-only fetch path.
            sourceLanguage: 'Deutsch',
          })));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  function closeDialog() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusFirst = window.setTimeout(() => dialog?.querySelector<HTMLElement>(focusableSelector)?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusFirst);
      document.removeEventListener('keydown', onKeyDown);
      (previousFocus ?? trigger)?.focus();
    };
  }, [open]);

  function handleSaved() {
    setAddedCount((count) => count + 1);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={variant === 'topbar' ? 'button button--dark button--small' : 'workspace-menu__item'}
        onClick={openDialog}
      >
        <Plus size={16} /> {t('vocab.quickAdd')}
      </button>
      {open && (
        <div className="quick-add-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
          <div className="quick-add-dialog panel" role="dialog" aria-modal="true" aria-label={t('vocab.quickAddTitle')} ref={dialogRef} data-lenis-prevent>
            <div className="quick-add-dialog__head">
              <div><p className="section-kicker">{t('vocab.quickAdd')}</p><h2>{t('vocab.quickAddTitle')}{addedCount > 0 && <span className="quick-add-dialog__count">{addedCount}</span>}</h2></div>
              <button type="button" className="icon-button" aria-label={t('vocab.close')} onClick={closeDialog}><X size={18} /></button>
            </div>
            {loading && <div className="inline-empty"><Loader2 size={18} className="spin" aria-hidden /><div><b>{t('vocab.loadingCourses')}</b></div></div>}
            {!loading && error && <div className="inline-empty"><CircleAlert size={18} /><div><b>{t('vocab.loadCoursesError')}</b></div></div>}
            {!loading && !error && courses && courses.length === 0 && (
              <div className="inline-empty">
                <BookOpenText size={18} />
                <div>
                  <b>{t('vocab.noEditableCourses')}</b>
                  <p>{t('vocab.noEditableCoursesBody')}</p>
                  <Link href="/catalog" className="text-link" onClick={closeDialog}>{t('courses.openCatalog')}</Link>
                  {' · '}
                  <Link href="/create/course" className="text-link" onClick={closeDialog}>{t('action.createCourse')}</Link>
                </div>
              </div>
            )}
            {!loading && !error && courses && courses.length > 0 && (
              <VocabularyQuickAddForm courses={courses} onSaved={handleSaved} onCancel={closeDialog} autoFocus={false} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
