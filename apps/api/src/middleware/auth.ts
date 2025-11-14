import type { FastifyRequest, FastifyReply } from 'fastify';
import { getSupabase } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email?: string;
      roles?: string[];
      tier?: string;
      emailVerified?: boolean;
      accountStatus?: string;
      disabledAt?: Date | null;
      deletedAt?: Date | null;
    };
  }
}

export async function supabaseAuth(request: FastifyRequest, reply: FastifyReply) {
  const publicRoutes = ['/api/health', '/api/webhooks/stripe', '/api/test/', '/api/auth/dev-login'];
  
  if (publicRoutes.some(route => request.url.startsWith(route))) {
    return;
  }
  
  const authHeader = request.headers.authorization;
  request.log.info({ 
    url: request.url, 
    hasAuthHeader: !!authHeader,
    headerStart: authHeader?.substring(0, 20)
  }, '[AUTH] Processing request');
  
  if (!authHeader?.startsWith('Bearer ')) {
    request.log.warn({ url: request.url }, '[AUTH] No Bearer token found');
    return; // Optional auth
  }
  
  const token = authHeader.substring(7);
  
  // Handle test tokens (expanded to support dev mode)
  if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.ENABLE_TEST_ROUTES === '1') && token.startsWith('test-token-')) {
    const userId = token.replace('test-token-', '');
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (dbUser) {
        request.user = {
          id: dbUser.id,
          email: dbUser.email,
          roles: dbUser.roles,
          tier: dbUser.tier,
          emailVerified: dbUser.emailVerified,
          accountStatus: dbUser.accountStatus,
          disabledAt: dbUser.disabledAt,
          deletedAt: dbUser.deletedAt,
        };
        request.log.info({ userId: dbUser.id, email: dbUser.email }, '[AUTH] Dev token accepted');
        return;
      }
    } catch (error) {
      request.log.warn({ error }, 'Test token verification failed');
    }
  }
  
  try {
    const supabase = getSupabase();
    request.log.info({ tokenLength: token.length }, '[AUTH] Attempting to verify token');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      request.log.warn({ error: error.message }, '[AUTH] Token verification error');
      return; // Invalid token, but auth is optional
    }
    
    if (!user) {
      request.log.warn('[AUTH] No user returned from Supabase');
      return;
    }
    
    request.log.info({ userId: user.id, email: user.email }, '[AUTH] User verified from token');
    
    // Ensure user exists in our database (sync from Supabase)
    const dbUser = await ensureUser(user.id, user.email || '', user.user_metadata);
    
    request.user = {
      id: dbUser.id,
      email: dbUser.email,
      roles: dbUser.roles,
      tier: dbUser.tier,
      emailVerified: dbUser.emailVerified,
      accountStatus: dbUser.accountStatus,
      disabledAt: dbUser.disabledAt,
      deletedAt: dbUser.deletedAt,
    };
    
    request.log.info({ userId: dbUser.id, roles: dbUser.roles, accountStatus: dbUser.accountStatus }, '[AUTH] User authenticated successfully');
  } catch (error) {
    // If Supabase is not configured, skip auth
    if (error instanceof Error && error.message.includes('SUPABASE_URL')) {
      request.log.warn('Supabase not configured - authentication disabled');
      return;
    }
    
    // Silently fail for optional auth
    request.log.warn({ error: error instanceof Error ? error.message : error }, '[AUTH] Auth token verification failed');
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
 * Middleware that requires active account
 * Blocks disabled and deleted users except for specific reactivation routes
 */
export async function requireActiveAccount(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return; // Let requireAuth handle this
  }

  const allowedRoutes = [
    '/api/users/me/enable',    // Allow reactivation
    '/api/users/me/delete',    // Allow deletion confirmation
  ];

  // Allow these routes even for disabled/deleted users
  if (allowedRoutes.some(route => request.url === route)) {
    return;
  }

  if (request.user.accountStatus === 'DELETED') {
    return reply.code(403).send({
      success: false,
      error: 'This account has been deleted',
      code: 'ACCOUNT_DELETED',
    });
  }

  if (request.user.accountStatus === 'DISABLED') {
    return reply.code(403).send({
      success: false,
      error: 'This account has been disabled. Please reactivate it to continue.',
      code: 'ACCOUNT_DISABLED',
    });
  }
}

/**
 * Ensure user exists in database, create if not exists
 * This syncs Supabase Auth users with our application database
 */
async function ensureUser(id: string, email: string, metadata?: Record<string, any>) {
  try {
    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      // Extract role and name from metadata
      const initialRole = metadata?.role === 'AUTHOR' ? 'AUTHOR' : 'READER';
      const name = metadata?.name || email.split('@')[0];
      
      // Create new user with data from Supabase metadata
      user = await prisma.user.create({
        data: {
          id,
          email,
          name,
          roles: [initialRole],
          tier: 'FREE',
        },
      });
      console.log(`[AUTH] Created new user: ${email} (${id}) as ${initialRole}`);
      
      // Award ACCOUNT_CREATED points (async, non-blocking)
      import('../lib/points.js').then(({ awardPoints }) => {
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

/**
 * Check if user has a specific role
 */
export function hasRole(user: { roles?: string[] } | undefined, role: string): boolean {
  return user?.roles?.includes(role) ?? false;
}

/**
 * Check if user has ANY of the specified roles
 */
export function hasAnyRole(user: { roles?: string[] } | undefined, roles: string[]): boolean {
  return roles.some(role => user?.roles?.includes(role)) ?? false;
}

/**
 * Check if user has ALL of the specified roles
 */
export function hasAllRoles(user: { roles?: string[] } | undefined, roles: string[]): boolean {
  return roles.every(role => user?.roles?.includes(role)) ?? false;
}

/**
 * Add a role to a user
 */
export async function addUserRole(userId: string, role: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.roles.includes(role as any)) {
    return; // Already has role
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      roles: {
        push: role as any,
      },
    },
  });

  console.log(`[AUTH] Added role ${role} to user ${userId}`);
}
