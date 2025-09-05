
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const awaitedParams = await params;
  const userId = Number(awaitedParams.userId);
  const data = await req.formData();
  const planName = data.get('planName') as string;

  // Update user's plan
  await db.update(users)
    .set({ planName })
    .where(eq(users.id, userId));

  return NextResponse.json({ success: true, planName });
}
