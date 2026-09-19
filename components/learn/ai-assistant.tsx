'use client';

import { Loader2, Mic, MessageCircle, Menu, Plus, Send, Trash2, X } from 'lucide-react';
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

import { learnApi } from '@/lib/client/api';
import { useLearnPreferences } from '@/components/providers/learn-preferences';

interface AiMessage {
  id: string;
  role: string;
  content: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  lastMessageAt: string | null;
  createdAt: string;
}

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

  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingKeyRef = useRef<string | null>(null);
  const loadedRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const speechSupported = getSpeechRecognitionCtor() !== null;

  async function loadConversations(selectLatest: boolean) {
    setLoadingList(true);
    setError(null);
    try {
      const data = await learnApi<{ conversations: ConversationSummary[] }>('ai/conversations');
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    if (!pendingKeyRef.current) {
      pendingKeyRef.current = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    }
    const idempotencyKey = pendingKeyRef.current;

    setSending(true);
    setError(null);
    const optimisticId = `pending-${idempotencyKey}`;
    setMessages((current) => [...current, { id: optimisticId, role: 'user', content }]);
    setInput('');

    try {
      const id = await ensureConversation();
      const result = await learnApi<{ userMessage: AiMessage; assistantMessage: AiMessage }>(`ai/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, idempotencyKey }),
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
                    <p>{message.content}</p>
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

              <form className="ai-assistant-composer" onSubmit={(event) => void handleSubmit(event)}>
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
                <button type="submit" className="button button--dark button--small" disabled={sending || !input.trim()}>
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
