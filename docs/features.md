## Features Guide

This guide explains how the major features fit together and how to use them from both the UI and API.

---

### Events & Access

- Hosts create events with an `eventCode` (URL slug) and a 6-character `accessCode` for private access.
- Private event access can be provided by:
  - Entering the code in the UI (sets `evt:{eventCode}:access` cookie)
  - Supplying `x-access-code` header or `?code=` on API requests

Recommended flows:
- Hosts manage events via the dashboard (create, edit, delete)
- Hosts invite collaborators using the Members panel (roles: host, organizer, photographer, customer)

---

### Photo Uploading

Two flows are supported:

1) Presigned direct-to-S3 (recommended)
   - Host: `/api/photos/presign` -> upload to S3 -> `/api/photos/finalize`
   - Guest: `/api/photos/guest/presign` -> upload -> `/api/photos/guest/finalize`
   - Benefits: concurrency, large files, minimal server bandwidth

2) Legacy multipart upload
   - `POST /api/photos` with `multipart/form-data` (soft limit ~8MB)

Limits vary by host plan (`lib/plans.ts`), including per-file size, per-event photo caps, and client concurrency.

---

### Image Pipeline

- Original photos are stored in S3 under `events/{eventId}/photos/...`.
- Thumbnails (WebP) are precomputed and served from `thumbs/sm-*` (on-demand generation as fallback).
- Endpoints return 307 redirects to signed S3 URLs and set browser/CDN cache headers for optimal scrolling performance.

---

### Event Timeline

- Hosts can add, edit, and reorganize timeline entries (title, time, etc.).
- The public event page displays a read-only timeline; hosts can export ICS entries for reminders.

---

### Chat

- Event chat supports polling/streaming for low-latency updates.
- The UI pauses polling when the tab is hidden or unfocused to save resources.

---

### Caching Strategy

- Upstash Redis stores short-lived mirrors of signed URLs and small JSON objects.
- Versioned event cache keys (`evt:{eventId}:v{N}:...`) enable cheap invalidation by bumping a single pointer.
- TTLs are centralized in `lib/config/cache.ts`.

---

### Payments

- Stripe Checkout flows upgrade the host's plan; webhooks update subscription status.
- Higher plans unlock features like bulk ZIP download and larger upload sizes.

---

### Security Notes

- Sessions are stored as signed JWTs in HTTP-only cookies.
- S3 endpoints are coerced to `https://` in production to avoid mixed-content issues with presigned URLs.
- Private event content requires either a logged-in user with access or a valid access code.

