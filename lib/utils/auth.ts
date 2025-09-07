import { getUser } from '@/lib/db/queries';
import { safeParseInt } from '@/lib/utils/database';

/**
 * Common authentication patterns for server actions
 */
export class AuthenticationUtils {
  /**
   * Gets the current user and throws an error if not authenticated
   */
  static async requireAuth() {
    const user = await getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }
    return user;
  }

  /**
   * Extracts and validates photo ID from form data
   */
  static extractPhotoId(formData: FormData): number {
    const photoId = formData.get('photoId') as string;
    return safeParseInt(photoId, 'Photo ID');
  }

  /**
   * Extracts and validates event ID from form data
   */
  static extractEventId(formData: FormData): number {
    const eventId = formData.get('eventId') as string;
    return safeParseInt(eventId, 'Event ID');
  }

  /**
   * Extracts multiple photo IDs from form data and validates them
   */
  static extractPhotoIds(formData: FormData): number[] {
    const rawIds = formData.get('photoIds');
    
    if (!rawIds) {
      throw new Error('No photo IDs provided');
    }

    let photoIds: number[] = [];
    try {
      const parsed = typeof rawIds === 'string' ? JSON.parse(rawIds) : [];
      if (Array.isArray(parsed)) {
        photoIds = parsed.map((n) => {
          const num = Number(n);
          if (!Number.isFinite(num)) {
            throw new Error(`Invalid photo ID: ${n}`);
          }
          return num;
        });
      }
    } catch (error) {
      throw new Error('Invalid photo IDs format');
    }

    if (photoIds.length === 0) {
      throw new Error('No valid photo IDs provided');
    }

    return photoIds;
  }

  /**
   * Redirects to Google auth if user is not authenticated
   */
  static redirectToAuth() {
    const { redirect } = require('next/navigation');
    redirect('/api/auth/google');
  }
}