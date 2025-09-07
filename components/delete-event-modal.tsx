"use client";
import { useState } from "react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DeleteEventModal({ eventId, eventName, eventCode, accessCode, action }: { eventId: number, eventName?: string, eventCode?: string, accessCode?: string, action: any }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>Delete Event</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-red-700 mb-2">Confirm Delete Event</h2>
            <p className="text-sm text-gray-700 mb-4">Type the event name, access code, or <b>DELETE</b> to confirm deletion. This will permanently remove the event and all its photos.</p>
            <form action={action} className="space-y-3">
              <input type="hidden" name="eventId" value={String(eventId)} />
              <div className="space-y-1.5">
                <Label htmlFor="confirmText">Confirmation</Label>
                <Input id="confirmText" name="confirmText" placeholder={eventName} value={confirmText} onChange={e => setConfirmText(e.target.value)} autoFocus />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="destructive" size="sm" type="submit" disabled={!confirmText}>Delete Event</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}