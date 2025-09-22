
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { events as eventsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateAccessCode } from '@/lib/events/actions';
import { getUser, getEventById } from '@/lib/db/queries';
import { redis } from '@/lib/upstash';
import { bumpEventVersion } from '@/lib/utils/cache';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const eventId = Number(formData.get('eventId'));
    const name = String(formData.get('name') ?? '').trim();
    const category = String(formData.get('category') ?? '').trim();
    // Add other fields as needed
  // Handle isPublic, allowGuestUploads, requireApproval as string from FormData
  const isPublicRaw = formData.get('isPublic');
  const isPublic = typeof isPublicRaw === 'string' ? isPublicRaw === 'true' : false;

  const allowGuestUploadsRaw = formData.get('allowGuestUploads');
  const allowGuestUploads = typeof allowGuestUploadsRaw === 'string' ? allowGuestUploadsRaw === 'true' : false;

  const requireApprovalRaw = formData.get('requireApproval');
  const requireApproval = typeof requireApprovalRaw === 'string' ? requireApprovalRaw === 'true' : false;
  const chatEnabledRaw = formData.get('chatEnabled');
  const chatEnabled = typeof chatEnabledRaw === 'string' ? chatEnabledRaw === 'true' : true;
  const slideshowEnabledRaw = formData.get('slideshowEnabled');
  const slideshowEnabled = typeof slideshowEnabledRaw === 'string' ? slideshowEnabledRaw === 'true' : true;
  const timelineEnabledRaw = formData.get('timelineEnabled');
  const timelineEnabled = typeof timelineEnabledRaw === 'string' ? timelineEnabledRaw === 'true' : true;

    // Auth protection: Only event owner or app owner can update
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const event = await getEventById(eventId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }
    const isOwner = user.id === event.createdBy || !!user.isOwner;
    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Only regenerate code if explicitly requested
    let updateObj: any = {
      name,
      category,
      isPublic,
      allowGuestUploads,
      requireApproval,
      chatEnabled,
      slideshowEnabled,
      timelineEnabled,
      updatedAt: new Date(),
    };
    if (formData.get('regenerateCode') === 'true') {
      updateObj.accessCode = generateAccessCode();
    }

    await db.update(eventsTable)
      .set(updateObj)
      .where(eq(eventsTable.id, eventId));

    // Invalidate caches for this event and user event list
    try {
      await Promise.all([
        redis.del(`evt:id:${eventId}`),
        redis.del(`evt:code:${event.eventCode}`),
        bumpEventVersion(eventId),
        redis.del(`user:${event.createdBy}:events:list:v2`),
        // clear timeline cache if related fields were toggled
        redis.del(`evt:${eventId}:timeline`),
      ]);
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
