import { requireSuperAdminApi } from '@/lib/auth/admin';
import { deleteFromS3 } from '@/lib/s3';

export async function POST(request: Request) {
  const user = await requireSuperAdminApi();
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 });
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const keys = Array.isArray(body?.keys) ? body.keys.filter((k: any) => typeof k === 'string' && k.trim().length > 0) : [];
  if (!keys.length) {
    return Response.json({ error: 'No keys provided' }, { status: 400 });
  }

  // Fallback implementation: delete each key individually with bounded concurrency.
  const concurrency = 8;
  let cursor = 0;
  const deleted: string[] = [];
  const errors: { key: string; error: string }[] = [];

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= keys.length) return;
      const key = keys[idx];
      try {
        await deleteFromS3(key);
        deleted.push(key);
      } catch (err: any) {
        errors.push({ key, error: err?.message || 'Delete failed' });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, keys.length) }, () => worker()));

  return Response.json({
    success: errors.length === 0,
    deleted: deleted.length,
    failed: errors.length,
    errors,
  }, { status: errors.length ? 207 : 200 });
}



