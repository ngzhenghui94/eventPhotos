"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react';
import { CategoryDropdown } from "@/components/category-dropdown";

type EventSettingsFormProps = {
  event?: any;
  isEventOwner?: boolean; // legacy prop
  canEdit?: boolean; // new prop to control editability
};

const EventSettingsForm = ({ event, isEventOwner, canEdit }: EventSettingsFormProps) => {
  const [category, setCategory] = React.useState(event?.category || "General");
  const [loading, setLoading] = React.useState(false);
  const editable = Boolean(canEdit ?? isEventOwner);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editable) return; // no-op if user cannot edit
    setLoading(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    formData.set('category', category);
  // Fix isPublic, allowGuestUploads, requireApproval, chatEnabled to always send boolean strings
  formData.set('isPublic', form.isPublic?.checked ? 'true' : 'false');
  formData.set('allowGuestUploads', form.allowGuestUploads?.checked ? 'true' : 'false');
  formData.set('requireApproval', form.requireApproval?.checked ? 'true' : 'false');
  formData.set('chatEnabled', form.chatEnabled?.checked ? 'true' : 'false');
  formData.set('slideshowEnabled', form.slideshowEnabled?.checked ? 'true' : 'false');
  formData.set('timelineEnabled', form.timelineEnabled?.checked ? 'true' : 'false');
    await fetch('/api/events/update', {
      method: 'POST',
      body: formData,
    });
    window.location.reload();
  };

  return (
    <div className="mt-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-green-100 rounded-full p-2">
            <Calendar className="w-6 h-6 text-green-600" />
          </span>
          <span className="font-bold text-2xl text-green-900">Edit Event</span>
        </div>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <input type="hidden" name="eventId" value={String(event.id)} />
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={event?.name} required maxLength={200} disabled={!editable || loading} />
        </div>
        <CategoryDropdown initialCategory={category} onChange={setCategory} disabled={!editable || loading} />
        {/* Event Settings Checkboxes */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isPublic" name="isPublic" defaultChecked={!!event.isPublic} className="accent-purple-600 h-4 w-4" disabled={!editable || loading} />
            <Label htmlFor="isPublic" className="font-medium">Public</Label>
            <span className="text-xs text-gray-400 font-medium min-w-0">Visible to anyone with the link</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="allowGuestUploads" name="allowGuestUploads" defaultChecked={!!event.allowGuestUploads} className="accent-purple-600 h-4 w-4" disabled={!editable || loading} />
            <Label htmlFor="allowGuestUploads" className="font-medium">Guest uploads</Label>
            <span className="text-xs text-gray-400 font-medium min-w-0">Allow guests to upload photos</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="requireApproval" name="requireApproval" defaultChecked={!!event.requireApproval} className="accent-purple-600 h-4 w-4" disabled={!editable || loading} />
            <Label htmlFor="requireApproval" className="font-medium">Require approval</Label>
            <span className="text-xs text-gray-400 font-medium min-w-0">New uploads need approval</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="chatEnabled" name="chatEnabled" defaultChecked={event.chatEnabled !== false} className="accent-purple-600 h-4 w-4" disabled={!editable || loading} />
            <Label htmlFor="chatEnabled" className="font-medium">Event chat</Label>
            <span className="text-xs text-gray-400 font-medium min-w-0">Enable chat for this event</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="slideshowEnabled" name="slideshowEnabled" defaultChecked={event.slideshowEnabled !== false} className="accent-purple-600 h-4 w-4" disabled={!editable || loading} />
            <Label htmlFor="slideshowEnabled" className="font-medium">Slideshow</Label>
            <span className="text-xs text-gray-400 font-medium min-w-0">Enable slideshows for this event</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="timelineEnabled" name="timelineEnabled" defaultChecked={event.timelineEnabled !== false} className="accent-purple-600 h-4 w-4" disabled={!editable || loading} />
            <Label htmlFor="timelineEnabled" className="font-medium">Timeline</Label>
            <span className="text-xs text-gray-400 font-medium min-w-0">Enable timeline for this event</span>
          </div>
        </div>
        <div className="flex justify-end pt-2 gap-2">
          <Button type="submit" size="sm" variant="default" disabled={!editable || loading}>
            {loading ? 'Saving...' : (editable ? 'Save Event Settings' : 'Read-only')}
          </Button>
          {/* Regenerate Code button moved to page.tsx beside View Guest Page */}
        </div>
      </form>
    </div>
  );
};

export default EventSettingsForm;
