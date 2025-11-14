import { prisma } from './prisma.js';

/**
 * Rate limiting for account changes (password, display name)
 * Prevents abuse by limiting how often users can change these settings
 */

export async function checkPasswordChangeRateLimit(userId: string): Promise<{ allowed: boolean; error?: string }> {
  const ONE_HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000);
  
  // Count all password change attempts (both successful and failed) in the last hour
  const recentAttempts = await prisma.passwordChangeLog.count({
    where: {
      userId,
      changedAt: { gte: ONE_HOUR_AGO },
    },
  });
  
  if (recentAttempts >= 3) {
    return { allowed: false, error: 'Too many password change attempts. Please try again in an hour.' };
  }
  
  return { allowed: true };
}

export async function checkDisplayNameChangeRateLimit(userId: string): Promise<{ allowed: boolean; error?: string }> {
  const ONE_DAY_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const recentChanges = await prisma.displayNameChangeLog.count({
    where: {
      userId,
      changedAt: { gte: ONE_DAY_AGO },
    },
  });
  
  if (recentChanges >= 3) {
    return { allowed: false, error: 'You can only change your display name 3 times per day. Please try again tomorrow.' };
  }
  
  return { allowed: true };
}
