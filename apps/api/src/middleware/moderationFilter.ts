import type { FastifyRequest, FastifyReply } from 'fastify';
import { containsProfanity, findProfanity } from '../lib/profanity.js';
import { isAIEnabled, checkToxicity } from '../lib/ai.js';

/**
 * Check if content violates moderation rules
 * Returns { allowed: boolean, reason?: string, code?: string }
 */
async function checkContent(content: string): Promise<{ allowed: boolean; reason?: string; code?: string }> {
  // 1. Fast profanity check (always runs)
  if (containsProfanity(content)) {
    const words = findProfanity(content);
    return {
      allowed: false,
      reason: `Content contains prohibited words: ${words.join(', ')}`,
      code: 'MESSAGE_PROFANITY'
    };
  }
  
  // 2. AI toxicity check (optional - only if OpenAI is configured)
  if (isAIEnabled()) {
    try {
      const toxicityResult = await checkToxicity(content);
      
      if (!toxicityResult.safe) {
        return {
          allowed: false,
          reason: toxicityResult.reason || 'Content flagged as potentially toxic',
          code: 'MESSAGE_TOXIC'
        };
      }
    } catch (error) {
      // Log but don't fail if AI check fails
      console.warn('AI toxicity check failed:', error);
    }
  }
  
  return { allowed: true };
}

/**
 * Middleware: Filter message content for profanity and toxicity
 */
export async function moderationFilter(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Only check POST requests with content
  if (request.method !== 'POST') {
    return;
  }
  
  const body = request.body as any;
  const content = body?.content;
  
  // Skip if no content to check
  if (!content || typeof content !== 'string') {
    return;
  }
  
  // Check content
  const result = await checkContent(content);
  
  if (!result.allowed) {
    request.log.warn(
      { userId: request.user?.id },
      'Message blocked by moderation filter'
    );
    
    return reply.code(400).send({
      success: false,
      error: result.reason || 'Message content violates community guidelines',
      code: result.code || 'CONTENT_VIOLATION'
    });
  }
}
