
import { db } from '@/lib/db/drizzle';
import { teams, teamMembers, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  const awaitedParams = await params;
  const userId = Number(awaitedParams.userId);
  const data = await req.formData();
  const planName = data.get('planName') as string;

  // Find user's team
  const teamMember = await db.query.teamMembers.findFirst({ where: eq(teamMembers.userId, userId) });
  if (!teamMember) {
    return NextResponse.json({ error: 'User is not part of a team.' }, { status: 400 });
  }

  // Update team plan
  await db.update(teams)
    .set({ planName })
    .where(eq(teams.id, teamMember.teamId));

  return NextResponse.json({ success: true, planName });
}
