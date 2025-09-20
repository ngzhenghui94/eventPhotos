// Centralized cache and expiry configuration
// Keep values here to avoid drift across Redis mirrors, signed URLs, and client caches.

// S3 signed URL lifetimes
export const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour
export const SIGNED_URL_REDIS_MIRROR_SECONDS = 3500; // slightly below signed URL expiry

// Photo metadata cache (photoId -> eventId/path)
export const PHOTO_META_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Event-related caches
export const EVENT_TIMELINE_TTL_SECONDS = 120; // 2 minutes
export const EVENT_BY_ID_TTL_SECONDS = 300; // 5 minutes
export const EVENT_BY_CODE_TTL_SECONDS = 300; // 5 minutes
export const EVENT_PHOTOS_TTL_SECONDS = 120; // 2 minutes
export const EVENT_PHOTO_COUNT_TTL_SECONDS = 300; // 5 minutes
export const USER_EVENTS_LIST_TTL_SECONDS = 300; // 5 minutes

// Client-side in-memory caches (milliseconds)
export const CLIENT_PHOTOS_STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

// Thumbnail object browser cache headers
export const THUMBNAIL_MAX_AGE_SECONDS = 31536000; // 1 year
export const THUMBNAIL_CACHE_CONTROL = `public, max-age=${THUMBNAIL_MAX_AGE_SECONDS}, immutable`;
