import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getEventById, getUser, canUserAccessEvent } from '@/lib/db/queries';
import { getEventVersion } from '@/lib/utils/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  const numericEventId = Number(eventId);
  const event = await getEventById(numericEventId);
  if (!event) return new Response('Not found', { status: 404 });
  if (event.chatEnabled === false) return new Response('Chat disabled', { status: 403 });

  // Access check (same as chat GET)
  const cookieKey = `evt:${event.eventCode}:access`;
  const codeFromCookie = (await cookies()).get(cookieKey)?.value?.toUpperCase().trim() || '';
  const codeFromHeader = request.headers.get('x-access-code')?.toUpperCase().trim() || '';
  const user = await getUser();
  const allowed = await canUserAccessEvent(numericEventId, {
    userId: user?.id,
    accessCode: codeFromCookie || codeFromHeader || undefined,
  });
  if (!allowed) return new Response('Forbidden', { status: 403 });

  const encoder = new TextEncoder();
  let lastVersion = await getEventVersion(numericEventId);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Helper to send SSE event lines
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      // Advise client to retry after disconnect
      controller.enqueue(encoder.encode(`retry: 5000\n\n`));
      // Initial version
      send('init', JSON.stringify({ version: lastVersion }));

      // Heartbeat to keep connection alive (every 20s)
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\n`));
        controller.enqueue(encoder.encode(`data: {"t":${Date.now()}}\n\n`));
      }, 20000);

      // Poll event version cheaply; send when it changes
      const interval = setInterval(async () => {
        try {
          const v = await getEventVersion(numericEventId);
          if (v !== lastVersion) {
            lastVersion = v;
            send('version', JSON.stringify({ version: v }));
          }
        } catch {
          // ignore transient errors
        }
      }, 2000);

      const abort = () => {
        clearInterval(interval);
        clearInterval(heartbeat);
        try { controller.close(); } catch {}
      };
      request.signal.addEventListener('abort', abort);
    },
    cancel() {
      // no-op: cleanup handled in abort
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
