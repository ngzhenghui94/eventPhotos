import { z } from 'zod';

/**
 * Zod schemas for backend validation
 */
export const photoUploadSchema = z.object({
  eventId: z.number().int().positive(),
  files: z.array(z.object({
    name: z.string().min(1),
    type: z.string().startsWith('image/'),
    size: z.number().positive(),
  })).min(1).max(100), // Reasonable limit for bulk uploads
});

export const photoActionSchema = z.object({
  photoId: z.number().int().positive(),
  eventId: z.number().int().positive().optional(),
});

export const bulkPhotoActionSchema = z.object({
  eventId: z.number().int().positive(),
  photoIds: z.array(z.number().int().positive()).min(1).max(1000),
});

export const guestUploadSchema = z.object({
  eventId: z.number().int().positive(),
  guestName: z.string().trim().min(1).max(100),
  guestEmail: z.string().email().optional().or(z.literal('')),
  files: z.array(z.object({
    name: z.string().min(1),
    type: z.string().startsWith('image/'),
    size: z.number().positive(),
  })).min(1).max(50),
});

export const userSubscriptionSchema = z.object({
  userId: z.number().int().positive(),
  planName: z.string().min(1).max(50),
  subscriptionStatus: z.string().min(1).max(50),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  subscriptionStart: z.date().optional().nullable(),
  subscriptionEnd: z.date().optional().nullable(),
});

export const activityLogSchema = z.object({
  userId: z.number().int().positive(),
  action: z.string().min(1).max(100),
  ipAddress: z.string().ip().optional(),
  detail: z.string().max(1000).optional(),
});

export const eventAccessSchema = z.object({
  eventId: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
  accessCode: z.string().trim().min(1).max(50).optional(),
});

/**
 * Utility functions for schema validation
 */
export class ValidationUtils {
  /**
   * Validates and parses form data using a Zod schema
   */
  static validateFormData<T>(
    formData: FormData,
    schema: z.ZodSchema<T>,
    transformFn?: (data: any) => T
  ): T {
    try {
      const rawData: any = {};
      
      // Convert FormData to plain object
      for (const [key, value] of formData.entries()) {
        if (key.endsWith('[]') || rawData[key] !== undefined) {
          // Handle arrays
          const arrayKey = key.replace('[]', '');
          if (!rawData[arrayKey]) rawData[arrayKey] = [];
          rawData[arrayKey].push(value);
        } else {
          rawData[key] = value;
        }
      }

      // Apply transformation if provided
      const data = transformFn ? transformFn(rawData) : rawData;
      
      // Validate with schema
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Validation error: ${errors}`);
      }
      throw error;
    }
  }

  /**
   * Validates plain object data using a Zod schema
   */
  static validate<T>(data: unknown, schema: z.ZodSchema<T>): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Validation error: ${errors}`);
      }
      throw error;
    }
  }

  /**
   * Safely validates data and returns result with success flag
   */
  static safeParse<T>(data: unknown, schema: z.ZodSchema<T>): {
    success: boolean;
    data?: T;
    error?: string;
  } {
    try {
      const result = schema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        return { success: false, error: `Validation error: ${errors}` };
      }
      return { success: false, error: 'Validation failed' };
    }
  }
}