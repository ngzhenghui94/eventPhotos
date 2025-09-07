import { NextResponse } from 'next/server';

/**
 * Standard API response formats
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, any>;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Utilities for standardized API responses
 */
export class ResponseUtils {
  /**
   * Creates a success response
   */
  static success<T>(
    data: T,
    message?: string,
    meta?: Record<string, any>,
    status = 200
  ): NextResponse<ApiSuccessResponse<T>> {
    return NextResponse.json(
      {
        success: true,
        data,
        ...(message && { message }),
        ...(meta && { meta }),
      },
      { status }
    );
  }

  /**
   * Creates an error response
   */
  static error(
    error: string,
    status = 400,
    code?: string,
    details?: Record<string, any>
  ): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      {
        success: false,
        error,
        ...(code && { code }),
        ...(details && { details }),
      },
      { status }
    );
  }

  /**
   * Creates a validation error response
   */
  static validationError(
    message: string,
    fields?: Record<string, string>
  ): NextResponse<ApiErrorResponse> {
    return this.error(message, 422, 'VALIDATION_ERROR', { fields });
  }

  /**
   * Creates an unauthorized response
   */
  static unauthorized(message = 'Unauthorized'): NextResponse<ApiErrorResponse> {
    return this.error(message, 401, 'UNAUTHORIZED');
  }

  /**
   * Creates a forbidden response
   */
  static forbidden(message = 'Forbidden'): NextResponse<ApiErrorResponse> {
    return this.error(message, 403, 'FORBIDDEN');
  }

  /**
   * Creates a not found response
   */
  static notFound(resource = 'Resource'): NextResponse<ApiErrorResponse> {
    return this.error(`${resource} not found`, 404, 'NOT_FOUND');
  }

  /**
   * Creates an internal server error response
   */
  static internalError(
    message = 'Internal server error',
    details?: Record<string, any>
  ): NextResponse<ApiErrorResponse> {
    return this.error(message, 500, 'INTERNAL_ERROR', details);
  }

  /**
   * Wraps an async operation with error handling and standard responses
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    successMessage?: string
  ): Promise<NextResponse<ApiResponse<T>>> {
    try {
      const result = await operation();
      return this.success(result, successMessage);
    } catch (error: any) {
      console.error('API operation failed:', error);
      
      // Handle specific error types
      if (error.message?.includes('Unauthorized')) {
        return this.unauthorized();
      }
      
      if (error.message?.includes('not found')) {
        return this.notFound();
      }
      
      if (error.message?.includes('Validation error')) {
        return this.validationError(error.message);
      }
      
      if (error.message?.includes('permission')) {
        return this.forbidden(error.message);
      }
      
      // Generic error response
      return this.internalError(
        process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'An error occurred while processing your request'
      );
    }
  }

  /**
   * Creates a paginated response
   */
  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string
  ): NextResponse<ApiSuccessResponse<T[]>> {
    const totalPages = Math.ceil(total / limit);
    
    return this.success(
      data,
      message,
      {
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        }
      }
    );
  }

  /**
   * Creates a response with file download headers
   */
  static fileDownload(
    data: Uint8Array | Buffer,
    filename: string,
    mimeType = 'application/octet-stream'
  ): NextResponse {
    const response = new NextResponse(data as any, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': data.length.toString(),
      },
    });
    
    return response;
  }

  /**
   * Creates a redirect response
   */
  static redirect(url: string, status = 302): NextResponse {
    return NextResponse.redirect(url, status);
  }
}