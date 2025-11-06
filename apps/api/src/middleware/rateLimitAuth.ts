import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Simple in-memory rate limiter for auth endpoints
 * Prevents brute force attacks on login, password reset, and email verification
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Rate limit configuration
 */
const RATE_LIMITS = {
  // More restrictive for sensitive operations
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  passwordReset: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  emailVerification: { maxAttempts: 5, windowMs: 60 * 60 * 1000 }, // 5 attempts per hour
  signup: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 signups per hour per IP
};

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Create a rate limit middleware for a specific endpoint type
 */
export function createAuthRateLimit(type: RateLimitType) {
  const config = RATE_LIMITS[type];
  
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Use IP address as the rate limit key
    const ip = request.ip;
    const key = `${type}:${ip}`;
    
    const now = Date.now();
    let entry = rateLimitStore.get(key);
    
    // Create new entry if it doesn't exist or has expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(key, entry);
    }
    
    // Increment attempt counter
    entry.count++;
    
    // Check if rate limit exceeded
    if (entry.count > config.maxAttempts) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      reply.header('Retry-After', retryAfter.toString());
      return reply.code(429).send({
        success: false,
        error: 'Too many attempts. Please try again later.',
        retryAfter,
      });
    }
    
    // Add rate limit headers
    reply.header('X-RateLimit-Limit', config.maxAttempts.toString());
    reply.header('X-RateLimit-Remaining', (config.maxAttempts - entry.count).toString());
    reply.header('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
  };
}
