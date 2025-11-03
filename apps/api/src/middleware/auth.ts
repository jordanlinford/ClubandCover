import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifySupabaseToken } from '../lib/supabase';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email?: string;
    };
  }
}

export async function supabaseAuth(request: FastifyRequest, reply: FastifyReply) {
  const publicRoutes = ['/api/health'];
  
  if (publicRoutes.includes(request.url)) {
    return;
  }
  
  const authHeader = request.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return; // Optional auth
  }
  
  const token = authHeader.substring(7);
  
  try {
    const user = await verifySupabaseToken(token);
    request.user = {
      id: user.id,
      email: user.email,
    };
  } catch (error) {
    // Silently fail for optional auth
    request.log.warn('Auth token verification failed:', error);
  }
}
