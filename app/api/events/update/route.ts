
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { events as eventsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateAccessCode } from '@/lib/events/actions';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const eventId = Number(formData.get('eventId'));
    const name = String(formData.get('name') ?? '').trim();
    const category = String(formData.get('category') ?? '').trim();
    // Add other fields as needed

    // Only regenerate code if explicitly requested
    let updateObj: any = {
      name,
      category,
      updatedAt: new Date(),
    };
    if (formData.get('regenerateCode') === 'true') {
      updateObj.accessCode = generateAccessCode();
    }

    await db.update(eventsTable)
      .set(updateObj)
      .where(eq(eventsTable.id, eventId));

    return NextResponse.json({ success: true });
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
