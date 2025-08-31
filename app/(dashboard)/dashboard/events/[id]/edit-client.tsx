"use client";

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  eventId: number;
  name: string;
  isPublic: boolean;
  allowGuestUploads?: boolean;
  requireApproval?: boolean;
  action: any;
};

export default function EditEventClient({ eventId, name, isPublic, allowGuestUploads, requireApproval, action }: Props) {
  type ActionState = { error?: string; success?: string } | null;
  const [state, dispatch, pending] = useActionState<any, ActionState>(action, null);
  const formAction = (formData: FormData) => dispatch(formData as any);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="eventId" value={String(eventId)} />
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={name} required maxLength={200} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="isPublic">Public</Label>
          <p className="text-xs text-gray-500">Visible to anyone with the link</p>
        </div>
        <input id="isPublic" name="isPublic" type="checkbox" defaultChecked={!!isPublic} className="h-4 w-4" />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="allowGuestUploads">Guest uploads</Label>
          <p className="text-xs text-gray-500">Allow guests to upload photos</p>
        </div>
        <input id="allowGuestUploads" name="allowGuestUploads" type="checkbox" defaultChecked={!!allowGuestUploads} className="h-4 w-4" />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="requireApproval">Require approval</Label>
          <p className="text-xs text-gray-500">New uploads need approval</p>
        </div>
        <input id="requireApproval" name="requireApproval" type="checkbox" defaultChecked={!!requireApproval} className="h-4 w-4" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}
      <div className="flex justify-end">
        <Button size="sm" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save Changes'}</Button>
      </div>
    </form>
  );
}
