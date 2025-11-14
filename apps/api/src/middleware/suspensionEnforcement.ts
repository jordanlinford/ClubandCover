import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Universal suspension enforcement middleware
 * Blocks SUSPENDED, DISABLED, and DELETED users from all mutating operations
 * This is the single source of truth for suspension enforcement across the entire API
 */
export async function enforceSuspensionPolicy(request: FastifyRequest, reply: FastifyReply) {
  // Only enforce on mutating HTTP methods
  const mutatingMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
  if (!mutatingMethods.includes(request.method)) {
    return; // Allow all GET/HEAD/OPTIONS requests
  }

  // Skip enforcement for public/auth endpoints that don't require authentication
  const publicEndpoints = [
    '/api/auth/dev-login',
    '/api/webhooks/stripe',
    '/api/health',
  ];
  
  if (publicEndpoints.some(endpoint => request.url.startsWith(endpoint))) {
    return;
  }

  // Skip enforcement for admin endpoints that manage account status
  // (admins need to be able to suspend/unsuspend even if their own account changes)
  const adminStatusEndpoints = [
    '/api/admin/users/',
  ];
  
  if (adminStatusEndpoints.some(endpoint => request.url.includes(endpoint) && request.url.includes('/suspend'))) {
    return;
  }

  // If user is not authenticated, let requireAuth middleware handle it
  if (!request.user) {
    return;
  }

  // Block SUSPENDED users from all mutating operations
  if (request.user.accountStatus === 'SUSPENDED') {
    return reply.code(403).send({
      success: false,
      error: 'Your account is suspended. You cannot perform this action.',
      code: 'ACCOUNT_SUSPENDED',
    });
  }

  // Allow DISABLED users to access self-recovery endpoints only
  if (request.user.accountStatus === 'DISABLED') {
    const recoveryEndpoints = [
      '/api/me/enable',
    ];
    
    const isRecoveryEndpoint = recoveryEndpoints.some(endpoint => request.url.startsWith(endpoint));
    
    if (isRecoveryEndpoint) {
      return; // Allow DISABLED users to reactivate themselves
    }
    
    return reply.code(403).send({
      success: false,
      error: 'Your account is disabled. Please reactivate it to continue.',
      code: 'ACCOUNT_DISABLED',
    });
  }

  // Block DELETED users (already handled by requireActiveAccount, but adding for completeness)
  if (request.user.accountStatus === 'DELETED') {
    return reply.code(403).send({
      success: false,
      error: 'This account has been deleted.',
      code: 'ACCOUNT_DELETED',
    });
  }

  // ACTIVE users proceed normally
}
