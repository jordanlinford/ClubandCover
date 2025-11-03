import type { FastifyRequest, FastifyReply } from 'fastify';
import { getSupabase } from '../lib/supabase';

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
    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return; // Invalid token, but auth is optional
    }
    
    request.user = {
      id: user.id,
      email: user.email,
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
