import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createVerificationToken, verifyEmail, resendVerificationToken } from '../lib/email-verification.js';
import { createPasswordResetToken, verifyResetToken, clearResetToken } from '../lib/password-reset.js';
import { emailTemplates, sendTransactionalEmail } from '../lib/email.js';
import { prisma } from '../lib/prisma.js';
import { createAuthRateLimit } from '../middleware/rateLimitAuth.js';

/**
 * Auth routes for email verification and password reset
 */
export async function authRoutes(server: FastifyInstance) {
  const APP_URL = process.env.REPLIT_DOMAINS 
    ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
    : 'http://localhost:5000';

  /**
   * POST /api/auth/send-verification
   * Send verification email to a user
   */
  server.post('/send-verification', {
    preHandler: createAuthRateLimit('emailVerification'),
  }, async (request, reply) => {
    const schema = z.object({
      userId: z.string(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request body',
      });
    }

    const { userId } = parsed.data;

    try {
      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, emailVerified: true },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'User not found',
        });
      }

      if (user.emailVerified) {
        return reply.status(400).send({
          success: false,
          error: 'Email already verified',
        });
      }

      // Create verification token
      const token = await createVerificationToken(userId);

      // Send verification email
      const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
      const template = emailTemplates.emailVerification(verificationUrl, user.name);

      await sendTransactionalEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
      });

      return reply.send({ success: true });
    } catch (error) {
      console.error('Error sending verification email:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to send verification email',
      });
    }
  });

  /**
   * POST /api/auth/verify-email
   * Verify email with token
   */
  server.post('/verify-email', {
    preHandler: createAuthRateLimit('emailVerification'),
  }, async (request, reply) => {
    const schema = z.object({
      token: z.string(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request body',
      });
    }

    const { token } = parsed.data;

    try {
      const result = await verifyEmail(token);

      if (!result.success) {
        return reply.status(400).send(result);
      }

      return reply.send(result);
    } catch (error) {
      console.error('Error verifying email:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to verify email',
      });
    }
  });

  /**
   * POST /api/auth/resend-verification
   * Resend verification email
   */
  server.post('/resend-verification', {
    preHandler: createAuthRateLimit('emailVerification'),
  }, async (request, reply) => {
    const schema = z.object({
      userId: z.string(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request body',
      });
    }

    const { userId } = parsed.data;

    try {
      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, emailVerified: true },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'User not found',
        });
      }

      if (user.emailVerified) {
        return reply.status(400).send({
          success: false,
          error: 'Email already verified',
        });
      }

      // Create new verification token
      const token = await resendVerificationToken(userId);

      // Send verification email
      const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
      const template = emailTemplates.emailVerification(verificationUrl, user.name);

      await sendTransactionalEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
      });

      return reply.send({ success: true });
    } catch (error) {
      console.error('Error resending verification email:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to resend verification email',
      });
    }
  });

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
  server.post('/forgot-password', {
    preHandler: createAuthRateLimit('passwordReset'),
  }, async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid email address',
      });
    }

    const { email } = parsed.data;

    try {
      const result = await createPasswordResetToken(email);

      if (result.success && result.token && result.userId) {
        // Get user name
        const user = await prisma.user.findUnique({
          where: { id: result.userId },
          select: { name: true },
        });

        // Send reset email
        const resetUrl = `${APP_URL}/reset-password?token=${result.token}`;
        const template = emailTemplates.passwordReset(resetUrl, user?.name || 'there');

        await sendTransactionalEmail({
          to: email,
          subject: template.subject,
          html: template.html,
        });
      }

      // Always return success (don't reveal if email exists)
      return reply.send({
        success: true,
        message: 'If that email exists, a password reset link has been sent',
      });
    } catch (error) {
      console.error('Error requesting password reset:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to process password reset request',
      });
    }
  });

  /**
   * POST /api/auth/verify-reset-token
   * Verify password reset token (check if valid before showing reset form)
   */
  server.post('/verify-reset-token', async (request, reply) => {
    const schema = z.object({
      token: z.string(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request body',
      });
    }

    const { token } = parsed.data;

    try {
      const result = await verifyResetToken(token);
      return reply.send(result);
    } catch (error) {
      console.error('Error verifying reset token:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to verify reset token',
      });
    }
  });

  /**
   * POST /api/auth/reset-password
   * Reset password with token (using Supabase Auth)
   */
  server.post('/reset-password', {
    preHandler: createAuthRateLimit('passwordReset'),
  }, async (request, reply) => {
    const schema = z.object({
      token: z.string(),
      newPassword: z.string().min(8),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request body. Password must be at least 8 characters.',
      });
    }

    const { token, newPassword } = parsed.data;

    try {
      // Verify token
      const tokenResult = await verifyResetToken(token);
      if (!tokenResult.success || !tokenResult.userId) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid or expired reset token',
        });
      }

      // Get user email
      const user = await prisma.user.findUnique({
        where: { id: tokenResult.userId },
        select: { email: true },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'User not found',
        });
      }

      // Update password in Supabase Auth
      // Note: This requires Supabase Service Role key
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase not configured for password reset');
        return reply.status(500).send({
          success: false,
          error: 'Password reset not available',
        });
      }

      // Update password using Supabase Admin API
      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.email}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Supabase password update failed:', errorText);
        return reply.status(500).send({
          success: false,
          error: 'Failed to update password',
        });
      }

      // Clear reset token
      await clearResetToken(tokenResult.userId);

      return reply.send({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to reset password',
      });
    }
  });
}
