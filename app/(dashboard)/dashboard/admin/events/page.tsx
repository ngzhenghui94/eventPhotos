import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { events, users, teams } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function AdminEventsPage() {
  await requireSuperAdmin();

  const all = await db
    .select({
      id: events.id,
      name: events.name,
      date: events.date,
      accessCode: events.accessCode,
      isPublic: events.isPublic,
      teamName: teams.name,
      teamId: teams.id,
      ownerId: users.id,
      ownerName: users.name,
      ownerEmail: users.email
    })
    .from(events)
    .leftJoin(users, eq(events.createdBy, users.id))
    .leftJoin(teams, eq(events.teamId, teams.id))
    .orderBy(desc(events.createdAt));

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">All Events</h1>
      <div className="space-y-3">
        {all.map((e) => (
          <Card key={e.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{e.name}</CardTitle>
              <div className="space-x-2">
                <Link href={`/dashboard/events/${e.id}`}>
                  <Button size="sm" variant="secondary">Open</Button>
                </Link>
                <form action={`/api/admin/events/${e.id}/delete`} method="post">
                  <Button size="sm" variant="destructive">Delete</Button>
                </form>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>Owner: {e.ownerName} ({e.ownerEmail})</div>
                <div>Team: {e.teamName}</div>
                <div>Access: {e.isPublic ? 'Public' : 'Private'} • Code: {e.accessCode}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
