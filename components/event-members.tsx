"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type MemberRow = {
  id: number;
  eventId: number;
  userId: number;
  role: 'host' | 'organizer' | 'photographer' | 'customer';
  createdAt: string;
  updatedAt: string;
  userName?: string | null;
  userEmail?: string | null;
};

export default function EventMembers({ eventId, canManage }: { eventId: number; canManage: boolean }) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRow['role']>('organizer');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/members`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load members (${res.status})`);
      const data = await res.json();
      setMembers(data.members || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [eventId]);

  const hostUserId = useMemo(() => members.find(m => m.role === 'host')?.userId, [members]);

  const onAdd = async () => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/events/${eventId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to add member');
      setSuccess('Member saved');
      setEmail('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to add member');
    }
  };

  const onRemove = async (userId: number) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/events/${eventId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to remove member');
      setSuccess('Member removed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to remove member');
    }
  };

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="rounded-md border p-3 space-y-2 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <Label htmlFor="member-email">User Email</Label>
              <Input id="member-email" type="email" placeholder="user@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="member-role">Role</Label>
              <select
                id="member-role"
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="organizer">Organizer</option>
                <option value="photographer">Photographer</option>
                <option value="customer">Customer</option>
                <option value="host">Host</option>
              </select>
            </div>
            <div>
              <Button onClick={onAdd} disabled={loading || !email}>Add / Update</Button>
            </div>
          </div>
          <div className="text-xs text-gray-500">Adding an email of an existing member will update their role. Host role is reserved for the event creator.</div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {success && <div className="text-sm text-green-600">{success}</div>}
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Role</th>
              {canManage && <th className="text-right p-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="border-t">
                <td className="p-2">{m.userName || '—'}</td>
                <td className="p-2">{m.userEmail || '—'}</td>
                <td className="p-2 font-medium capitalize">{m.role}</td>
                {canManage && (
                  <td className="p-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => onRemove(m.userId)} disabled={m.userId === hostUserId}>Remove</Button>
                  </td>
                )}
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="p-3 text-center text-gray-500">No members yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
