"use client";
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';

export interface TimelineEntry {
  id?: number;
  eventId: number;
  title: string;
  description?: string;
  location?: string;
  time: string;
  sortOrder?: number;
}

interface EventTimelineEditorProps {
  eventId: number;
  entries: TimelineEntry[];
  addAction?: (prevState: any, formData: FormData) => Promise<any>;
}

export function EventTimelineEditor({ eventId, entries, addAction }: EventTimelineEditorProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Restore collapsed state per event from localStorage
  useEffect(() => {
    try {
      const key = `tcg_timeline_collapsed:${eventId}`;
      const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (saved === '1') setCollapsed(true);
    } catch {}
  }, [eventId]);
  function getDefaultDateTime() {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    // Format for input type="datetime-local" is yyyy-MM-ddTHH:mm
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    time: getDefaultDateTime(), // ISO string for backend
  });
  const [mutationResult, setMutationResult] = useState<{ success?: string; error?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Remove client-side submit logic; use real form submission
  }

  // Editing and delete logic removed for now (add-only)

  return (
    <Card className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-orange-50 shadow-sm mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="mb-0 flex items-center gap-2">
          <span className="bg-blue-100 rounded-full p-2"><Calendar className="w-6 h-6 text-blue-600" /></span>
          <span className="font-bold text-2xl text-blue-900">Add Timeline Entry</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={!collapsed}
          onClick={() => {
            setCollapsed((c) => {
              const next = !c;
              try { localStorage.setItem(`tcg_timeline_collapsed:${eventId}`, next ? '1' : '0'); } catch {}
              return next;
            });
          }}
          className="ml-auto"
        >
          {collapsed ? (
            <>
              <ChevronDown className="h-4 w-4 mr-1" /> Expand
            </>
          ) : (
            <>
              <ChevronUp className="h-4 w-4 mr-1" /> Minimize
            </>
          )}
        </Button>
      </CardHeader>
      {!collapsed && (
      <CardContent>
        {mutationResult?.error && (
          <div className="mb-2 text-red-600 font-semibold">{mutationResult.error}</div>
        )}
        {mutationResult?.success && (
          <div className="mb-2 text-green-600 font-semibold">{mutationResult.success}</div>
        )}
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setMutationResult(null);
          try {
            let res, result;
            if (editingId) {
              res = await fetch(`/api/timeline/update?id=${editingId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: form.title,
                  description: form.description,
                  location: form.location,
                  time: form.time,
                }),
              });
            } else {
              res = await fetch('/api/timeline/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  eventId: String(eventId),
                  title: form.title,
                  description: form.description,
                  location: form.location,
                  time: form.time,
                }),
              });
            }
            result = await res.json();
            setMutationResult(result);
            if (result.success) {
              setForm({ title: '', description: '', location: '', time: getDefaultDateTime() });
              setEditingId(null);
              if (typeof window !== 'undefined') window.location.reload();
            }
          } catch (err: any) {
            setMutationResult({ error: err.message || 'Unknown error' });
          } finally {
            setSubmitting(false);
          }
        }}>
          <Input name="title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" required maxLength={200} />
          <Input name="description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" maxLength={1000} />
          <Input name="location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location" maxLength={255} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-small mb-1">Date & Time</label>
            <DatePicker

              selected={form.time ? new Date(form.time) : null}
              onChange={date => {
                setForm(f => ({ ...f, time: date ? date.toISOString() : '' }));
              }}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="dd/MM/yyyy HH:mm"
              className="w-full border rounded px-3 py-2 bg-white text-xs"
              placeholderText="DD/MM/YYYY HH:MM"
            />
            <span className="text-xs text-gray-400">Format: DD/MM/YYYY HH:MM</span>
          </div>
          {/* sortOrder removed for user simplicity */}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>{submitting ? 'Adding...' : 'Add'}</Button>
          </div>
        </form>
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Current Timeline Entries</h3>
          <ul className="space-y-2">
            {(() => {
              const now = Date.now();
              const sorted = [...entries].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
              let closestIdx = -1;
              let minDiff = Infinity;
              sorted.forEach((entry, idx) => {
                const diff = Math.abs(new Date(entry.time).getTime() - now);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestIdx = idx;
                }
              });
              return sorted.map((entry, idx) => (
                <li key={entry.id} className={`flex items-center gap-2 ${idx === closestIdx ? 'bg-yellow-100 border-yellow-400 border-2 rounded' : ''}`}>
                  <span className="font-bold text-blue-800">{entry.title}</span>
                  <span className="text-xs text-gray-500">{
                    (() => {
                      const d = new Date(entry.time);
                      const pad = (n: number) => n.toString().padStart(2, '0');
                      const day = pad(d.getDate());
                      const month = pad(d.getMonth() + 1);
                      const year = d.getFullYear();
                      const hours = pad(d.getHours());
                      const mins = pad(d.getMinutes());
                      return `${day}/${month}/${year} ${hours}:${mins}`;
                    })()
                  }</span>
                  {entry.location && <span className="text-xs text-blue-600">@ {entry.location}</span>}
                  <Button size="sm" variant="outline" onClick={() => {
                    setForm({
                      title: entry.title,
                      description: entry.description || '',
                      location: entry.location || '',
                      time: entry.time,
                    });
                    setEditingId(entry.id ?? null);
                  }}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={async () => {
                    setSubmitting(true);
                    setMutationResult(null);
                    try {
                      const res = await fetch(`/api/timeline/delete?id=${entry.id}`, { method: 'POST' });
                      const result = await res.json();
                      setMutationResult(result);
                      if (result.success && typeof window !== 'undefined') window.location.reload();
                    } catch (err: any) {
                      setMutationResult({ error: err.message || 'Unknown error' });
                    } finally {
                      setSubmitting(false);
                    }
                  }}>Delete</Button>
                </li>
              ));
            })()}
          </ul>
        </div>
      </CardContent>
      )}
    </Card>
  );
}
