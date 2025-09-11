"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  eventId: number;
  eventName: string;
  category: string;
  accessCode: string;
};

const RegenerateCodeButton: React.FC<Props> = ({ eventId, eventName, category, accessCode }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        className="px-4 py-2 font-semibold rounded-lg shadow-sm bg-gradient-to-r from-red-500 to-red-700 text-white border-none hover:from-red-600 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-400 transition flex items-center gap-2"
        onClick={() => setOpen(true)}
        disabled={loading}
        aria-label="New Access Code"
      >
        {loading ? 'Regenerating...' : 'New Access Code'}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] max-w-[90vw] flex flex-col gap-4">
            <div className="font-bold text-lg text-red-700">Regenerate Access Code?</div>
            <div className="text-gray-700 mb-2">Are you sure you want to Regenerate the access code for this event? This will invalidate the previous code you have shared with the guests.</div>
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-semibold text-red-700">Current Access Code:</span>
              <span className="ml-2 font-mono px-2 py-1 rounded bg-gray-100 border border-gray-300">{accessCode}</span>
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-red-500 to-red-700 text-white"
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
                  setOpen(false);
                  window.location.reload();
                }}
                disabled={loading}
              >
                {loading ? 'Regenerating...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
  </>
);
};

export default RegenerateCodeButton;
