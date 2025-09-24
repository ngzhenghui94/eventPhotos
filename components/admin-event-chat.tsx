"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquareText } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import TimelineCollapsibleCard from '@/components/timeline-collapsible-card';

type ChatMessage = {
  id: number;
  eventId: number;
  senderUserId: number | null;
  guestName: string | null;
  body: string;
  createdAt: string;
};

export default function AdminEventChat({ eventId }: { eventId: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  useEffect(() => {
    const onVis = () => setIsPageVisible(typeof document !== 'undefined' ? !document.hidden : true);
    if (typeof document !== 'undefined') {
      setIsPageVisible(!document.hidden);
      document.addEventListener('visibilitychange', onVis);
    }
    return () => { if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis); };
  }, []);

  useEffect(() => {
    const onFocus = () => setIsWindowFocused(true);
    const onBlur = () => setIsWindowFocused(false);
    if (typeof window !== 'undefined') {
      const initial = typeof document !== 'undefined' && typeof document.hasFocus === 'function' ? document.hasFocus() : true;
      setIsWindowFocused(initial);
      window.addEventListener('focus', onFocus);
      window.addEventListener('blur', onBlur);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('blur', onBlur);
      }
    };
  }, []);

  useEffect(() => {
    if (isMinimized) return;

    let cancelled = false;
    let es: EventSource | null = null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;

    async function loadOnce() {
      if (!messages.length) setLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}/chat?limit=200`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setMessages(Array.isArray(data.messages) ? data.messages : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Initial load
    loadOnce();

    // Subscribe to SSE for push updates
    try {
      es = new EventSource(`/api/events/${eventId}/chat/stream`);
      es.addEventListener('version', () => {
        loadOnce();
      });
      es.addEventListener('init', () => {
        // handshake received
      });
      es.onerror = () => {
        // auto-retry handled via server 'retry' hint
      };
    } catch {}

    // Slow safety refresh if page visible and focused (in case SSE is blocked)
    const SAFETY_MS = 20000;
    if (isPageVisible && isWindowFocused) {
      fallbackTimer = setInterval(loadOnce, SAFETY_MS);
    }

    return () => {
      cancelled = true;
      if (fallbackTimer) clearInterval(fallbackTimer);
      if (es) es.close();
    };
  }, [eventId, isMinimized, isPageVisible, isWindowFocused]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    const optimistic: ChatMessage = {
      id: Date.now(), eventId, senderUserId: null, guestName: 'Host', body: text.trim(), createdAt: new Date().toISOString()
    };
    setSending(true);
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    try {
      const res = await fetch(`/api/events/${eventId}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: optimistic.body }) });
      if (res.ok) {
        const saved = await res.json();
        setMessages((prev) => [...prev.filter((m) => m.id !== optimistic.id), saved]);
      }
    } finally {
      setSending(false);
    }
  }

  async function remove(id: number) {
    try {
      const res = await fetch(`/api/events/${eventId}/chat?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        toast.success('Message deleted');
      } else {
        let message = 'Failed to delete message';
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {}
        toast.error(message);
      }
    } catch (err) {
      toast.error('Failed to delete message');
    }
  }

  return (
    <TimelineCollapsibleCard
      title="Event Chat (Host moderation)"
      storageKey={`tcg_admin_event_chat:${eventId}`}
      icon={<MessageSquareText className="w-6 h-6 text-indigo-600" />}
      gradientClass="border-indigo-200 bg-gradient-to-r from-indigo-50 to-pink-50"
      defaultCollapsed
      onCollapsedChange={setIsMinimized}
    >
      {!isMinimized && (
        <>
          <div ref={listRef} className="h-64 overflow-y-auto border border-indigo-100 rounded-md p-3 bg-white/80 backdrop-blur-[1px]">
            {loading && messages.length === 0 ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-gray-500">No messages yet.</div>
            ) : (
              <ul className="space-y-2">
                {messages.map((m) => {
                  const isHost = m.senderUserId !== null || (m.guestName?.toLowerCase() === 'host') || (/\(host\)/i.test(m.guestName ?? ''));
                  const rawName = m.guestName || (isHost ? 'Host' : 'Guest');
                  const name = rawName.replace(/\s*\(host\)\s*$/i, '').trim();
                  return (
                    <li key={m.id} className="text-sm flex items-start justify-between gap-3">
                      <div>
                        <div className="text-gray-900">{m.body}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <span>{name}</span>
                          {isHost && (
                            <span className="inline-flex items-center rounded-full bg-indigo-100 text-red-600 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-semibold  tracking-wide">Host</span>
                          )}
                          <span>· {new Date(m.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <Button size="xs" variant="destructive" onClick={() => remove(m.id)}>Delete</Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <form onSubmit={send} className="mt-3 flex items-center gap-2">
            <Input placeholder="Type a message" value={text} onChange={(e) => setText(e.target.value)} />
            <Button type="submit" disabled={!text.trim() || sending}>{sending ? 'Sending…' : 'Send'}</Button>
          </form>
        </>
      )}
    </TimelineCollapsibleCard>
  );
}


