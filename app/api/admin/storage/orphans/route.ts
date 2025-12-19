import { requireSuperAdminApi } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { photos, events } from '@/lib/db/schema';
import { listAllObjects } from '@/lib/s3';
import { and, eq, isNull, sql, inArray } from 'drizzle-orm';

function keyFromFilePath(filePath: string): string | null {
  // Stored format: "s3:<key>"
  if (!filePath) return null;
  const idx = filePath.indexOf(':');
  return idx >= 0 ? filePath.slice(idx + 1) : filePath;
}

export async function GET() {
  const user = await requireSuperAdminApi();
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 });

  // 1) Get all S3 objects (limit to our photos prefix for efficiency)
  const objects = await listAllObjects('events/');
  const allKeys = new Set(objects.map((o) => o.key));

  // 2) Fetch all photo file keys from DB
  const dbPhotos = await db.query.photos.findMany({
    columns: { id: true, filePath: true, eventId: true },
  });
  const referencedKeys = new Set<string>();
  for (const p of dbPhotos) {
    const key = keyFromFilePath(p.filePath as string);
    if (key) referencedKeys.add(key);
  }

  // 3) Find photos whose event no longer exists
  const eventIds = Array.from(new Set(dbPhotos.map((p) => p.eventId)));
  let existingEventIds = new Set<number>();
  if (eventIds.length) {
    const existing = await db.query.events.findMany({
      where: inArray(events.id, eventIds as number[]),
      columns: { id: true },
    });
    existingEventIds = new Set(existing.map((e) => e.id));
  }
  const photosWithMissingEvent = dbPhotos.filter((p) => !existingEventIds.has(p.eventId));

  // 4) Orphaned objects: present in S3 but not referenced in DB
  const orphanedObjects = objects.filter((o) => !referencedKeys.has(o.key));

  return Response.json({
    counts: {
      s3Objects: objects.length,
      dbPhotos: dbPhotos.length,
      orphanedObjects: orphanedObjects.length,
      photosWithMissingEvent: photosWithMissingEvent.length,
    },
    orphanedObjects,
    photosWithMissingEvent,
  });
}


