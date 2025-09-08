"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryDropdown } from "@/components/category-dropdown";

const EventSettingsForm = ({ event, isEventOwner }) => {
  const [category, setCategory] = React.useState(event?.category || "General");

  if (!isEventOwner) return null;

  return (
    <div className="mt-4">
      <p className="text-sm font-medium mb-2">Edit Event</p>
      <form action="/api/events/update" method="POST" className="space-y-3">
        <input type="hidden" name="eventId" value={String(event.id)} />
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={event?.name} required maxLength={200} />
        </div>
        <CategoryDropdown initialCategory={category} onChange={setCategory} />
        {/* ...other settings fields (isPublic, allowGuestUploads, requireApproval) can be added here as needed... */}
        <div className="flex justify-end pt-2">
          <Button type="submit" size="sm" variant="default">Save Event Settings</Button>
        </div>
      </form>
    </div>
  );
};

export default EventSettingsForm;
