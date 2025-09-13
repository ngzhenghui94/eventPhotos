import { requireSuperAdmin } from '@/lib/auth/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminOrphansTable from '@/components/admin-orphans-table';
import { listAllObjects } from '@/lib/s3';
import { db } from '@/lib/db/drizzle';
import { photos, events } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

export default async function AdminOrphansPage() {
  await requireSuperAdmin();
  // Build data directly on the server to preserve cookies and avoid API roundtrip
  const objects = await listAllObjects('events/');
  const dbPhotos = await db.query.photos.findMany({ columns: { id: true, filePath: true, eventId: true } });

  const referencedKeys = new Set<string>();
  for (const p of dbPhotos) {
    const fp = (p.filePath as string) || '';
    const idx = fp.indexOf(':');
    const key = idx >= 0 ? fp.slice(idx + 1) : fp;
    if (key) referencedKeys.add(key);
  }

  const eventIds = Array.from(new Set(dbPhotos.map((p) => p.eventId)));
  let existingEventIds = new Set<number>();
  if (eventIds.length) {
    const existing = await db.query.events.findMany({ where: inArray(events.id, eventIds as number[]), columns: { id: true } });
    existingEventIds = new Set(existing.map((e) => e.id));
  }
  const photosWithMissingEvent = dbPhotos.filter((p) => !existingEventIds.has(p.eventId));
  const orphanedObjects = objects.filter((o) => !referencedKeys.has(o.key));

  const data = {
    counts: {
      s3Objects: objects.length,
      dbPhotos: dbPhotos.length,
      orphanedObjects: orphanedObjects.length,
      photosWithMissingEvent: photosWithMissingEvent.length,
    },
    orphanedObjects,
    photosWithMissingEvent,
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Storage Orphans Overview</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><span className="font-semibold">S3 Objects:</span> {data.counts.s3Objects}</div>
            <div><span className="font-semibold">DB Photos:</span> {data.counts.dbPhotos}</div>
            <div><span className="font-semibold">Orphaned Objects:</span> {data.counts.orphanedObjects}</div>
            <div><span className="font-semibold">Photos Missing Event:</span> {data.counts.photosWithMissingEvent}</div>
          </div>
        </CardContent>
      </Card>

      <AdminOrphansTable orphaned={data.orphanedObjects} />

      {data.photosWithMissingEvent?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Photos with Missing Event</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Photo ID</th>
                    <th className="py-2 pr-4">Event ID</th>
                    <th className="py-2 pr-4">File Path</th>
                  </tr>
                </thead>
                <tbody>
                  {data.photosWithMissingEvent.map((p: any) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{p.id}</td>
                      <td className="py-2 pr-4">{p.eventId}</td>
                      <td className="py-2 pr-4">{p.filePath}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

