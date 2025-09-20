"use client";

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquareText, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

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

  useEffect(() => {
    if (isMinimized) return;

    let cancelled = false;
    const POLL_MS = 10000;
    const inFlight = { current: false } as { current: boolean };
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}/chat?limit=200`, { cache: 'no-store' });
        if (!res.ok) {
          // Silently ignore to avoid error overlay; API may be temporarily unavailable or access denied.
          return;
        }
        const data = await res.json();
        if (!cancelled) setMessages(Array.isArray(data.messages) ? data.messages : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function schedule() {
      if (cancelled) return;
      timer = setTimeout(async () => {
        if (!inFlight.current) {
          inFlight.current = true;
          try { await load(); } finally { inFlight.current = false; }
        }
        schedule();
      }, POLL_MS);
    }

    load().finally(schedule);
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [eventId, isMinimized]);

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
    <Card className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-pink-50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-3">
          <span className="bg-indigo-100 rounded-full p-2">
            <MessageSquareText className="w-6 h-6 text-indigo-600" />
          </span>
          <span className="font-bold text-2xl text-indigo-900">Event Chat (Host moderation)</span>
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setIsMinimized(!isMinimized)}>
          {isMinimized ? <ChevronDown className="h-6 w-6" /> : <ChevronUp className="h-6 w-6" />}
        </Button>
      </CardHeader>
      {!isMinimized && (
        <CardContent>
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
        </CardContent>
      )}
    </Card>
  );
}


