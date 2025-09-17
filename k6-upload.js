import http from 'k6/http';
import { check } from 'k6';

// Run 100 VUs
export const options = {
  stages: [
    { duration: '5s', target: 100 },
    { duration: '20s', target: 100 },
  ],
};

// Load file at init (required)
const bin = open('./fixtures/test.jpg', 'b');
const fileSizeBytes = (bin && typeof bin.byteLength === 'number') ? bin.byteLength : (bin?.length || 0);

// Replace with your values
const EVENT_ID = 9; // numeric DB id
const ORIGIN = 'http://localhost:3000';
const ACCESS_CODE = 'SRSR1B'; // optional: set if event is private (6-char code)
const FILE_NAME = 'test.jpg';
const MIME = 'image/jpeg';

export default function () {
  // 1) Request presigned URL(s)
  const presignRes = http.post(
    `${ORIGIN}/api/photos/guest/presign`,
    JSON.stringify({
      eventId: EVENT_ID,
      files: [{ name: FILE_NAME, type: MIME, size: fileSizeBytes }],
      accessCode: ACCESS_CODE || undefined,
    }),
    { headers: { 'Content-Type': 'application/json', ...(ACCESS_CODE ? { 'x-access-code': ACCESS_CODE } : {}) } }
  );

  const okPresign = check(presignRes, {
    'presign 200': (r) => r.status === 200,
    'has uploads': (r) => (r.json('uploads') || []).length > 0,
  });
  if (!okPresign) {
    console.error('presign failed', presignRes.status, presignRes.body && String(presignRes.body).slice(0, 200));
    return;
  }
  const upload = presignRes.json('uploads')[0];

  // 2) PUT file directly to S3 using presigned URL
  const putRes = http.put(upload.url, bin, { headers: { 'Content-Type': MIME } });
  const okPut = check(putRes, {
    'put 200-204': (r) => r.status >= 200 && r.status < 205,
  });
  if (!okPut) {
    console.error('put failed', putRes.status, putRes.body && String(putRes.body).slice(0, 200));
    return;
  }

  // 3) Finalize to create DB record(s)
  const finalizeRes = http.post(
    `${ORIGIN}/api/photos/guest/finalize`,
    JSON.stringify({
      eventId: EVENT_ID,
      guestName: 'k6',
      guestEmail: 'k6@example.com',
      items: [
        {
          key: upload.key,
          originalFilename: upload.originalFilename,
          mimeType: MIME,
          fileSize: fileSizeBytes,
        },
      ],
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(finalizeRes, { finalized: (r) => r.status === 200 });
}