import { NextRequest } from 'next/server';
import { getDemoEvent } from '@/lib/db/demo';

export async function GET(_req: NextRequest) {
  const demoOwner = process.env.DEMO_OWNER_EMAIL || 'ngzhenghui94@gmail.com';
  try {
    const demo = await getDemoEvent(demoOwner);
    return Response.json(demo);
  } catch (e) {
    console.error('demo event error', e);
    return Response.json({ error: 'Failed to load demo event' }, { status: 500 });
  }
}
