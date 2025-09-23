"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { ChevronDown, ChevronUp, MessageSquareText } from 'lucide-react';

type ChatMessage = {
  id: number;
  eventId: number;
  senderUserId: number | null;
  guestName: string | null;
  body: string;
  createdAt: string;
};

type EventChatProps = {
  eventId: number;
  canAccess: boolean;
  gradientClass?: string;
  storageKey?: string;
  defaultCollapsed?: boolean;
};

export default function EventChat({ eventId, canAccess, gradientClass, storageKey, defaultCollapsed }: EventChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [text, setText] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [userName, setUserName] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [collapsed, setCollapsed] = useState(!!defaultCollapsed);
  const [isPageVisible, setIsPageVisible] = useState<boolean>(true);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);

  const canSend = canAccess && text.trim().length > 0 && !sending;

  useEffect(() => {
    // Track page visibility to pause polling when tab is inactive
    const onVis = () => setIsPageVisible(typeof document !== 'undefined' ? !document.hidden : true);
    if (typeof document !== 'undefined') {
      setIsPageVisible(!document.hidden);
      document.addEventListener('visibilitychange', onVis);
    }
    return () => {
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  useEffect(() => {
    // Track window focus to pause polling when window is not focused
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
    if (!canAccess || collapsed || !isPageVisible || !isWindowFocused) {
      return; // Stop polling if user can't access or chat is collapsed
    }

  const POLL_MS = 3000;
    let cancelled = false;
    const inFlight = { current: false } as { current: boolean };
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      // Don't show loading spinner on background refresh, but do it on initial load
      if (!messages.length) {
        setLoading(true);
      }
      try {
        const res = await fetch(`/api/events/${eventId}/chat`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load messages');
        const data = await res.json();
        if (!cancelled) {
          setMessages(Array.isArray(data.messages) ? data.messages : []);
        }
      } catch {
        // Errors are ignored in polling
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function schedule() {
      if (cancelled) return;
      timer = setTimeout(async () => {
        if (!inFlight.current) {
          inFlight.current = true;
          try {
            await load();
          } finally {
            inFlight.current = false;
          }
        }
        schedule();
      }, POLL_MS);
    }

    // Initial load then schedule next
    load().finally(schedule);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [eventId, canAccess, collapsed, isPageVisible, isWindowFocused]);


  // Fetch current user to prefill/lock name if logged in
  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const res = await fetch('/api/user', { cache: 'no-store' });
        if (!res.ok) return;
        const u = await res.json();
        if (!cancelled && u && typeof u.name === 'string' && u.name.trim()) {
          setUserName(u.name.trim());
          setGuestName(u.name.trim());
        }
      } catch {}
    }
    loadUser();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    try {
      if (!storageKey) return;
      const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
      if (saved === '1') setCollapsed(true);
      if (saved === '0') setCollapsed(false);
    } catch {}
  }, [storageKey]);

  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSend) return;
    const optimistic: ChatMessage = {
      id: Date.now(),
      eventId,
      senderUserId: null,
      guestName: guestName || 'Guest',
      body: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setSending(true);
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    // Keep the typing flow smooth
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    try {
      const res = await fetch(`/api/events/${eventId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: optimistic.body, guestName: guestName || undefined }),
      });
      if (res.status === 429) {
        let msg = 'You are sending messages too quickly. Please wait a bit.';
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {}
        toast.error(msg);
        // Remove optimistic message since server rejected
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        return;
      }
      if (res.ok) {
        const saved = await res.json();
        setMessages((prev) => {
          const withoutOptimistic = prev.filter((m) => m.id !== optimistic.id);
          return [...withoutOptimistic, saved];
        });
      }
    } catch {
    } finally {
      setSending(false);
      // Refocus after network completes
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }

  return (
    <div className={`rounded-xl border border-blue-200 bg-gradient-to-r from-orange-100 via-red-50 to-blue-100 shadow-sm px-6 py-6`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 rounded-full p-2"><MessageSquareText className="w-5 h-5 text-blue-600" /></span>
          <span role="heading" aria-level={2} className="font-bold text-2xl text-blue-900">Event Chat</span>
        </div>
        <button
          type="button"
          className="inline-flex items-center text-sm text-blue-800 hover:text-blue-900 w-full sm:w-auto justify-center"
          aria-expanded={!collapsed}
          onClick={() => {
            setCollapsed((c) => {
              const next = !c;
              try { if (storageKey) localStorage.setItem(storageKey, next ? '1' : '0'); } catch {}
              return next;
            });
          }}
        >
          {collapsed ? (<><ChevronDown className="h-4 w-4 mr-1"/> Expand</>) : (<><ChevronUp className="h-4 w-4 mr-1"/> Minimize</>)}
        </button>
      </div>
      {!canAccess ? (
        <div className="text-sm text-gray-600">Unlock the event to view and send messages.</div>
      ) : !collapsed ? (
        <div className="flex flex-col gap-3">
          <div ref={listRef} className="h-64 overflow-y-auto border rounded-md p-3 bg-white/80 backdrop-blur-sm">
            {loading && messages.length === 0 ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-gray-500">No messages yet. Be the first to say hi!</div>
            ) : (
              <ul className="space-y-2">
                {messages.map((m) => {
                  const isHost = m.senderUserId !== null || (m.guestName?.toLowerCase() === 'host') || (/\(host\)/i.test(m.guestName ?? ''));
                  const rawName = m.guestName || (isHost ? 'Host' : 'Guest');
                  const name = rawName.replace(/\s*\(host\)\s*$/i, '').trim();
                  return (
                    <li key={m.id} className="text-sm">
                      <div className="text-gray-800">{m.body}</div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <span>{name}</span>
                        {isHost && (
                          <span className="inline-flex items-center rounded-full bg-indigo-100 text-green-500 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">Host</span>
                        )}
                        <span>· {new Date(m.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <form onSubmit={onSend} className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Your name (optional)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="flex-1"
                disabled={!!userName}
              />
              <Button type="submit" disabled={!canSend} className="whitespace-nowrap">
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type a message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full"
                ref={inputRef}
              />
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}


