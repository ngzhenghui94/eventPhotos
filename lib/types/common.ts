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
  userId?: number | null;
  eventId?: number | null;
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
  date: Date | null;
  location: string | null;
  category: string;
  eventCode: string;
  accessCode: string;
  createdBy: number;
  isPublic: boolean;
  allowGuestUploads: boolean;
  requireApproval: boolean;
  createdAt: Date;
  updatedAt: Date;
  photoCount: number;
  approvedCount?: number;
  pendingCount?: number;
  lastUploadAt?: Date | null;
  role?: 'host' | 'organizer' | 'photographer' | 'customer' | null;
}

export interface EventStats {
  totalPhotos: number;
  approvedPhotos: number;
  pendingApprovals: number;
  lastUploadAt: string | null;
  lastDownloadAt?: string | null;
}

// Event roles and membership
export type EventRole = 'host' | 'organizer' | 'photographer' | 'customer';

export interface EventMember {
  id: number;
  eventId: number;
  userId: number;
  role: EventRole;
  createdAt: Date;
  updatedAt: Date;
}