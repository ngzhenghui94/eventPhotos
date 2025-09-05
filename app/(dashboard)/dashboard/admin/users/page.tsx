import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function AdminUsersPage() {
  await requireSuperAdmin();

  // Get users and their plan
  const all = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isOwner: users.isOwner,
      createdAt: users.createdAt,
      planName: users.planName,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(500);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">All Users</h1>
      <div className="space-y-3">
        {Array.from(new Map(all.map(u => [u.id, u])).values()).map((u) => (
          <Card key={u.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{u.name || 'Unnamed'} — {u.email}</CardTitle>
              <div className="space-x-2">
                <form action={`/api/admin/users/${u.id}/owner`} method="post" className="inline">
                  <input type="hidden" name="isOwner" value={u.isOwner ? 'false' : 'true'} />
                  <Button size="sm" variant={u.isOwner ? 'secondary' : 'default'}>
                    {u.isOwner ? 'Revoke Admin' : 'Make Admin'}
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <div>Role: {u.role} • Admin: {u.isOwner ? 'Yes' : 'No'}</div>
              {/* Teams feature removed: no team info shown */}
              <div>
                <span className="font-medium">Plan:</span> {u.planName || 'free'}
                <form action={`/api/admin/users/${u.id}/plan`} method="post" className="inline ml-2">
                  <select name="planName" defaultValue={u.planName || 'free'} className="border rounded px-2 py-1 text-sm">
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="hobby">Hobby</option>
                    <option value="pro">Pro</option>
                    <option value="business">Business</option>
                  </select>
                  <Button size="sm" variant="outline" type="submit" className="ml-2">Change</Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
