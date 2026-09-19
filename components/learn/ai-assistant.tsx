'use client';

import { Loader2, MessageCircle, Send, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';

import { learnApi } from '@/lib/client/api';
import { useLearnPreferences } from '@/components/providers/learn-preferences';

interface AiMessage {
  id: string;
  role: string;
  content: string;
}

interface ConversationSummary {
  id: string;
}

// The bottom-right "KIbo" assistant popup. Rendered only when the caller has
// already resolved identity.canUseAiAssistant — that flag is a capability
// hint only (see CLAUDE.md); every /learn/ai/* call below is independently
// re-authorized server-side regardless of why this component is mounted.
//
// Built on the same overlay/focus-trap idiom as
// components/learn/vocabulary-quick-add.tsx's QuickAddVocabularyButton
// rather than a new dialog/modal dependency.
export function AiAssistantWidget() {
  const { t } = useLearnPreferences();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingKeyRef = useRef<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    learnApi<{ conversations: ConversationSummary[] }>('ai/conversations')
      .then(async (data) => {
        const latest = data.conversations[0];
        if (!latest) return;
        setConversationId(latest.id);
        const detail = await learnApi<{ messages: AiMessage[] }>(`ai/conversations/${latest.id}`);
        setMessages(detail.messages);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const launcher = launcherRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusFirst = window.setTimeout(() => panel?.querySelector<HTMLElement>(focusableSelector)?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
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
      launcher?.focus();
    };
  }, [open]);

  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId;
    const created = await learnApi<{ conversation: ConversationSummary }>('ai/conversations', { method: 'POST' });
    setConversationId(created.conversation.id);
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
      setInput('');
      pendingKeyRef.current = null;
    } catch (err) {
      setMessages((current) => current.filter((message) => message.id !== optimisticId));
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

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
          <div className="ai-assistant-panel panel" role="dialog" aria-modal="true" aria-label={t('ai.panelTitle')} ref={panelRef} data-lenis-prevent>
            <div className="ai-assistant-head">
              <span>{t('ai.panelTitle')}</span>
              <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label={t('ai.closeLabel')}><X size={18} /></button>
            </div>

            <div className="ai-assistant-messages" ref={scrollRef} aria-live="polite">
              {loading && <div className="inline-empty"><Loader2 size={18} className="spin" /></div>}
              {!loading && messages.length === 0 && <p className="ai-assistant-empty">{t('ai.emptyState')}</p>}
              {messages.map((message) => (
                <div key={message.id} className={message.role === 'assistant' ? 'ai-message ai-message--assistant' : 'ai-message ai-message--user'}>
                  <span className="ai-message__role">{message.role === 'assistant' ? t('ai.assistantName') : t('ai.you')}</span>
                  <p>{message.content}</p>
                </div>
              ))}
              {error && <p className="ai-assistant-error" role="alert">{error}</p>}
            </div>

            <form className="ai-assistant-composer" onSubmit={(event) => void handleSubmit(event)}>
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t('ai.composerPlaceholder')}
                disabled={sending}
                maxLength={4000}
              />
              <button type="submit" className="button button--dark button--small" disabled={sending || !input.trim()}>
                {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                {sending ? t('ai.sending') : t('ai.send')}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
