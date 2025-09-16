import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByEmail, logActivity } from '@/lib/db/queries';
import { comparePasswords, setSession } from '@/lib/auth/session';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const data = await parseRequest(req);
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const user = await getUserByEmail(email.toLowerCase());
  if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  const ok = await comparePasswords(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  await setSession(user);
  await logActivity({ userId: user.id, action: 'SIGN_IN', detail: 'Signed in with password', ipAddress: req.headers.get('x-forwarded-for') || undefined });
  return NextResponse.json({ success: 'Signed in', redirect: '/dashboard' });
}

async function parseRequest(req: NextRequest): Promise<Record<string, any>> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return await req.json();
  }
  if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    return Object.fromEntries(fd.entries());
  }
  return {};
}
