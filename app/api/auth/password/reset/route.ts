import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resetPasswordByToken } from '@/lib/db/queries';
import { hashPassword } from '@/lib/auth/session';

const schema = z.object({ token: z.string().min(10), password: z.string().min(8) });

export async function POST(req: NextRequest) {
  const body = await parseRequest(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const { token, password } = parsed.data;
  const hash = await hashPassword(password);
  const ok = await resetPasswordByToken(token, hash);
  if (!ok) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });
  return NextResponse.json({ success: 'Password updated' });
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
