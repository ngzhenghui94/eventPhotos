# The Crowd Grid (Next.js Event Photo Sharing)

The Crowd Grid is an event photo sharing app built with Next.js App Router, Postgres (Drizzle), Stripe, and S3-compatible storage. Hosts create events, collect/approve guest photos, and share a fast, secure gallery.

Live demo: coming soon.

## Highlights

- Fast, flicker-free gallery with virtualized grid and progressive thumbnails
- Secure, versioned caching and cheap invalidation
- Business plan extras: guest-side “Download All” ZIP
- Event timeline + chat with smart polling
- Collapsible cards with persistent state for a tidy UI

---

## Architecture

- Framework: Next.js App Router (server components + API routes)
- Auth: JWT session cookie; `lib/auth/session.ts` with helpers in `lib/db/queries.ts`
- DB: Postgres via Drizzle; access through `lib/db/queries.ts`
- Storage: S3-compatible (Hetzner), presigned URLs via `lib/s3.ts`
- Payments: Stripe via `lib/payments/stripe.ts`
- Caching: Upstash Redis + client micro-caches

Folder map (selected):
- `app/` App Router pages and API routes
- `components/` UI (gallery, chat, collapsible cards, bulk download)
- `lib/` database, S3, payments, hooks, utils

---

## Features

### Events & Access
- Create/manage events; unique event code + optional 6-char access code
- Guest access stored in a cookie `evt:{eventCode}:access`
- Event timeline (optional) and inline slideshow

### Photos
- Guest and host uploads to S3; presigned upload URLs
- Approval workflow (show only approved photos to guests)
- Progressive image pipeline:
	- Request `/api/photos/[id]/thumb` → 307 redirect to presigned S3 thumbnail
	- Grid uses only thumbnails by default; modal/slideshow upgrades to full image
	- Concurrency gate limits simultaneous image loads; module-level caches prevent re-flicker on remount

### Chat
- Event chat with 3s polling, paused when tab hidden or window unfocused
- Admin and guest chat share the same collapsible pattern and persistence

### Collapsible UI
- Reusable `TimelineCollapsibleCard` wraps major sections
- Collapsed state persists via `localStorage` using a scoped `storageKey`
- Header slot for actions (e.g., plan pill, bulk download button)

### Bulk Download (Business plan)
- Guest page shows a “Download All” button when host plan is Business and the viewer has access
- Streams a ZIP from `/api/photos/bulk-download` with rate limiting and S3 presigned reads

### Payments
- Stripe Checkout and webhook flow, subscription updates wired via helpers

---

## Caching & TTLs

Central config: `lib/config/cache.ts`

- Signed URL mirror: `photo:thumb:url:{photoId}` → 3,500s (~58m)
- Thumb-exists flag: `photo:thumb:exists:{photoId}` → 6h
- Photo meta (eventId/path): `photo:meta:{photoId}` → 7d
- Event stats, lists, and misc TTLs centralized in the same file

Versioned keys per event
- Pointer key: `evt:{eventId}:v` tracks a monotonically increasing version
- Consumers use `versionedKey('evt:{id}:photos', v)` so a single version bump invalidates all derived caches cheaply

Browser/cache headers
- Thumbnails served with `Cache-Control: public, max-age=31536000, immutable`
- App 307 redirects (to S3) include `Cache-Control: private, max-age=60` to reduce repeat hits while scrolling

CDN
- See `docs/hetzner-cdn.md` for a quick Cloudflare/Hetzner setup and an example Nginx config

---

## Image pipeline and https note

- API returns 307 to a presigned S3 URL (saves server bandwidth)
- In production we coerce S3 endpoint to https even if the env value is `http://…` to avoid mixed-content blocked images
	- Code: `lib/s3.ts` and `app/api/photos/[photoId]/thumb/route.ts`

---

## Getting Started

Prereqs: Node 18+, pnpm, Postgres, Stripe account; optional Hetzner S3.

1) Install deps
```bash
pnpm install
```

2) Configure environment
- See `ENVIRONMENT.md` for the full list. Important:
	- `POSTGRES_URL`, `AUTH_SECRET`
	- Hetzner S3: `HETZNER_S3_ENDPOINT` (prefer https), `HETZNER_S3_REGION`, `HETZNER_S3_ACCESS_KEY`, `HETZNER_S3_SECRET_KEY`, `HETZNER_S3_BUCKET`
	- Stripe: `STRIPE_SECRET_KEY`; webhooks to `/api/stripe/webhook`

3) Database
```bash
pnpm db:setup
pnpm db:migrate
pnpm db:seed
```

4) Dev server
```bash
pnpm dev
```

5) Webhooks (local)
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Open http://localhost:3000

---

## Testing Payments

- Card: 4242 4242 4242 4242
- Any future expiry, any CVC

---

## Deploying

1) Push to GitHub and deploy on Vercel
2) Set env vars in Vercel (match `ENVIRONMENT.md`)
3) Stripe: set production webhook to `https://your-domain/api/stripe/webhook`
4) Ensure your S3 endpoint is https (or rely on the https coercion in code)

---

## Notes for Contributors

- Use helpers from `lib/**` (S3, Stripe, queries); avoid instantiating clients inline
- Validate server actions with Zod + `validatedAction` helpers
- Prefer versioned event keys and the query helpers for DB access
