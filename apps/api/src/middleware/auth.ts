import type { FastifyRequest, FastifyReply } from 'fastify';
import { getSupabase } from '../lib/supabase';
import { prisma } from '../lib/prisma';

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
  const publicRoutes = ['/api/health', '/api/webhooks/stripe'];
  
  if (publicRoutes.some(route => request.url.startsWith(route))) {
    return;
  }
  
  const authHeader = request.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return; // Optional auth
  }
  
  const token = authHeader.substring(7);
  
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
    request.log.warn('Auth token verification failed:', error);
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
