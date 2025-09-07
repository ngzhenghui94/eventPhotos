import * as React from 'react';
import { Modal } from '@/components/modal';
import { Button } from '@/components/ui/button';

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteAccountModal({ open, onClose, onConfirm, loading }: DeleteAccountModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="text-lg font-semibold text-red-700 mb-2">Confirm Account Deletion</div>
      <div className="py-2 text-sm text-gray-700 mb-4">
        Are you sure you want to delete your account? <br />
        <b>This action is irreversible.</b> You will lose access to your account, all your events, and all your photos. <br />
        All data will be permanently deleted.
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="destructive" onClick={onConfirm} disabled={loading}>
          {loading ? 'Deleting...' : 'Delete Account'}
        </Button>
      </div>
    </Modal>
  );
}
