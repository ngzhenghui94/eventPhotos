"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react';
import { CategoryDropdown } from "@/components/category-dropdown";

type EventSettingsFormProps = {
  event?: any;
  isEventOwner?: boolean;
};

const EventSettingsForm = ({ event, isEventOwner }: EventSettingsFormProps) => {
  const [category, setCategory] = React.useState(event?.category || "General");
  const [loading, setLoading] = React.useState(false);

  if (!isEventOwner) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target;
    const formData = new FormData(form as HTMLFormElement);
    formData.set('category', category);
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
          <Input id="name" name="name" defaultValue={event?.name} required maxLength={200} />
        </div>
        <CategoryDropdown initialCategory={category} onChange={setCategory} />
        {/* Event Settings Checkboxes */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isPublic" name="isPublic" defaultChecked={!!event.isPublic} className="accent-purple-600 h-4 w-4" />
            <Label htmlFor="isPublic" className="font-medium">Public</Label>
            <span className="text-gray-400 font-medium">Visible to anyone with the link</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="allowGuestUploads" name="allowGuestUploads" defaultChecked={!!event.allowGuestUploads} className="accent-purple-600 h-4 w-4" />
            <Label htmlFor="allowGuestUploads" className="font-medium">Guest uploads</Label>
            <span className="text-gray-400 font-medium">Allow guests to upload photos</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="requireApproval" name="requireApproval" defaultChecked={!!event.requireApproval} className="accent-purple-600 h-4 w-4" />
            <Label htmlFor="requireApproval" className="font-medium">Require approval</Label>
            <span className="text-gray-400 font-small">New uploads need approval</span>
          </div>
        </div>
        <div className="flex justify-end pt-2 gap-2">
          <Button type="submit" size="sm" variant="default" disabled={loading}>
            {loading ? 'Saving...' : 'Save Event Settings'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              setLoading(true);
              const formData = new FormData();
              formData.set('eventId', String(event.id));
              formData.set('name', event.name);
              formData.set('category', category);
              formData.set('regenerateCode', 'true');
              await fetch('/api/events/update', {
                method: 'POST',
                body: formData,
              });
              window.location.reload();
            }}
            disabled={loading}
          >{loading ? 'Regenerating...' : 'Regenerate Code'}</Button>
        </div>
      </form>
    </div>
  );
};

export default EventSettingsForm;
