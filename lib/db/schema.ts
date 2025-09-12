import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pgTable as table } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  isOwner: boolean('is_owner').notNull().default(false),
  planName: varchar('plan_name', { length: 50 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  subscriptionStatus: varchar('subscription_status', { length: 50 }),
  subscriptionStart: timestamp('subscription_start'),
  subscriptionEnd: timestamp('subscription_end'),
  emailVerifiedAt: timestamp('email_verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Teams feature removed

// Timeline table for event flows
export const eventTimelines = pgTable('event_timelines', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  location: varchar('location', { length: 255 }),
  time: timestamp('time').notNull(), // When this timeline entry occurs
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const eventTimelinesRelations = relations(eventTimelines, ({ one }) => ({
  event: one(events, {
    fields: [eventTimelines.eventId],
    references: [events.id],
  }),
}));

// Consolidated Events/Photos schema (access code, approvals, and file-based photo path)
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  date: timestamp('date').notNull(),
  location: varchar('location', { length: 255 }),
  category: varchar('category', { length: 32 }).notNull().default('General'),
  eventCode: varchar('event_code', { length: 50 }).notNull().unique(),
  accessCode: varchar('access_code', { length: 50 }).notNull().unique(),
  createdBy: integer('created_by').notNull().references(() => users.id),
  isPublic: boolean('is_public').notNull().default(false),
  allowGuestUploads: boolean('allow_guest_uploads').notNull().default(true),
  requireApproval: boolean('require_approval').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const photos = pgTable('photos', {
  id: serial('id').primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  filePath: text('file_path').notNull(),
  eventId: integer('event_id').notNull().references(() => events.id),
  uploadedBy: integer('uploaded_by').references(() => users.id), // null for guest uploads
  guestName: varchar('guest_name', { length: 100 }),
  guestEmail: varchar('guest_email', { length: 255 }),
  isApproved: boolean('is_approved').notNull().default(true),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  detail: text('detail'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

// Email verification tokens
export const verificationTokens = pgTable('verification_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Teams relations removed
export const usersRelations = relations(users, ({ many }) => ({
  invitationsSent: many(invitations),
  ownedEvents: many(events),
  uploadedPhotos: many(photos),
}));
export const invitationsRelations = relations(invitations, ({ one }) => ({
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  photos: many(photos),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  event: one(events, {
    fields: [photos.eventId],
    references: [events.id],
  }),
  uploadedBy: one(users, {
    fields: [photos.uploadedBy],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;

export type EventTimeline = typeof eventTimelines.$inferSelect;
export type NewEventTimeline = typeof eventTimelines.$inferInsert;

export type EventWithPhotos = Event & {
  photos: Photo[];
  createdBy: Pick<User, 'id' | 'name' | 'email'>;
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_EVENT = 'CREATE_EVENT',
  UPDATE_EVENT = 'UPDATE_EVENT',
  DELETE_EVENT = 'DELETE_EVENT',
  UPLOAD_PHOTO = 'UPLOAD_PHOTO',
  DELETE_PHOTO = 'DELETE_PHOTO',
  APPROVE_PHOTO = 'APPROVE_PHOTO',
}
