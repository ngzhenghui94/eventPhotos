import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { invitations, users } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function AdminInvitationsPage() {
  await requireSuperAdmin();

  const all = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      status: invitations.status,
      invitedAt: invitations.invitedAt,
  // Teams feature removed: no teamName
      invitedByName: users.name,
      invitedByEmail: users.email
    })
    .from(invitations)
  .leftJoin(users, eq(invitations.invitedBy, users.id))
    .orderBy(desc(invitations.invitedAt))
    .limit(200);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">All Invitations</h1>
      <div className="space-y-3">
        {all.map((inv) => (
          <Card key={inv.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{inv.email} • {inv.role} • {inv.status}</CardTitle>
              <div className="space-x-2">
                {inv.status !== 'revoked' && (
                  <form action={`/api/admin/invitations/${inv.id}/status`} method="post" className="inline">
                    <input type="hidden" name="status" value="revoked" />
                    <Button size="sm" variant="destructive">Revoke</Button>
                  </form>
                )}
                {inv.status !== 'accepted' && (
                  <form action={`/api/admin/invitations/${inv.id}/status`} method="post" className="inline">
                    <input type="hidden" name="status" value="accepted" />
                    <Button size="sm" variant="secondary">Mark Accepted</Button>
                  </form>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* Teams feature removed: no team info shown */}
                <div>Invited By: {inv.invitedByName} ({inv.invitedByEmail})</div>
                <div>At: {new Date(inv.invitedAt as any).toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
