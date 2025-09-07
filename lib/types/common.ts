// Common type definitions for backend operations
export interface DatabaseError extends Error {
  code?: string;
  constraint?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface UserSubscriptionData {
  userId: number;
  planName: string;
  subscriptionStatus: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStart?: Date | null;
  subscriptionEnd?: Date | null;
}

export interface ActivityLogData {
  userId: number;
  action: string;
  ipAddress?: string;
  detail?: string;
}

export interface EventAccessOptions {
  userId?: number;
  accessCode?: string;
}

export interface PhotoData {
  id: number;
  filename: string;
  filePath: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  eventId: number;
  uploadedAt: Date;
  isApproved: boolean;
  uploadedBy: number | null;
  guestName: string | null;
  guestEmail: string | null;
}

export interface EventWithPhotoCount {
  id: number;
  name: string;
  description: string | null;
  date: Date; // This should match the schema - NOT NULL
  location: string | null;
  eventCode: string;
  accessCode: string;
  createdBy: number;
  isPublic: boolean;
  allowGuestUploads: boolean;
  requireApproval: boolean;
  createdAt: Date;
  updatedAt: Date;
  photoCount: number;
}