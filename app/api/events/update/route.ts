import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { events as eventsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const eventId = Number(formData.get('eventId'));
    const name = String(formData.get('name') ?? '').trim();
    const category = String(formData.get('category') ?? '').trim();
    // Add other fields as needed

    await db.update(eventsTable)
      .set({
        name,
        category,
        updatedAt: new Date(),
      })
      .where(eq(eventsTable.id, eventId));

    return NextResponse.json({ success: true });
  } catch (error) {
  const errMsg = (error instanceof Error) ? error.message : String(error);
  return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
