## Functions Reference

Key exported functions grouped by module. Import paths are relative to `@/lib/**`.

Note: Examples use TypeScript. Replace with your runtime context as needed.

---

### Auth: `lib/auth/session.ts`

- `hashPassword(password: string): Promise<string>`
- `comparePasswords(plain: string, hashed: string): Promise<boolean>`
- `signToken(payload: { user: { id: number }; expires: string }): Promise<string>`
- `verifyToken(input: string): Promise<{ user: { id: number }; expires: string }>`
- `getSession(): Promise<{ user: { id: number }; expires: string } | null>`
- `setSession(user: NewUser): Promise<void>`

Usage:
```ts
import { setSession, getSession } from '@/lib/auth/session';
```

### Auth (Google OAuth): `lib/auth/google.ts`

- `getGoogleClientId(): string`
- `getGoogleClientSecret(): string`
- `buildRedirectUri(origin: string): string`
- `buildGoogleAuthUrl({ state, origin }: { state: string; origin: string }): string`
- `exchangeCodeForTokens({ code, origin }): Promise<{ access_token: string }>`
- `fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo>`
- `makeStateToken(): string`
- `setOAuthCookies(state: string, redirect?: string | null): Promise<void>`
- `readAndClearOAuthCookies(): Promise<{ state?: string; redirect?: string | undefined }>`

### Validation helpers for server actions: `lib/auth/middleware.ts`

- `validatedAction(schema, action)`
- `validatedActionWithUser(schema, action)`
  - Wrap Zod validation and (optionally) require an authenticated user before invoking the action.

Example:
```ts
export const myAction = validatedActionWithUser(mySchema, async (data, _formData, user) => {
  // ...
  return { success: true };
});
```

---

### Caching: `lib/utils/cache.ts`

- `getCache<T>(key): Promise<T | null>`
- `setCache<T>(key, value, ttlSeconds): Promise<void>`
- `delCache(key): Promise<void>`
- `cacheWrap<T>(key, ttlSeconds, loader): Promise<T>`
- `getEventVersion(eventId): Promise<number>`
- `bumpEventVersion(eventId): Promise<number>`
- `versionedKey(eventId, suffix): Promise<string>`
- `versionedCacheWrap<T>(eventId, suffix, ttlSeconds, loader): Promise<T>`
- `getEventStatsCached(eventId): Promise<EventStats | null>`
- `setEventStatsCached(eventId, stats): Promise<void>`

---

### Database Queries: `lib/db/queries.ts`

User:
- `getUser()`
- `updateUserSubscription(data)`
- `findUserByEmail(email)`

Events:
- `getEventById(eventId)`
- `getEventByAccessCode(code)`
- `getEventByEventCode(code)`
- `getUserEvents(userId)`
- `getUserEventsStats(userId, filterEventIds?)`

Event Access & Roles:
- `canUserAccessEvent(eventId, { userId?, accessCode? })`
- `getUserEventRole(eventId, userId)`
- `isEventMember(eventId, userId)`
- `canRoleManageEvent(role)`
- `canRoleManageTimeline(role)`
- `canRoleUpload(role)`
- `listEventMembers(eventId)`
- `listEventMembersWithUsers(eventId)`
- `addOrUpdateEventMember(eventId, userId, role)`
- `removeEventMember(eventId, userId)`

Photos:
- `getPhotoById(photoId)`
- `getPhotosForEvent(eventId)`
- `getEventWithPhotos(eventId, { approvedOnly? })`

Timeline:
- `getEventTimeline(eventId)`
- `createEventTimelineEntry(data)`
- `updateEventTimelineEntry(id, data)`
- `deleteEventTimelineEntry(id)`
- `getTimelineEntryById(id)`

Activity & Stats:
- `logActivity(data)`
- `getActivityLogs(eventId, { limit?, offset? })`
- `getEventStats(eventId)`

---

### S3 Utilities: `lib/s3.ts`

- `uploadToS3(key, file: Buffer, contentType): Promise<string>`
- `getSignedDownloadUrl(key, expiresIn?, options?): Promise<string>`
- `getSignedUploadUrl(key, contentType?, expiresIn?): Promise<string>`
- `deleteFromS3(key): Promise<void>`
- `deleteManyFromS3(keys: string[]): Promise<void>`
- `deleteManyFromS3Detailed(keys: string[]): Promise<{ deleted: string[]; errors: { key: string; error: string }[] }>`
- `generatePhotoKey(eventId, fileName): string`
- `deriveThumbKey(originalKey, size?): string`
- `listAllObjects(prefix?): Promise<S3ObjectInfo[]>`

---

### Plans & Limits: `lib/plans.ts`

- `normalizePlanName(name?): PlanName`
- `uploadLimitBytes(plan): number`
- `eventLimit(plan): number | null`
- `photoLimitPerEvent(plan): number | null`
- `concurrentUploadLimit(plan): number`

---

### Photo Actions (Server): `lib/photos/actions.ts`

- `uploadPhotosAction(formData)`
- `deletePhotoAction(formData)`
- `deletePhotosBulkAction(formData)`
- `createSignedUploadUrlsAction(eventId, files, planName?)`
- `finalizeUploadedPhotosAction(eventId, uploaded)`

Example (client-side usage for presign + finalize is implemented in `components/photo-upload.tsx`).

### Guest Photo Actions (Server): `lib/photos/guest-actions.ts`

- `uploadGuestPhotosAction(formData)`

---

### Event Actions (Server): `lib/events/actions.ts`

- `createEvent` (validated action)
- `updateEvent` (validated action)
- `deleteEvent` (validated action)
- `generateAccessCode(): string`
- `generateEventCode(): string`

---

### Payments: `lib/payments/stripe.ts`

- `createCheckoutSession({ priceId })`
- `createCustomerPortalSession()`
- `handleSubscriptionChange(subscription)`
- `getStripePrices()`
- `getStripeProducts()`

---

### Misc Utilities

- `lib/utils.ts` — `cn(...classes)` class name combiner
- `lib/utils/validation.ts` — Zod schemas: `photoUploadSchema`, `guestUploadSchema`, etc.
- `lib/utils/database.ts` — `withDatabaseErrorHandling`, `findFirst`, `validateRequiredFields`, `safeParseInt`
- `lib/utils/frontend-performance.ts` — Metrics helpers and event tracking utilities

