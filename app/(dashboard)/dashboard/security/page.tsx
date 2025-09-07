'use client';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Loader2 } from 'lucide-react';
import { Modal } from '@/components/modal';

type DeleteState = {
  error?: string;
  success?: string;
};

export default function SecurityPage() {
  const [deleteState, setDeleteState] = React.useState<DeleteState>({});
  const [isDeletePending, setIsDeletePending] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);

  async function handleDelete() {
    setIsDeletePending(true);
    setDeleteState({});
    try {
      const res = await fetch('/api/user/delete', { method: 'POST' });
      const result = await res.json();
      if (result.error) {
        setDeleteState({ error: result.error });
      } else {
        setDeleteState({ success: result.success });
        // Optionally redirect or sign out here
      }
    } catch {
      setDeleteState({ error: 'Failed to delete account.' });
    }
    setIsDeletePending(false);
    setShowModal(false);
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium bold text-gray-900 mb-6">
        Security Settings
      </h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Your account uses Google Sign-In. Password-based login is disabled.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Account deletion is non-reversible. This will sign you out and remove your access.
          </p>
          {deleteState?.error && (
            <p className="text-red-500 text-sm mb-2">{deleteState.error}</p>
          )}
          <div className="space-y-4">
            <Button
              type="button"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletePending}
              onClick={() => setShowModal(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
            <Modal open={showModal} onClose={() => setShowModal(false)}>
              <div className="text-lg font-semibold text-red-700 mb-2">Confirm Account Deletion</div>
              <div className="text-sm text-gray-700 mb-4">
                Are you sure you want to delete your account?<br />
                <b>This action is irreversible.</b><br />
                You will lose access to your account, all your events, and all your photos.<br />
                All data will be permanently deleted.
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowModal(false)} disabled={isDeletePending}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeletePending}>
                  {isDeletePending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                  ) : (
                    <>Delete Account</>
                  )}
                </Button>
              </div>
            </Modal>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
