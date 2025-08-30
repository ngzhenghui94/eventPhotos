import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { photos, ActivityType } from '@/lib/db/schema';
import { getUser, canUserUploadToEvent, logActivity, getEventById } from '@/lib/db/queries';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const eventId = parseInt(formData.get('eventId') as string);
    const file = formData.get('file') as File;
    const uploaderName = formData.get('uploaderName') as string;
    const uploaderEmail = formData.get('uploaderEmail') as string;

    if (!eventId || !file) {
      return Response.json({ error: 'Event ID and file are required' }, { status: 400 });
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    const user = await getUser();
    
    // Check if user can upload to this event
    const canUpload = await canUserUploadToEvent(eventId, user?.id);
    if (!canUpload) {
      return Response.json({ error: 'Not authorized to upload to this event' }, { status: 403 });
    }

    // Get event details
    const event = await getEventById(eventId);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

  // Save file to local uploads folder
  const uploadDir = join(process.cwd(), 'public/uploads/photos');
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = file.name.split('.').pop() || 'jpg';
  const filename = `${timestamp}-${randomString}.${extension}`;
  const filePath = join(uploadDir, filename);
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, fileBuffer);

    // Save photo record to database
    const [newPhoto] = await db.insert(photos).values({
      eventId,
      filename,
      originalFilename: file.name,
      mimeType: file.type,
      fileSize: file.size,
      filePath: `/uploads/photos/${filename}`,
      uploadedBy: user?.id || null,
      guestName: user ? null : uploaderName || null,
      guestEmail: user ? null : uploaderEmail || null,
      isApproved: !event.requireApproval,
    }).returning();

    // Log activity
    if (user) {
      await logActivity(event.teamId, user.id, ActivityType.UPLOAD_PHOTO);
    }

    return Response.json(newPhoto, { status: 201 });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return Response.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}