import type { FastifyRequest, FastifyReply } from 'fastify';
import { getSupabase } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email?: string;
      role?: string;
      tier?: string;
    };
  }
}

export async function supabaseAuth(request: FastifyRequest, reply: FastifyReply) {
  const publicRoutes = ['/api/health', '/api/webhooks/stripe', '/api/test/'];
  
  if (publicRoutes.some(route => request.url.startsWith(route))) {
    return;
  }
  
  const authHeader = request.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return; // Optional auth
  }
  
  const token = authHeader.substring(7);
  
  // Handle test tokens (only in test environment or when test routes enabled)
  if ((process.env.NODE_ENV === 'test' || process.env.ENABLE_TEST_ROUTES === '1') && token.startsWith('test-token-')) {
    const userId = token.replace('test-token-', '');
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (dbUser) {
        request.user = {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          tier: dbUser.tier,
        };
        return;
      }
    } catch (error) {
      request.log.warn({ error }, 'Test token verification failed');
    }
  }
  
  try {
    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return; // Invalid token, but auth is optional
    }
    
    // Ensure user exists in our database (sync from Supabase)
    const dbUser = await ensureUser(user.id, user.email || '');
    
    request.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      tier: dbUser.tier,
    };
  } catch (error) {
    // If Supabase is not configured, skip auth
    if (error instanceof Error && error.message.includes('SUPABASE_URL')) {
      request.log.warn('Supabase not configured - authentication disabled');
      return;
    }
    
    // Silently fail for optional auth
    request.log.warn({ error }, 'Auth token verification failed');
  }
}

/**
 * Middleware that requires authentication
 * Returns 401 if no user is authenticated
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.code(401).send({
      success: false,
      error: 'Authentication required',
    });
  }
}

/**
 * Ensure user exists in database, create if not exists
 * This syncs Supabase Auth users with our application database
 */
async function ensureUser(id: string, email: string) {
  try {
    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      // Create new user with defaults
      user = await prisma.user.create({
        data: {
          id,
          email,
          name: email.split('@')[0], // Default name from email
          role: 'READER',
          tier: 'FREE',
        },
      });
      console.log(`[AUTH] Created new user: ${email} (${id})`);
      
      // Award ACCOUNT_CREATED points (async, non-blocking)
      import('./points.js').then(({ awardPoints }) => {
        awardPoints(id, 'ACCOUNT_CREATED').catch(err => {
          console.error('[POINTS] Failed to award ACCOUNT_CREATED points:', err);
        });
      });
    } else if (user.email !== email) {
      // Update email if changed in Supabase
      user = await prisma.user.update({
        where: { id },
        data: { email },
      });
      console.log(`[AUTH] Updated user email: ${email} (${id})`);
    }

    return user;
  } catch (error) {
    console.error('[AUTH] Error ensuring user:', error);
    throw error;
  }
}
