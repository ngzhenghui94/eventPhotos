"use server";

import { z } from 'zod';
import { validatedAction } from '@/lib/auth/middleware';
import { getUserByEmail, createUser, logActivity as dbLogActivity, createPasswordResetToken, resetPasswordByToken } from '@/lib/db/queries';
import { setSession, comparePasswords, hashPassword } from '@/lib/auth/session';
import { createVerificationToken } from '@/lib/auth/verify';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/mailer';
import { ActivityType } from '@/lib/db/schema';

const emailSchema = z.string().email('Enter a valid email').transform((v) => v.toLowerCase());

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const resetRequestSchema = z.object({ email: emailSchema });

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signIn = validatedAction(signInSchema, async ({ email, password }) => {
  const user = await getUserByEmail(email);
  // Use generic error to avoid leaking account existence
  if (!user) return { error: 'Invalid email or password' };
  const ok = await comparePasswords(password, user.passwordHash);
  if (!ok) return { error: 'Invalid email or password' };
  await setSession(user);
  await dbLogActivity({ userId: user.id, action: ActivityType.SIGN_IN, detail: 'Signed in with password' });
  return { success: 'Signed in', redirect: '/dashboard' };
});

export const signUp = validatedAction(signUpSchema, async ({ name, email, password }) => {
  const exists = await getUserByEmail(email);
  if (exists) return { error: 'An account with this email already exists' };
  const passwordHash = await hashPassword(password);
  const user = await createUser({ name, email, passwordHash });
  await setSession(user);
  await dbLogActivity({ userId: user.id, action: ActivityType.SIGN_UP, detail: 'Signed up with email/password' });
  // Send verification email (best-effort)
  try {
    const token = await createVerificationToken(user.id, 60 * 24); // 24h
    await sendVerificationEmail(user.email, token);
  } catch (e) {
    console.error('Failed to send verification email:', e);
  }
  return { success: 'Account created. We sent you a verification email.', redirect: '/dashboard' };
});

export const requestPasswordReset = validatedAction(resetRequestSchema, async ({ email }) => {
  const user = await getUserByEmail(email);
  // Always respond success to prevent user enumeration
  if (user) {
    try {
      const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h
      await createPasswordResetToken(user.id, token, expiresAt);
      await sendPasswordResetEmail(user.email, token);
    } catch (e) {
      console.error('Failed to send reset email:', e);
    }
  }
  return { success: 'If that email exists, we sent a reset link.' };
});

export const resetPassword = validatedAction(resetPasswordSchema, async ({ token, password }) => {
  const hash = await hashPassword(password);
  const ok = await resetPasswordByToken(token, hash);
  if (!ok) return { error: 'Reset link is invalid or expired' };
  return { success: 'Password updated. You can sign in now.', redirect: '/sign-in' };
});

// Basic signOut function
export async function signOut() {
  // Clear session cookie or perform sign out logic
  // This is a placeholder; actual implementation may vary
  return true;
}

// Log sign-in activity
export async function logActivity(
  _teamId: number | null | undefined,
  userId: number,
  type: any,
  ipAddress?: string
) {
  const { logActivity: dbLogActivity } = await import('@/lib/db/queries');
  await dbLogActivity({
    userId,
    action: typeof type === 'string' ? type : 'SIGN_IN',
    ipAddress,
    detail: 'User signed in',
  });
}


