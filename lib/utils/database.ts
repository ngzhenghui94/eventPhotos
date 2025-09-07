import { db } from '@/lib/db/drizzle';
import type { DatabaseError } from '@/lib/types/common';

/**
 * Wraps database operations with proper error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const dbError = error as DatabaseError;
    console.error(`Database error in ${operationName}:`, dbError);
    
    // Handle specific database errors
    if (dbError.code === '23505') { // Unique constraint violation
      throw new Error(`Duplicate entry: ${dbError.constraint || 'unknown constraint'}`);
    }
    if (dbError.code === '23503') { // Foreign key constraint violation
      throw new Error(`Referenced record not found: ${dbError.constraint || 'unknown constraint'}`);
    }
    
    throw new Error(`Database operation failed: ${operationName}`);
  }
}

/**
 * Executes a query and returns the first result or null
 */
export async function findFirst<T>(
  query: Promise<T[]>
): Promise<T | null> {
  const results = await query;
  return results[0] || null;
}

/**
 * Validates that required fields are present and not empty
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
}

/**
 * Safely converts string to number, throws error if invalid
 */
export function safeParseInt(value: string | undefined | null, fieldName: string): number {
  if (!value || value.trim() === '') {
    throw new Error(`${fieldName} is required`);
  }
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  
  return parsed;
}

/**
 * Creates a consistent query to check if a user owns a resource
 */
export async function verifyUserOwnership(
  tableName: string,
  resourceId: number,
  userId: number,
  resourceIdField = 'id',
  ownerField = 'createdBy'
): Promise<void> {
  // This is a simplified version - in practice you'd need to pass the actual table reference
  // For now, this serves as a pattern for ownership verification
  throw new Error('verifyUserOwnership not implemented for generic tables');
}