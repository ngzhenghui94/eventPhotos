import { NextRequest } from 'next/server';
import { getDemoEvent } from '@/lib/db/demo';

export async function GET(_req: NextRequest) {
  const demoOwner = process.env.DEMO_OWNER_EMAIL || 'ngzhenghui94@gmail.com';

  try {
    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
    });

    const demoPromise = getDemoEvent(demoOwner);
    const demo = await Promise.race([demoPromise, timeoutPromise]);

    return Response.json(demo);
  } catch (error) {
    console.error('Demo event API error:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message === 'Request timeout') {
        return Response.json(
          { error: 'Request timed out. Please try again.' },
          { status: 408 }
        );
      }

      // Check for database-related errors
      if (error.message.includes('connect') || error.message.includes('pool')) {
        return Response.json(
          { error: 'Database connection issue. Please try again later.' },
          { status: 503 }
        );
      }
    }

    return Response.json(
      { error: 'Failed to load demo event. Please try again.' },
      { status: 500 }
    );
  }
}
