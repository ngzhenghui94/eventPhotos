"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  eventId: number;
  eventName: string;
  category: string;
};

const RegenerateCodeButton: React.FC<Props> = ({ eventId, eventName, category }) => {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      className="px-4 py-2 font-semibold rounded-lg shadow-sm bg-gradient-to-r from-red-500 to-red-700 text-white border-none hover:from-red-600 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-400 transition flex items-center gap-2"
      onClick={async () => {
        setLoading(true);
        const formData = new FormData();
        formData.set('eventId', String(eventId));
        formData.set('name', eventName);
        formData.set('category', category);
        formData.set('regenerateCode', 'true');
        await fetch('/api/events/update', {
          method: 'POST',
          body: formData,
        });
        window.location.reload();
      }}
      disabled={loading}
      aria-label="New Access Code"
    >
      {loading ? 'Regenerating...' : 'New Access Code'}
    </Button>
  );
};

export default RegenerateCodeButton;
