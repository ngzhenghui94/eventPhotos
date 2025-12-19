import { requireSuperAdminApi } from '@/lib/auth/admin';
import { getS3ClientInternal, getBucketName } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import JSZip from 'jszip';

export async function POST(request: Request) {
  const user = await requireSuperAdminApi();
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 });
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

  const s3 = getS3ClientInternal();
  const bucket = getBucketName();
  const zip = new JSZip();

  for (const key of keys) {
    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const stream = obj.Body as any as ReadableStream<Uint8Array>;
      const arrayBuffer = await new Response(stream).arrayBuffer();
      // Place object under its key path in the zip
      zip.file(key, arrayBuffer);
    } catch {
      // Skip failed keys
    }
  }

  const content = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return new Response(content as any, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="orphans-${Date.now()}.zip"`,
    },
  });
}


