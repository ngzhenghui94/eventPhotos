import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { events, users } from '@/lib/db/schema';
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
  eventCode: events.eventCode,
      accessCode: events.accessCode,
      isPublic: events.isPublic,
  // Teams feature removed: no teamName, teamId
      ownerId: users.id,
      ownerName: users.name,
      ownerEmail: users.email
    })
    .from(events)
  .leftJoin(users, eq(events.createdBy, users.id))
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
                <Link href={`/dashboard/events/${e.eventCode}`}>
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
                {/* Teams feature removed: no team info shown */}
                <div>Access: {e.isPublic ? 'Public' : 'Private'} • Event Code: {e.eventCode} • Access Code: {e.accessCode} • <Link className="text-blue-600" href={`/events/${e.eventCode}`}>Guest link</Link></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
