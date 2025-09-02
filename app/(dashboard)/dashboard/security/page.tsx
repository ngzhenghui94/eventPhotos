'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Loader2 } from 'lucide-react';
import { useActionState } from 'react';
import { deleteAccount } from '@/app/(login)/actions';

type DeleteState = {
  error?: string;
  success?: string;
};

export default function SecurityPage() {
  const [deleteState, deleteAction, isDeletePending] = useActionState<
    DeleteState,
    FormData
  >(deleteAccount, {});

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
          <form action={deleteAction} className="space-y-4">
            <Button
              type="submit"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletePending}
            >
              {isDeletePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
