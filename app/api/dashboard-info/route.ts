import { NextResponse } from 'next/server';

export async function GET() {
	// Return user's plan and event limit for dashboard
	const { getUser } = await import('@/lib/db/queries');
	const { eventLimit, normalizePlanName } = await import('@/lib/plans');
	const user = await getUser();
	const planName = user?.planName || 'free';
	const normalized = normalizePlanName(planName);
	const limit = eventLimit(normalized);
	return NextResponse.json({
		planName,
		eventLimit: limit
	});
}
