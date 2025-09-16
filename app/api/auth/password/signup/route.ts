import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByEmail, createUser, logActivity } from '@/lib/db/queries';
import { hashPassword, setSession } from '@/lib/auth/session';
import { createVerificationToken } from '@/lib/auth/verify';
import { sendVerificationEmail } from '@/lib/mailer';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const data = await parseRequest(req);
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }
  const { name, email, password } = parsed.data;
  const existing = await getUserByEmail(email.toLowerCase());
  if (existing) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  const passwordHash = await hashPassword(password);
  const user = await createUser({ name, email, passwordHash });
  await setSession(user);
  await logActivity({ userId: user.id, action: 'SIGN_UP', detail: 'Signed up with email/password', ipAddress: req.headers.get('x-forwarded-for') || undefined });
  try {
    const token = await createVerificationToken(user.id, 60 * 24);
    await sendVerificationEmail(user.email, token);
  } catch (e) {
    console.error('Failed to send verification email:', e);
  }
  return NextResponse.json({ success: 'Account created', redirect: '/dashboard' });
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
