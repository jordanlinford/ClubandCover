import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

/**
 * Rate limit configuration
 * 30 messages per 10 minutes (sliding window)
 */
const RATE_LIMIT = 30;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * In-memory store for rate limiting
 * Key: userId, Value: array of timestamps
 */
const messageTimestamps = new Map<string, number[]>();

/**
 * Clean up old timestamps from memory
 */
function cleanupTimestamps(userId: string): void {
  const timestamps = messageTimestamps.get(userId) || [];
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  
  // Keep only timestamps within the window
  const recent = timestamps.filter(ts => ts > cutoff);
  
  if (recent.length > 0) {
    messageTimestamps.set(userId, recent);
  } else {
    messageTimestamps.delete(userId);
  }
}

/**
 * Get message count from DB (fallback for server restarts)
 */
async function getDbMessageCount(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - WINDOW_MS);
  
  const count = await prisma.message.count({
    where: {
      senderId: userId,
      createdAt: {
        gte: cutoff
      }
    }
  });
  
  return count;
}

/**
 * Middleware: Rate limit message sending
 * Enforces 30 messages per 10 minutes per user
 */
export async function sendRateLimit(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip if not authenticated
  if (!request.user) {
    return;
  }
  
  const userId = request.user.id;
  const now = Date.now();
  
  // Clean up old timestamps
  cleanupTimestamps(userId);
  
  // Get current timestamps
  let timestamps = messageTimestamps.get(userId) || [];
  
  // If memory is empty, check DB (handles server restarts)
  if (timestamps.length === 0) {
    const dbCount = await getDbMessageCount(userId);
    
    if (dbCount >= RATE_LIMIT) {
      // Populate memory with estimated timestamps
      // (we don't have exact times, so spread them evenly)
      const estimatedTimestamps: number[] = [];
      for (let i = 0; i < dbCount; i++) {
        estimatedTimestamps.push(now - (WINDOW_MS / dbCount) * i);
      }
      timestamps = estimatedTimestamps;
      messageTimestamps.set(userId, timestamps);
    }
  }
  
  // Check rate limit
  if (timestamps.length >= RATE_LIMIT) {
    request.log.warn({ userId }, 'Message rate limit exceeded');
    
    return reply.code(429).send({
      success: false,
      error: 'Rate limit exceeded. You can send 30 messages per 10 minutes.',
      code: 'MESSAGE_RATE_LIMIT'
    });
  }
  
  // Add current timestamp
  timestamps.push(now);
  messageTimestamps.set(userId, timestamps);
}
