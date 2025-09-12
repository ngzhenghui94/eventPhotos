import { NextResponse } from 'next/server';
import { deleteEventTimelineEntry } from '@/lib/db/queries';

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'Missing timeline entry id' }, { status: 400 });
  try {
    await deleteEventTimelineEntry(id);
    return NextResponse.json({ success: 'Timeline entry deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
