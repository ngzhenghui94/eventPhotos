import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserEvents, getUserEventsStats } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({} as any));
    const eventIds: number[] | undefined = Array.isArray(body?.eventIds) ? body.eventIds : undefined;

    // If no eventIds provided, fetch user's events and compute for all
    let ids = eventIds;
    if (!ids) {
      const events = await getUserEvents(user.id);
      ids = events.map(e => e.id);
    }

    const statsById = await getUserEventsStats(user.id, ids);
    // Also return an aggregate for convenience
    let latestMs = 0; let latestStr: string | null = null;
    const aggregate = Object.values(statsById).reduce((acc, s) => {
      acc.totalPhotos += s.totalPhotos;
      acc.approvedPhotos += s.approvedPhotos;
      acc.pendingApprovals += s.pendingApprovals;
      if (s.lastUploadAt) {
        const t = new Date(s.lastUploadAt).getTime();
        if (t > latestMs) { latestMs = t; latestStr = s.lastUploadAt; }
      }
      return acc;
    }, { totalPhotos: 0, approvedPhotos: 0, pendingApprovals: 0, lastUploadAt: null as string | null });
    aggregate.lastUploadAt = latestStr;

    return NextResponse.json({ statsById, aggregate }, { status: 200 });
  } catch (err) {
    console.error('[api][dashboard][stats][error]', err);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
