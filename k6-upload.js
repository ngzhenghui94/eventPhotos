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
const filePart = http.file(bin, 'test.jpg', 'image/jpeg');

// Replace with your values
const EVENT_ID = 9; // numeric DB id
const URL = 'http://localhost:3000/api/photos'; // omit ?code= if not needed

export default function () {
  const res = http.post(URL, {
    eventId: String(EVENT_ID),
    uploaderName: 'k6',
    uploaderEmail: 'k6@example.com',
    file: filePart,
  });

  check(res, { created: r => r.status === 201 }) || console.error(res.status, res.body?.slice(0, 200));
}