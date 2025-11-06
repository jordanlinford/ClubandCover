import * as crypto from 'crypto';
import { prisma } from './prisma.js';

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create email verification token for a user
 * Token expires in 6 hours
 */
export async function createVerificationToken(userId: string): Promise<string> {
  const token = generateToken();
  const expires = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    },
  });

  return token;
}

/**
 * Verify email with token
 * Returns true if successful, false if token is invalid/expired
 */
export async function verifyEmail(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: {
        gt: new Date(), // Token not expired
      },
    },
  });

  if (!user) {
    return { success: false, error: 'Invalid or expired verification token' };
  }

  // Mark email as verified and clear token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  return { success: true, userId: user.id };
}

/**
 * Check if user's email is verified
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  return user?.emailVerified ?? false;
}

/**
 * Resend verification email (creates new token)
 */
export async function resendVerificationToken(userId: string): Promise<string> {
  // Clear old token first
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  // Generate new token
  return createVerificationToken(userId);
}
