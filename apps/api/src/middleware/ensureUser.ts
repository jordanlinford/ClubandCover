import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { createVerificationToken } from '../lib/email-verification.js';
import { emailTemplates, sendTransactionalEmail } from '../lib/email.js';

export async function ensureUser(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return;
  }

  try {
    const result = await prisma.user.upsert({
      where: { id: request.user.id },
      update: {
        email: request.user.email || '',
      },
      create: {
        id: request.user.id,
        email: request.user.email || '',
        name: request.user.email?.split('@')[0] || 'User',
        emailVerified: false,
      },
    });

    // Send verification email for new users (when created, not updated)
    // Check if this was a new creation by checking if user was just created
    const existingUser = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { createdAt: true, emailVerified: true },
    });

    // If user was created in the last 5 seconds and email not verified, send verification
    const isNewUser = existingUser && 
      (Date.now() - new Date(existingUser.createdAt).getTime() < 5000) &&
      !existingUser.emailVerified;

    if (isNewUser) {
      try {
        const token = await createVerificationToken(request.user.id);
        const appUrl = process.env.REPLIT_DOMAINS 
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : 'http://localhost:5000';
        const verificationUrl = `${appUrl}/verify-email?token=${token}`;
        const template = emailTemplates.emailVerification(verificationUrl, result.name);

        await sendTransactionalEmail({
          to: result.email,
          subject: template.subject,
          html: template.html,
        });
      } catch (emailError) {
        // Don't fail user creation if email sending fails
        request.log.error('Failed to send verification email:', emailError);
      }
    }
  } catch (error) {
    request.log.error('Failed to ensure user:', error);
  }
}
