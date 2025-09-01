import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { photos, events, users } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function AdminPhotosPage() {
  await requireSuperAdmin();

  const all = await db
    .select({
      id: photos.id,
      originalFilename: photos.originalFilename,
      isApproved: photos.isApproved,
      uploadedAt: photos.uploadedAt,
      eventId: photos.eventId,
      eventCode: events.eventCode,
      eventName: events.name,
      uploadedById: users.id,
      uploadedByName: users.name,
      uploadedByEmail: users.email
    })
    .from(photos)
    .leftJoin(events, eq(photos.eventId, events.id))
    .leftJoin(users, eq(photos.uploadedBy, users.id))
    .orderBy(desc(photos.uploadedAt))
    .limit(200);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">All Photos</h1>
      <div className="space-y-3">
        {all.map((p) => (
          <Card key={p.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{p.originalFilename}</CardTitle>
              <div className="space-x-2">
                {!p.isApproved && (
                  <form action={`/api/admin/photos/${p.id}/approve`} method="post" className="inline">
                    <Button size="sm" variant="secondary">Approve</Button>
                  </form>
                )}
                <form action={`/api/admin/photos/${p.id}/delete`} method="post" className="inline">
                  <Button size="sm" variant="destructive">Delete</Button>
                </form>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>Event: <Link className="underline" href={`/dashboard/events/${p.eventCode}`}>{p.eventName}</Link></div>
                <div>Uploader: {p.uploadedByName || 'Guest'} {p.uploadedByEmail ? `(${p.uploadedByEmail})` : ''}</div>
                <div>Status: {p.isApproved ? 'Approved' : 'Pending'}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
