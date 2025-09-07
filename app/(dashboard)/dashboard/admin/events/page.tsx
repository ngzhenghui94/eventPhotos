import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { events, users, photos } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
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
      ownerId: users.id,
      ownerName: users.name,
      ownerEmail: users.email,
      photoCount: sql<number>`coalesce(count(${photos.id}), 0)`,
      approvedCount: sql<number>`coalesce(sum(case when ${photos.isApproved} then 1 else 0 end), 0)`,
      pendingCount: sql<number>`coalesce(sum(case when not ${photos.isApproved} then 1 else 0 end), 0)`
    })
    .from(events)
    .leftJoin(users, eq(events.createdBy, users.id))
    .leftJoin(photos, eq(photos.eventId, events.id))
    .groupBy(
      events.id,
      events.name,
      events.date,
      events.eventCode,
      events.accessCode,
      events.isPublic,
      users.id,
      users.name,
      users.email
    )
    .orderBy(desc(events.createdAt));

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-lg lg:text-2xl font-semibold text-gray-900 mb-6">All Events</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {all.map((e) => {
          const gradients = [
            'from-orange-50 to-blue-100',
            'from-pink-50 to-yellow-100',
            'from-green-50 to-blue-50',
            'from-purple-50 to-orange-50',
            'from-amber-50 to-lime-100',
            'from-cyan-50 to-indigo-100',
            'from-red-50 to-pink-100',
            'from-teal-50 to-green-100',
            'from-gray-50 to-gray-100',
          ];
          function pickGradient(code: string) {
            let hash = 0;
            for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) % gradients.length;
            return gradients[Math.abs(hash) % gradients.length];
          }
          const gradient = pickGradient(e.eventCode || '');
          return (
            <Card key={e.id} className={`border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full bg-gradient-to-br ${gradient}`}>
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-2">
                  <CardTitle className="text-base font-semibold text-gray-900 truncate">{e.name || 'Untitled Event'}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border ${e.isPublic ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {e.isPublic ? 'Public' : 'Private'}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                      Code: {e.eventCode}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 border-gray-200">
                      {new Date(e.date as unknown as string).toLocaleDateString?.() || 'No date'}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 text-xs font-medium border border-pink-200 ml-auto" title="Approved / Total">
                      {e.approvedCount ?? 0} / {e.photoCount ?? 0} photos
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 justify-between pt-0">
                <div className="text-xs text-gray-600 mb-3">
                  Owner: <span className="font-medium text-gray-800">{e.ownerName}</span> <span className="text-gray-400">({e.ownerEmail})</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200">Access: {e.isPublic ? 'Public' : 'Private'}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200">Access Code: {e.accessCode}</span>
                </div>
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <Link href={`/events/${e.eventCode}`} target="_blank" className="flex-1">
                    <Button size="sm" variant="outline" className="w-full">Guest page</Button>
                  </Link>
                  <Link href={`/dashboard/events/${e.eventCode}`} className="flex-1">
                    <Button size="sm" variant="secondary" className="w-full">Open</Button>
                  </Link>
                  <form action={`/api/admin/events/${e.id}/delete`} method="post" className="flex-1">
                    <Button size="sm" variant="destructive" className="w-full">Delete</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
