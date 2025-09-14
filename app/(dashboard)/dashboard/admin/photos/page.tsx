import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { photos, events, users } from '@/lib/db/schema';
import { desc, inArray } from 'drizzle-orm';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';


type AdminPhotoItem = {
  id: number;
  originalFilename: string;
  fileSize: number;
  uploadedAt: Date;
  isApproved: boolean;
  event: { id: number; name: string };
  owner: { id: number; name: string | null; email: string } | null;
  uploader: { id: number; name: string | null; email: string } | null;
};

export default async function AdminPhotosPage({ searchParams }: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await requireSuperAdmin();

  const sp = searchParams ? await searchParams : undefined;
  const showPendingOnly = (typeof sp?.view === 'string' ? sp?.view : Array.isArray(sp?.view) ? sp?.view?.[0] : undefined) === 'pending';

  const rows = await db
    .select({
      id: photos.id,
      originalFilename: photos.originalFilename,
      fileSize: photos.fileSize,
      uploadedAt: photos.uploadedAt,
      isApproved: photos.isApproved,
      eventId: photos.eventId,
      uploadedBy: photos.uploadedBy,
    })
    .from(photos)
    .orderBy(desc(photos.uploadedAt));

  const eventIds = Array.from(new Set(rows.map(r => r.eventId)));
  const allEvents = eventIds.length
    ? await db.query.events.findMany({
        where: inArray(events.id, eventIds),
        with: {
          createdBy: {
            columns: { id: true, name: true, email: true },
          },
        },
      })
    : [];
  const eventById = new Map(allEvents.map(e => [e.id, e]));

  const uploadedByIds = Array.from(new Set(rows.map(r => r.uploadedBy).filter((v): v is number => typeof v === 'number')));
  const uploaders = uploadedByIds.length
    ? await db.query.users.findMany({
        where: inArray(users.id, uploadedByIds),
        columns: { id: true, name: true, email: true },
      })
    : [];
  const uploaderById = new Map(uploaders.map(u => [u.id, u]));

  const items: AdminPhotoItem[] = rows
    .filter(r => (showPendingOnly ? !r.isApproved : true))
    .map(r => {
      const ev = eventById.get(r.eventId);
      const owner = ev?.createdBy
        ? { id: ev.createdBy.id, name: ev.createdBy.name ?? null, email: ev.createdBy.email }
        : null;
      const uploader = r.uploadedBy ? uploaderById.get(r.uploadedBy) : null;
      return {
        id: r.id,
        originalFilename: r.originalFilename,
        fileSize: r.fileSize,
        uploadedAt: r.uploadedAt,
        isApproved: r.isApproved,
        event: { id: ev?.id ?? 0, name: ev?.name ?? 'Unknown Event' },
        owner: owner ? { id: owner.id, name: owner.name ?? null, email: owner.email } : null,
        uploader: uploader ? { id: uploader.id, name: uploader.name ?? null, email: uploader.email } : null,
      };
    });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg lg:text-2xl font-medium text-gray-900">All Photos</h1>
        <div className="flex items-center gap-2">
          {showPendingOnly ? (
            <Link href="?">
              <Button variant="outline">Show all</Button>
            </Link>
          ) : (
            <Link href="?view=pending">
              <Button variant="outline">Pending only</Button>
            </Link>
          )}
          <Link href="/dashboard/admin/storage/orphans">
            <Button variant="outline">Storage Orphans</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <div className="aspect-square bg-gray-50">
              <img
                src={`/api/photos/${p.id}/thumb`}
                alt={p.originalFilename}
                className="w-full h-full object-cover"
              />
            </div>
            <CardHeader className="py-2">
              <CardTitle className="text-sm truncate">{p.originalFilename}</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 pt-0">
              <div className="text-xs text-gray-600 space-y-1">
                <div><span className="font-medium">Event:</span> {p.event.name}</div>
                <div><span className="font-medium">Host:</span> {p.owner?.name || p.owner?.email || 'Unknown'}</div>
                <div><span className="font-medium">Uploaded by:</span> {p.uploader?.name || p.uploader?.email || 'Guest'}</div>
                <div>{(p.fileSize / 1024).toFixed(1)} KB • {new Date(p.uploadedAt).toLocaleString()}</div>
                {!p.isApproved && (
                  <div className="text-yellow-700">Pending approval</div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {!p.isApproved && (
                  <form action={`/api/admin/photos/${p.id}/approve`} method="post">
                    <Button size="sm" className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700">Approve</Button>
                  </form>
                )}
                <form action={`/api/admin/photos/${p.id}/delete`} method="post">
                  <Button size="sm" variant="destructive" className="h-7 px-2 text-xs">Delete</Button>
                </form>
                <Link href={`/api/photos/${p.id}/download`}>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs">Download</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
