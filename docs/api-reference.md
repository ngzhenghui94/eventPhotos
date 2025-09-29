## API Reference

This document lists the public HTTP APIs exposed under `app/api/**`. Unless noted, responses are JSON. Authenticated endpoints require a `session` cookie (issued after Google SSO).

### General

- **Auth**: Login via Google (`/api/auth/google`). After login, a `session` cookie is set.
- **Access codes**: For private events, provide a 6-character access code via one of:
  - Header `x-access-code: ABC123`
  - Query string `?code=ABC123`
  - Cookie `evt:{eventCode}:access=ABC123` (set by UI when the user enters the code)
- **Images**: Image endpoints return 307 redirects to presigned S3 URLs with cache headers. Thumbnails are served as WebP.

---

### Auth & User

- GET `/api/auth/google`
  - Starts Google OAuth flow. Redirects to Google.
  - Example:
    ```bash
    curl -I "http://localhost:3000/api/auth/google?redirect=/dashboard"
    ```

- GET `/api/auth/google/callback`
  - OAuth callback (handled by Google). Exchanges code, creates/updates user, sets `session` cookie, then redirects to a safe local URL.
  - Not intended for manual calls.

- POST `/api/auth/signout`
  - Logs the current user out (deletes `session` cookie).
  - Example:
    ```bash
    curl -X POST http://localhost:3000/api/auth/signout
    ```

- GET `/api/user`
  - Returns the current user or `null` if unauthenticated.
  - Example:
    ```bash
    curl http://localhost:3000/api/user
    ```

- POST `/api/user/update`
  - Updates current user fields (implementation-specific validation). Requires auth.

- POST `/api/user/delete`
  - Deletes current user (soft/hard delete depending on implementation). Requires auth.

---

### Events

- GET `/api/events`
  - Returns all events the user owns or is a member of, with photo counts. Requires auth.
  - Example:
    ```bash
    curl --cookie "session=..." http://localhost:3000/api/events
    ```

- POST `/api/events`
  - Currently disabled in this codebase (returns 403). Event creation is handled via server actions instead.

- GET `/api/events/[eventId]`
  - Returns event metadata and photos for the event. Requires either a signed-in user with access or a valid access code for private events.
  - Access code options: header `x-access-code`, query `?code=...`, or cookie `evt:{eventCode}:access`.
  - Response includes `photos` where `filePath` is a proxy path like `/api/photos/{photoId}` (use that to fetch the actual image or thumbnail).
  - Example:
    ```bash
    curl -H "x-access-code: ABC123" http://localhost:3000/api/events/123
    ```

- GET `/api/events/[eventId]/stats`
  - Returns aggregate stats for the event (total, approved, pending, last upload/download). Same access rules as above.
  - Example:
    ```bash
    curl -H "x-access-code: ABC123" http://localhost:3000/api/events/123/stats
    ```

- GET `/api/events/[eventId]/ics`
  - Returns an ICS calendar file for the event.

- GET `/api/events/[eventId]/host-plan`
  - Returns the host's plan information for the event.

#### Event Members

- GET `/api/events/[eventId]/members`
  - Lists members for an event with user details. Requires auth and host/organizer-level permission.

- POST `/api/events/[eventId]/members`
  - Adds or updates a member by email.
  - Body:
    ```json
    { "email": "person@example.com", "role": "organizer" }
    ```

- DELETE `/api/events/[eventId]/members`
  - Removes a member by `userId`.
  - Body:
    ```json
    { "userId": 42 }
    ```

#### Event Chat

- GET `/api/events/[eventId]/chat`
- POST `/api/events/[eventId]/chat`
- DELETE `/api/events/[eventId]/chat`
  - CRUD operations for event chat messages. Requires appropriate access.

- GET `/api/events/[eventId]/chat/stream`
  - Streams chat updates (e.g., Server-Sent Events or streaming responses). Suitable for live updates.

---

### Photos

Preferred flow is presigned direct uploads to S3:
1) Presign: client asks server for presigned `PUT` URLs
2) Upload: client uploads files directly to S3
3) Finalize: client notifies server with uploaded metadata

- POST `/api/photos/presign`
  - Body:
    ```json
    {
      "eventId": 123,
      "files": [ { "name": "a.jpg", "type": "image/jpeg", "size": 12345 } ],
      "accessCode": "ABC123" // optional for private events if unauthenticated
    }
    ```
  - Response:
    ```json
    {
      "uploads": [
        {
          "key": "events/123/photos/1700000000-xyz.jpg",
          "url": "https://s3.example.com/...",
          "originalFilename": "a.jpg",
          "mimeType": "image/jpeg",
          "fileSize": 12345
        }
      ],
      "maxFileSize": 52428800
    }
    ```

- POST `/api/photos/finalize`
  - Body:
    ```json
    {
      "eventId": 123,
      "items": [
        { "key": "events/123/photos/1700000000-xyz.jpg", "originalFilename": "a.jpg", "mimeType": "image/jpeg", "fileSize": 12345 }
      ]
    }
    ```
  - Records uploaded photos in the database, bumps caches, and precomputes thumbnails (fire-and-forget).

- POST `/api/photos`
  - Legacy direct upload (multipart form-data). Soft limit ~8MB; prefer presigned flow for larger files or concurrency.
  - Form fields: `eventId` (number), `file` (image/*)

- POST `/api/photos/guest/presign`
  - Same as host presign but validates access via event code for private events.

- POST `/api/photos/guest/finalize`
  - Body:
    ```json
    {
      "eventId": 123,
      "guestName": "Alice",
      "guestEmail": "alice@example.com",
      "items": [
        { "key": "events/123/photos/1700000000-xyz.jpg", "originalFilename": "a.jpg", "mimeType": "image/jpeg", "fileSize": 12345 }
      ]
    }
    ```

- GET `/api/photos/[photoId]`
  - Returns the original photo (typically a redirect/proxy to S3). Subject to the same access rules as the parent event.

- GET `/api/photos/[photoId]/thumb`
  - Returns a WebP thumbnail via 307 redirect to S3, with short-lived cache and CDN-friendly headers. Generates on-demand if missing.
  - Example:
    ```bash
    curl -i "http://localhost:3000/api/photos/100/thumb?code=ABC123"
    ```

- GET `/api/photos/[photoId]/download`
  - Returns a download stream (signed S3). May include `Content-Disposition`.

- GET `/api/photos/[photoId]/meta`
  - Returns metadata for a photo (id, filenames, mime type, size, etc.).

- POST `/api/photos/[photoId]/delete`
  - Deletes a single photo (owner/uploader/super-admin only). See server actions for bulk delete in the UI.

- POST `/api/photos/bulk-download`
  - Streams a ZIP containing approved photos (Business plan feature). Rate limited.

---

### Timeline

- POST `/api/timeline/create`
- POST `/api/timeline/update`
- POST `/api/timeline/delete`
  - Create, modify, or delete timeline entries for an event. Requires host/organizer-level permissions.

- GET `/api/timeline/[id]/ics`
  - Returns an ICS entry for a timeline item.

---

### Dashboard

- GET `/api/dashboard-info`
- POST `/api/dashboard/stats`
  - Returns information/stats for the dashboard views. Requires auth.

---

### Stripe & Payments

- GET `/api/stripe/start`
- GET `/api/stripe/checkout`
  - Initiates checkout flows. Returns redirects to Stripe Checkout as needed.

- POST `/api/stripe/webhook`
  - Stripe webhook receiver for subscription lifecycle updates.

---

### Admin (Super Admin Only)

These endpoints are intended for system operators. They require elevated privileges and are not exposed in the public UI:

- `/api/admin/users/[userId]/owner` (POST)
- `/api/admin/users/[userId]/plan` (POST)
- `/api/admin/users/[userId]/role` (POST)
- `/api/admin/events/[eventId]/delete` (POST)
- `/api/admin/photos/[photoId]/approve` (POST)
- `/api/admin/photos/[photoId]/delete` (POST)
- `/api/admin/storage/orphans` (GET)
- `/api/admin/storage/download` (POST)
- `/api/admin/storage/delete` (POST)

---

### Demo

- GET `/api/demo/event`
  - Ensures/returns a demo event for the provided email or environment. May enforce simple rate limits in demo mode.

