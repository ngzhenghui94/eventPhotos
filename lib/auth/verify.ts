import { randomBytes } from 'crypto';
import { db } from '@/lib/db/drizzle';
import { users, verificationTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withDatabaseErrorHandling, findFirst } from '@/lib/utils/database';

export function createToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createVerificationToken(userId: number, ttlMinutes = 60) {
  const token = createToken();
  const expires = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await withDatabaseErrorHandling(async () => {
    // Optional: delete existing tokens for this user
    await db.delete(verificationTokens).where(eq(verificationTokens.userId, userId));
    await db.insert(verificationTokens).values({ userId, token, expiresAt: expires });
  }, 'createVerificationToken');
  return token;
}

export async function verifyEmailByToken(token: string) {
  return withDatabaseErrorHandling(async () => {
    const record = await findFirst(
      db.query.verificationTokens.findMany({ where: eq(verificationTokens.token, token), limit: 1 })
    );
    if (!record) return false;
    if (record.expiresAt < new Date()) return false;
    await db.update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, record.userId));
    await db.delete(verificationTokens).where(eq(verificationTokens.id, record.id));
    return true;
  }, 'verifyEmailByToken');
}

export function createSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Optional: code-based verification; storing in verification_tokens table as tokens
export async function createVerificationCode(userId: number, ttlMinutes = 10) {
  const code = createSixDigitCode();
  const expires = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await withDatabaseErrorHandling(async () => {
    await db.delete(verificationTokens).where(eq(verificationTokens.userId, userId));
    await db.insert(verificationTokens).values({ userId, token: code, expiresAt: expires });
  }, 'createVerificationCode');
  return code;
}

export async function verifyEmailByCode(userId: number, code: string) {
  return withDatabaseErrorHandling(async () => {
    const record = await findFirst(
      db.query.verificationTokens.findMany({ where: eq(verificationTokens.userId, userId), limit: 1 })
    );
    if (!record) return false;
    if (record.token !== code) return false;
    if (record.expiresAt < new Date()) return false;
    await db.update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
    await db.delete(verificationTokens).where(eq(verificationTokens.id, record.id));
    return true;
  }, 'verifyEmailByCode');
}
