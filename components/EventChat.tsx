"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';

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
};

export default function EventChat({ eventId, canAccess, gradientClass }: EventChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [text, setText] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [userName, setUserName] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const canSend = canAccess && text.trim().length > 0 && !sending;

  useEffect(() => {
    if (!canAccess) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}/chat`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load messages');
        const data = await res.json();
        if (!cancelled) {
          setMessages(Array.isArray(data.messages) ? data.messages : []);
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [eventId, canAccess]);

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
    }
  }

  return (
    <Card className={`${gradientClass || 'bg-gradient-to-br from-indigo-50 via-white to-pink-100'} rounded-xl shadow-lg ring-1 ring-slate-200/60`}>
      <CardHeader>
        <CardTitle>Event Chat</CardTitle>
      </CardHeader>
      <CardContent>
        {!canAccess ? (
          <div className="text-sm text-gray-600">Unlock the event to view and send messages.</div>
        ) : (
          <div className="flex flex-col gap-3">
            <div ref={listRef} className="h-64 overflow-y-auto border rounded-md p-3 bg-white/80 backdrop-blur-sm">
              {loading && messages.length === 0 ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-gray-500">No messages yet. Be the first to say hi!</div>
              ) : (
                <ul className="space-y-2">
                  {messages.map((m) => (
                    <li key={m.id} className="text-sm">
                      <div className="text-gray-800">{m.body}</div>
                      <div className="text-xs text-gray-500">
                        {(m.guestName || 'Guest')}
                        {' · '}
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </div>
                    </li>
                  ))}
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
                />
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


