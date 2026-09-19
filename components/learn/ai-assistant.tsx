'use client';

import { FileText, Loader2, Mic, MessageCircle, Menu, Paperclip, Plus, Send, Trash2, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

import { learnApi } from '@/lib/client/api';
import { useLearnPreferences } from '@/components/providers/learn-preferences';

interface AiAttachment {
  id: string;
  kind: string;
  mimeType: string;
  filename: string;
  byteSize: number;
  content: string;
}

interface AiMessage {
  id: string;
  role: string;
  content: string;
  attachments?: AiAttachment[];
}

interface ConversationSummary {
  id: string;
  title: string;
  lastMessageAt: string | null;
  createdAt: string;
}

interface PendingAttachment {
  filename: string;
  dataBase64: string;
  isImage: boolean;
  previewUrl?: string;
}

const MAX_ATTACHMENTS = 3;
// Soft client-side guard only, purely for fast feedback — the backend's
// admin-configured LearnAiConfig.uploadMaxBytes is the real, authoritative
// limit and is re-checked against the file's actual decoded bytes there.
const CLIENT_SOFT_MAX_BYTES = 8 * 1024 * 1024;

// Minimal shape of the browser's (non-standard, Chromium/Safari-only) Web
// Speech API — not in TypeScript's DOM lib, and not worth a new dependency
// for. Detected at runtime; the mic button only renders when present.
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const speechLangByLocale: Record<string, string> = { de: 'de-DE', en: 'en-US', it: 'it-IT' };

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      // Strip the "data:<mime>;base64," prefix — the backend wants raw base64.
      const commaIndex = result.indexOf(',');
      resolve(commaIndex === -1 ? result : result.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

// The bottom-right "KIbo" assistant. A small always-visible launcher opens a
// large, claude.ai-inspired panel: a conversation sidebar on the left, the
// active thread + composer on the right. Rendered only when the caller has
// already resolved identity.canUseAiAssistant — that flag is a capability
// hint only (see CLAUDE.md); every /learn/ai/* call below is independently
// re-authorized server-side regardless of why this component is mounted.
//
// Focus-trap/overlay idiom matches components/learn/vocabulary-quick-add.tsx
// rather than a new dialog/modal dependency.
export function AiAssistantWidget() {
  const { t, locale } = useLearnPreferences();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [uploadsEnabled, setUploadsEnabled] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingKeyRef = useRef<string | null>(null);
  const loadedRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const speechSupported = getSpeechRecognitionCtor() !== null;

  async function loadConversations(selectLatest: boolean) {
    setLoadingList(true);
    setError(null);
    try {
      const [access, data] = await Promise.all([
        learnApi<{ uploadsEnabled: boolean }>('ai/access').catch(() => ({ uploadsEnabled: false })),
        learnApi<{ conversations: ConversationSummary[] }>('ai/conversations'),
      ]);
      setUploadsEnabled(access.uploadsEnabled);
      setConversations(data.conversations);
      if (selectLatest && data.conversations[0]) {
        await selectConversation(data.conversations[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingList(false);
    }
  }

  async function selectConversation(id: string) {
    setConversationId(id);
    setSidebarOpen(false);
    setError(null);
    setLoadingMessages(true);
    try {
      const detail = await learnApi<{ messages: AiMessage[] }>(`ai/conversations/${id}`);
      setMessages(detail.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingMessages(false);
    }
  }

  function startNewConversation() {
    setConversationId(null);
    setMessages([]);
    setError(null);
    setSidebarOpen(false);
    textareaRef.current?.focus();
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    try {
      await learnApi(`ai/conversations/${id}`, { method: 'DELETE' });
      setConversations((current) => current.filter((entry) => entry.id !== id));
      if (conversationId === id) startNewConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId;
    const created = await learnApi<{ conversation: ConversationSummary }>('ai/conversations', { method: 'POST' });
    setConversationId(created.conversation.id);
    setConversations((current) => [created.conversation, ...current]);
    return created.conversation.id;
  }

  async function handleFileSelect(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setAttachError(null);
    const files = Array.from(fileList).slice(0, MAX_ATTACHMENTS - pendingAttachments.length);
    if (files.length < fileList.length) {
      setAttachError(t('ai.tooManyAttachments'));
    }
    for (const file of files) {
      if (file.size > CLIENT_SOFT_MAX_BYTES) {
        setAttachError(t('ai.attachmentTooLarge'));
        continue;
      }
      try {
        const dataBase64 = await readFileAsBase64(file);
        const isImage = file.type.startsWith('image/');
        setPendingAttachments((current) => [
          ...current,
          { filename: file.name, dataBase64, isImage, previewUrl: isImage ? URL.createObjectURL(file) : undefined },
        ]);
      } catch {
        setAttachError(t('ai.attachmentReadFailed'));
      }
    }
  }

  function removeAttachment(index: number) {
    setPendingAttachments((current) => {
      const target = current[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if ((!content && pendingAttachments.length === 0) || sending) return;

    if (!pendingKeyRef.current) {
      pendingKeyRef.current = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    }
    const idempotencyKey = pendingKeyRef.current;
    const attachmentsToSend = pendingAttachments;

    setSending(true);
    setError(null);
    const optimisticId = `pending-${idempotencyKey}`;
    setMessages((current) => [...current, { id: optimisticId, role: 'user', content }]);
    setInput('');
    setPendingAttachments([]);

    try {
      const id = await ensureConversation();
      const result = await learnApi<{ userMessage: AiMessage; assistantMessage: AiMessage }>(`ai/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content,
          idempotencyKey,
          attachments: attachmentsToSend.map((a) => ({ filename: a.filename, dataBase64: a.dataBase64 })),
          pageContext: { path: pathname ?? '', title: typeof document !== 'undefined' ? document.title : '' },
        }),
      });
      setMessages((current) => [
        ...current.filter((message) => message.id !== optimisticId),
        result.userMessage,
        result.assistantMessage,
      ]);
      pendingKeyRef.current = null;
      void loadConversations(false);
    } catch (err) {
      setMessages((current) => current.filter((message) => message.id !== optimisticId));
      setInput(content);
      setPendingAttachments(attachmentsToSend);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit(event as unknown as FormEvent);
    }
  }

  function toggleDictation() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = speechLangByLocale[locale] ?? 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i]?.[0]?.transcript ?? '';
      }
      setInput(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function conversationLabel(conversation: ConversationSummary): string {
    if (conversation.title) return conversation.title;
    const when = conversation.lastMessageAt ?? conversation.createdAt;
    try {
      return new Date(when).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return t('ai.untitledConversation');
    }
  }

  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    void loadConversations(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
  }, [messages]);

  // Auto-grow the composer textarea up to a CSS-capped max-height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const launcher = launcherRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusFirst = window.setTimeout(() => panel?.querySelector<HTMLElement>(focusableSelector)?.focus(), 0);
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
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
      recognitionRef.current?.stop();
      launcher?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className="ai-launcher"
        aria-label={t('ai.launcherLabel')}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MessageCircle size={22} />
      </button>

      {open && (
        <div className="ai-assistant-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div className="ai-assistant-panel panel" role="dialog" aria-modal="true" aria-label={t('ai.panelTitle')} ref={panelRef}>
            <div className={sidebarOpen ? 'ai-assistant-sidebar ai-assistant-sidebar--open' : 'ai-assistant-sidebar'} data-lenis-prevent>
              <div className="ai-assistant-sidebar__head">
                <button type="button" className="button button--dark button--small ai-assistant-newchat" onClick={startNewConversation}>
                  <Plus size={15} /> {t('ai.newChat')}
                </button>
                <button type="button" className="icon-button ai-assistant-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label={t('ai.closeSidebar')}>
                  <X size={16} />
                </button>
              </div>
              <nav className="ai-assistant-conversations" aria-label={t('ai.conversationsLabel')}>
                {loadingList && <div className="inline-empty"><Loader2 size={16} className="spin" /></div>}
                {!loadingList && conversations.length === 0 && (
                  <p className="ai-assistant-empty ai-assistant-empty--sidebar">{t('ai.noConversations')}</p>
                )}
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={conversation.id === conversationId ? 'ai-assistant-conversation ai-assistant-conversation--active' : 'ai-assistant-conversation'}
                  >
                    <button type="button" onClick={() => void selectConversation(conversation.id)} className="ai-assistant-conversation__label">
                      {conversationLabel(conversation)}
                    </button>
                    <button
                      type="button"
                      className="icon-button ai-assistant-conversation__delete"
                      onClick={() => void handleDelete(conversation.id)}
                      aria-label={t('ai.deleteConversation')}
                    >
                      <Trash2 size={13} />
                    </button>
                    {confirmDeleteId === conversation.id && (
                      <span className="ai-assistant-confirm-delete">{t('ai.confirmDelete')}</span>
                    )}
                  </div>
                ))}
              </nav>
            </div>

            <div className="ai-assistant-main">
              <div className="ai-assistant-head">
                <button type="button" className="icon-button ai-assistant-sidebar-toggle" onClick={() => setSidebarOpen((value) => !value)} aria-label={t('ai.openSidebar')}>
                  <Menu size={17} />
                </button>
                <span>{t('ai.panelTitle')}</span>
                <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label={t('ai.closeLabel')}><X size={18} /></button>
              </div>

              <div className="ai-assistant-messages" ref={scrollRef} aria-live="polite" data-lenis-prevent>
                {loadingMessages && <div className="inline-empty"><Loader2 size={18} className="spin" /></div>}
                {!loadingMessages && messages.length === 0 && <p className="ai-assistant-empty">{t('ai.emptyState')}</p>}
                {messages.map((message) => (
                  <div key={message.id} className={message.role === 'assistant' ? 'ai-message ai-message--assistant' : 'ai-message ai-message--user'}>
                    <span className="ai-message__role">{message.role === 'assistant' ? t('ai.assistantName') : t('ai.you')}</span>
                    {message.content && <p>{message.content}</p>}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="ai-message__attachments">
                        {message.attachments.map((attachment) =>
                          attachment.kind === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element -- base64 chat attachment, not a static asset
                            <img
                              key={attachment.id}
                              className="ai-message__attachment-image"
                              src={`data:${attachment.mimeType};base64,${attachment.content}`}
                              alt={attachment.filename}
                            />
                          ) : (
                            <span key={attachment.id} className="ai-message__attachment-file">
                              <FileText size={13} /> {attachment.filename}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="ai-message ai-message--assistant ai-message--typing" aria-hidden="true">
                    <span className="ai-message__role">{t('ai.assistantName')}</span>
                    <span className="ai-typing"><i /><i /><i /></span>
                  </div>
                )}
                {error && <p className="ai-assistant-error" role="alert">{error}</p>}
              </div>

              {(pendingAttachments.length > 0 || attachError) && (
                <div className="ai-assistant-pending-attachments">
                  {pendingAttachments.map((attachment, index) => (
                    <span key={`${attachment.filename}-${index}`} className="ai-assistant-pending-attachment">
                      {attachment.previewUrl
                        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a static asset
                        ? <img src={attachment.previewUrl} alt={attachment.filename} />
                        : <FileText size={13} />}
                      <span>{attachment.filename}</span>
                      <button type="button" onClick={() => removeAttachment(index)} aria-label={t('ai.removeAttachment')}><X size={12} /></button>
                    </span>
                  ))}
                  {attachError && <span className="ai-assistant-error">{attachError}</span>}
                </div>
              )}

              <form className="ai-assistant-composer" onSubmit={(event) => void handleSubmit(event)}>
                {uploadsEnabled && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,text/plain,.txt"
                      multiple
                      hidden
                      onChange={(event) => { void handleFileSelect(event.target.files); event.target.value = ''; }}
                    />
                    <button
                      type="button"
                      className="icon-button ai-assistant-attach"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending || pendingAttachments.length >= MAX_ATTACHMENTS}
                      aria-label={t('ai.attachFile')}
                    >
                      <Paperclip size={16} />
                    </button>
                  </>
                )}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={t('ai.composerPlaceholder')}
                  disabled={sending}
                  maxLength={4000}
                  rows={1}
                />
                {speechSupported && (
                  <button
                    type="button"
                    className={listening ? 'icon-button ai-assistant-mic ai-assistant-mic--active' : 'icon-button ai-assistant-mic'}
                    onClick={toggleDictation}
                    aria-pressed={listening}
                    aria-label={listening ? t('ai.stopDictation') : t('ai.startDictation')}
                  >
                    <Mic size={16} />
                  </button>
                )}
                <button type="submit" className="button button--dark button--small" disabled={sending || (!input.trim() && pendingAttachments.length === 0)}>
                  {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                  {sending ? t('ai.sending') : t('ai.send')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
