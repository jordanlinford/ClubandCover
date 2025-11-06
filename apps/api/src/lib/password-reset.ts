import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create password reset token for a user
 * Token expires in 1 hour
 */
export async function createPasswordResetToken(email: string): Promise<{ success: boolean; token?: string; userId?: string; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Don't reveal that user doesn't exist (security best practice)
    return { success: false, error: 'If that email exists, a reset link has been sent' };
  }

  const token = generateToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetExpires: expires,
    },
  });

  return { success: true, token, userId: user.id };
}

/**
 * Verify password reset token
 * Returns userId if valid, null if invalid/expired
 */
export async function verifyResetToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: {
        gt: new Date(), // Token not expired
      },
    },
  });

  if (!user) {
    return { success: false, error: 'Invalid or expired reset token' };
  }

  return { success: true, userId: user.id };
}

/**
 * Reset password with token
 * Note: This uses Supabase for password management, so we just clear the token
 * The actual password update happens through Supabase Auth
 */
export async function clearResetToken(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });
}
