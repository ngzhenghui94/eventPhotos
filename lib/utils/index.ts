// Backend utilities index - convenient imports for all utility modules

// Database utilities
export {
  withDatabaseErrorHandling,
  findFirst,
  validateRequiredFields,
  safeParseInt,
} from './database';

// Authentication utilities
export { AuthenticationUtils } from './auth';

// File operation utilities
export { FileOperationUtils } from './files';

// Validation utilities with Zod schemas
export {
  ValidationUtils,
  photoUploadSchema,
  photoActionSchema,
  bulkPhotoActionSchema,
  guestUploadSchema,
  userSubscriptionSchema,
  activityLogSchema,
  eventAccessSchema,
} from './validation';

// Event management utilities
export { EventUtils } from './events';

// Performance monitoring utilities
export {
  PerformanceUtils,
  withDatabasePerformanceMonitoring,
} from './performance';

// API response utilities
export {
  ResponseUtils,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type ApiResponse,
} from './responses';

// Re-export common types
export * from '../types/common';