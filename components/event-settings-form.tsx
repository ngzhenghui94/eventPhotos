"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryDropdown } from "@/components/category-dropdown";

type EventSettingsFormProps = {
  event?: any;
  isEventOwner?: boolean;
};

const EventSettingsForm = ({ event, isEventOwner }: EventSettingsFormProps) => {
  const [category, setCategory] = React.useState(event?.category || "General");

  if (!isEventOwner) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
      <p className="text-sm font-medium mb-2">Edit Event</p>
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
            <span className="text-gray-400 ml-1">Visible to anyone with the link</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="allowGuestUploads" name="allowGuestUploads" defaultChecked={!!event.allowGuestUploads} className="accent-purple-600 h-4 w-4" />
            <Label htmlFor="allowGuestUploads" className="font-medium">Guest uploads</Label>
            <span className="text-gray-400 ml-1">Allow guests to upload photos</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="requireApproval" name="requireApproval" defaultChecked={!!event.requireApproval} className="accent-purple-600 h-4 w-4" />
            <Label htmlFor="requireApproval" className="font-medium">Require approval</Label>
            <span className="text-gray-400 ml-1">New uploads need approval</span>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" size="sm" variant="default">Save Event Settings</Button>
        </div>
      </form>
    </div>
  );
};

export default EventSettingsForm;
