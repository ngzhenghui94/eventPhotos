import { requireSuperAdmin } from '@/lib/auth/admin';
import { deleteFromS3 } from '@/lib/s3';

export async function POST(request: Request) {
  await requireSuperAdmin();
  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const keys = Array.isArray(body?.keys) ? body.keys.filter((k: any) => typeof k === 'string') : [];
  if (!keys.length) {
    return Response.json({ error: 'No keys provided' }, { status: 400 });
  }
  const results: { key: string; ok: boolean; error?: string }[] = [];
  for (const key of keys) {
    try {
      await deleteFromS3(key);
      results.push({ key, ok: true });
    } catch (e: any) {
      results.push({ key, ok: false, error: e?.message || 'Delete failed' });
    }
  }
  return Response.json({ deleted: results.filter(r => r.ok).length, results });
}


