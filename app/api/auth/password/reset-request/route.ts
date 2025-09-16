import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByEmail, createPasswordResetToken } from '@/lib/db/queries';
import { sendPasswordResetEmail } from '@/lib/mailer';

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const body = await parseRequest(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const user = await getUserByEmail(email);
  if (user) {
    try {
      const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await createPasswordResetToken(user.id, token, expiresAt);
      await sendPasswordResetEmail(user.email, token);
    } catch (e) {
      console.error('reset-request email error', e);
    }
  }
  return NextResponse.json({ success: 'If the email exists, a link was sent.' });
}

async function parseRequest(req: NextRequest): Promise<Record<string, any>> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await req.json();
  if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    return Object.fromEntries(fd.entries());
  }
  return {};
}
