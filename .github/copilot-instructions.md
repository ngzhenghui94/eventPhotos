# Copilot instructions for this repo

This is a Next.js App Router SaaS app with Postgres (Drizzle ORM), Stripe, and S3-backed photo storage. Follow these conventions and use the referenced modules when adding features.

## Architecture and data flow
- Routing: App Router under `app/`. API routes live in `app/api/**/route.ts`. Dashboard pages are under `app/(dashboard)/**` and are protected by `middleware.ts`.
- Auth/session: JWT stored in a `session` cookie using `lib/auth/session.ts`. Always get the current user via `lib/db/queries.ts:getUser()` (it verifies cookie expiry and filters soft-deleted users).
- DB: Use Drizzle via `lib/db/drizzle.ts` and schema in `lib/db/schema.ts`. Prefer query helpers in `lib/db/queries.ts` wrapped with `withDatabaseErrorHandling` from `lib/utils/database.ts`.
- Storage: Photos are stored in S3-compatible storage (Hetzner). Use `lib/s3.ts` for upload/download URL generation and key helpers. Don’t construct S3 clients inline.
- Payments: Use `lib/payments/stripe.ts` for Stripe initialization and flows (checkout, webhook handling, subscription updates).

## Key conventions and patterns
- Database
  - Import `db` from `lib/db/drizzle.ts`. Use typed schema tables from `lib/db/schema.ts`.
  - Wrap all DB operations with `withDatabaseErrorHandling(operation, name)` and use `findFirst()` for single-row selects.
  - Shared types are in `lib/types/common.ts` (e.g., `PaginationOptions`, `PhotoData`). Reuse them instead of redefining shapes.
- Validation + server actions
  - Use `validatedAction` and `validatedActionWithUser` from `lib/auth/middleware.ts` with Zod schemas to validate `FormData` for server actions.
- Authz and access
  - For event access checks, reuse `canUserAccessEvent(eventId, { userId?, accessCode? })` from `lib/db/queries.ts`.
  - Ownership helpers are not generalized; avoid calling `verifyUserOwnership` (not implemented).
- S3
  - Generate keys with `generatePhotoKey(eventId, fileName)`; derive thumbs via `deriveThumbKey(key)`.
  - For client uploads, issue presigned URLs via `getSignedUploadUrl`. For downloads, use `getSignedDownloadUrl` with optional `contentDisposition`.
- Stripe
  - Use `createCheckoutSession`, `getStripePrices`, `getStripeProducts`, and `handleSubscriptionChange`. Do not new up `Stripe()` elsewhere.
  - `handleSubscriptionChange` updates user subscription fields via `updateUserSubscription`.
- Middleware
  - `middleware.ts` refreshes the `session` cookie for GETs and redirects unauthenticated users accessing `/dashboard`.

## Environment and configuration
- Required envs: see `ENVIRONMENT.md`. Note: `lib/s3.ts` expects Hetzner S3 vars: `HETZNER_S3_ENDPOINT`, `HETZNER_S3_REGION`, `HETZNER_S3_ACCESS_KEY`, `HETZNER_S3_SECRET_KEY`, `HETZNER_S3_BUCKET`.
- Database URL must be `POSTGRES_URL`. Auth uses `AUTH_SECRET` for JWT signing.
- For Stripe, set `STRIPE_SECRET_KEY` and run webhooks to `app/api/stripe/webhook/route.ts`.

## Developer workflows
- Install and run:
  - `pnpm install`
  - Setup DB/env: `pnpm db:setup`, then `pnpm db:migrate` and `pnpm db:seed`
  - Dev server: `pnpm dev` (Next.js)
  - Drizzle: `db:generate`, `db:migrate`, `db:studio` available in `package.json`.
- Webhooks (local): `stripe listen --forward-to localhost:3000/api/stripe/webhook`

## Examples
- Single user fetch with safety:
  - `const user = await getUser(); if (!user) return NextResponse.redirect('/api/auth/google');`
- Safe select one row:
  - `const event = await withDatabaseErrorHandling(() => findFirst(db.query.events.findMany({ where: eq(events.id, id), limit: 1 })), 'getEventById');`
- Presigned upload URL:
  - `const url = await getSignedUploadUrl(generatePhotoKey(eventId, file.name), file.type);`

Adhere to these modules and patterns. If adding new areas, mirror structure under `lib/**` and `app/api/**` and centralize cross-cutting logic similarly.

## Do / Don't (Common Pitfalls)

**Do:**
- Use query helpers in `lib/db/queries.ts` for all DB access; always wrap with `withDatabaseErrorHandling`.
- Validate all server actions with `validatedAction` or `validatedActionWithUser`.
- Use provided S3 helpers (`generatePhotoKey`, `getSignedUploadUrl`, etc.) for all photo storage operations.
- Use Stripe helpers in `lib/payments/stripe.ts` for payments and subscription logic.
- Reference shared types from `lib/types/common.ts` for API/data shapes.
- Keep new logic modular and place cross-cutting concerns in `lib/**`.
- Use environment variables as documented in `ENVIRONMENT.md`.

**Don't:**
- Don’t instantiate new S3 or Stripe clients outside their respective helpers (`lib/s3.ts`, `lib/payments/stripe.ts`).
- Don’t bypass query helpers or access Drizzle directly in feature code.
- Don’t redefine types already present in `lib/types/common.ts`.
- Don’t skip validation for server actions or API inputs.
- Don’t use the unimplemented `verifyUserOwnership` (ownership checks are not generalized).
- Don’t hardcode secrets, keys, or config—always use env vars.
- Don’t add business logic directly to API route handlers; use helpers/services in `lib/**`.
