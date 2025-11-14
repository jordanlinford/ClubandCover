import { prisma } from './prisma.js';
import { buildReferralUrl } from './referrals.js';

/**
 * Email provider types
 */
export type EmailProvider = 'resend' | 'sendgrid' | 'none';

/**
 * Email configuration from environment
 */
const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || 'none') as EmailProvider;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Book Pitch <noreply@bookpitch.app>';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

/**
 * Per-user, per-type daily email cap (for notification emails)
 */
const DAILY_EMAIL_CAP_PER_TYPE = 3;

/**
 * Check if email sending is enabled
 */
export function isEmailEnabled(): boolean {
  return EMAIL_PROVIDER !== 'none' && !!RESEND_API_KEY;
}

/**
 * Check if user has reached daily email limit for a specific notification type
 */
async function hasReachedDailyLimit(
  userId: string,
  emailType: string
): Promise<boolean> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Count emails sent to this user for this type in the last 24 hours
  const emailCount = await prisma.emailLog.count({
    where: {
      userId,
      emailType,
      sentAt: {
        gte: twentyFourHoursAgo,
      },
    },
  });

  return emailCount >= DAILY_EMAIL_CAP_PER_TYPE;
}

/**
 * Send email via configured provider
 */
async function sendViaProvider(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (EMAIL_PROVIDER === 'resend' && RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: params.to,
          subject: params.subject,
          html: params.html,
        }),
      });

      if (!response.ok) {
        console.error('Resend API error:', await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      return false;
    }
  }

  // Add other providers here (SendGrid, etc.)
  
  return false;
}

/**
 * Send notification email with rate limiting
 */
export async function sendNotificationEmail(
  userId: string,
  emailType: string,
  params: {
    subject: string;
    html: string;
  }
): Promise<boolean> {
  if (!isEmailEnabled()) {
    console.log('Email sending disabled - skipping notification email');
    return false;
  }

  // Get user settings
  const settings = await prisma.userSetting.findUnique({
    where: { userId },
  });

  // Check if user has opted out of emails
  if (settings && !settings.emailOptIn) {
    console.log('User has opted out of emails - skipping');
    return false;
  }

  // Check specific notification type preferences
  if (emailType === 'poll_reminder' && settings && !settings.emailPollReminders) {
    return false;
  }
  if (emailType === 'swap_update' && settings && !settings.emailSwapUpdates) {
    return false;
  }
  if (emailType === 'points_update' && settings && !settings.emailPointsUpdates) {
    return false;
  }
  if (emailType === 'club_invite' && settings && !settings.emailClubInvites) {
    return false;
  }
  if (emailType === 'review_update' && settings && !settings.emailReviewUpdates) {
    return false;
  }
  if (emailType === 'club_mention' && settings && !settings.emailClubMentions) {
    return false;
  }

  // Check daily limit
  const limitReached = await hasReachedDailyLimit(userId, emailType);
  if (limitReached) {
    console.log(`Daily email limit reached for user ${userId}, type ${emailType}`);
    return false;
  }

  // Get user email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user?.email) {
    console.error('User email not found');
    return false;
  }

  // Send email
  const sent = await sendViaProvider({
    to: user.email,
    subject: params.subject,
    html: params.html,
  });

  // Log successful email send
  if (sent) {
    try {
      await prisma.emailLog.create({
        data: {
          userId,
          emailType,
        },
      });
    } catch (error) {
      console.error('Failed to log email send:', error);
      // Don't fail the email send if logging fails
    }
  }

  return sent;
}

/**
 * Send transactional email (no rate limiting)
 */
export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!isEmailEnabled()) {
    console.log('Email sending disabled - skipping transactional email');
    return false;
  }

  return sendViaProvider(params);
}

/**
 * Generate HTML for common email templates
 */
export const emailTemplates = {
  pollClosingSoon: (clubName: string, pollTitle: string, hoursLeft: number) => ({
    subject: `Poll closing soon: ${pollTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">📊 Poll Closing Soon</h2>
        <p>The poll "${pollTitle}" in ${clubName} is closing in ${hoursLeft} hours.</p>
        <p>Make sure to cast your vote!</p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          You can manage your email preferences in your account settings.
        </p>
      </div>
    `,
  }),

  pitchSelected: (pitchTitle: string, clubName: string, points: number) => ({
    subject: `🎉 Your pitch was selected!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">🎉 Congratulations!</h2>
        <p>Your pitch "${pitchTitle}" was selected by ${clubName}!</p>
        <p>You've earned <strong>${points} points</strong>.</p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          You can manage your email preferences in your account settings.
        </p>
      </div>
    `,
  }),

  referralActivated: (points: number, referralCode: string) => {
    const referralUrl = buildReferralUrl(referralCode);
    return {
      subject: `🎁 You earned ${points} points from a referral!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">🎁 Referral Reward</h2>
          <p>Someone used your referral code <strong>${referralCode}</strong>!</p>
          ${referralUrl ? `<p>Share your link: <a href="${referralUrl}" style="color: #4F46E5;">${referralUrl}</a></p>` : ''}
          <p>You've earned <strong>${points} points</strong>.</p>
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            You can manage your email preferences in your account settings.
          </p>
        </div>
      `,
    };
  },

  emailVerification: (verificationUrl: string, userName: string) => ({
    subject: 'Verify your email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to Book Pitch!</h2>
        <p>Hi ${userName},</p>
        <p>Thanks for signing up! Please verify your email address to get started with our book club community.</p>
        <div style="margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:<br/>
          <a href="${verificationUrl}" style="color: #4F46E5; word-break: break-all;">${verificationUrl}</a>
        </p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          This link will expire in 6 hours. If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  }),

  passwordReset: (resetUrl: string, userName: string) => ({
    subject: 'Reset your password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${userName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:<br/>
          <a href="${resetUrl}" style="color: #4F46E5; word-break: break-all;">${resetUrl}</a>
        </p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  }),

  swapReviewReminder: (bookTitle: string, partnerName: string, daysWaiting: number) => ({
    subject: 'Reminder: Submit your book review',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Time to Review!</h2>
        <p>Hi there,</p>
        <p>It's been ${daysWaiting} days since you completed your swap with ${partnerName} for "${bookTitle}".</p>
        <p>Please submit your review on Goodreads or Amazon to help your swap partner gain visibility!</p>
        <p style="margin-top: 20px;">
          <strong>Why your review matters:</strong>
        </p>
        <ul style="color: #666;">
          <li>Helps authors gain credibility on platforms that matter</li>
          <li>Supports the AuthorSwap community</li>
          <li>Unlocks badges for your profile</li>
        </ul>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          You can manage your email preferences in your account settings.
        </p>
      </div>
    `,
  }),

  newSwapRequest: (requesterName: string, bookTitle: string, offeredBookTitle: string) => ({
    subject: `New swap request from ${requesterName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">New Swap Request</h2>
        <p>Hi there,</p>
        <p><strong>${requesterName}</strong> wants to swap books with you!</p>
        <p style="margin: 20px 0;">
          <strong>They're offering:</strong> ${offeredBookTitle}<br/>
          <strong>They want:</strong> ${bookTitle}
        </p>
        <p>Log in to your account to accept or decline this swap request.</p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          You can manage your email preferences in your account settings.
        </p>
      </div>
    `,
  }),

  swapAccepted: (responderName: string, bookTitle: string) => ({
    subject: `${responderName} accepted your swap request!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Swap Accepted!</h2>
        <p>Great news!</p>
        <p><strong>${responderName}</strong> has accepted your swap request for "${bookTitle}".</p>
        <p>You can now coordinate the exchange details. Make sure to:</p>
        <ul style="color: #666;">
          <li>Exchange shipping information</li>
          <li>Agree on book condition expectations</li>
          <li>Set delivery timelines</li>
        </ul>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          You can manage your email preferences in your account settings.
        </p>
      </div>
    `,
  }),

  swapDeclined: (responderName: string, bookTitle: string) => ({
    subject: 'Swap request declined',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Swap Request Update</h2>
        <p>Hi there,</p>
        <p>${responderName} has declined your swap request for "${bookTitle}".</p>
        <p>Don't worry! There are plenty of other books and authors in our community. Keep exploring to find your next perfect swap.</p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          You can manage your email preferences in your account settings.
        </p>
      </div>
    `,
  }),

  reviewSubmitted: (reviewerName: string, bookTitle: string, platform: string) => ({
    subject: `${reviewerName} posted a review of your book!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">New Review Posted!</h2>
        <p>Exciting news!</p>
        <p><strong>${reviewerName}</strong> has submitted their review of "${bookTitle}" on ${platform}.</p>
        <p>This review helps build your book's credibility and reach more readers. Thank you for participating in our swap community!</p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          You can manage your email preferences in your account settings.
        </p>
      </div>
    `,
  }),

  clubInvite: (clubName: string, inviterName: string) => ({
    subject: `You're invited to join ${clubName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Club Invitation</h2>
        <p>Hi there,</p>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${clubName}</strong>!</p>
        <p>Join to participate in book discussions, vote on upcoming reads, and connect with fellow book lovers.</p>
        <p>Log in to your account to accept this invitation.</p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          You can manage your email preferences in your account settings.
        </p>
      </div>
    `,
  }),

  clubMention: (mentionerName: string, clubName: string, messagePreview: string) => ({
    subject: `${mentionerName} mentioned you in ${clubName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">You Were Mentioned</h2>
        <p>Hi there,</p>
        <p><strong>${mentionerName}</strong> mentioned you in <strong>${clubName}</strong>:</p>
        <blockquote style="border-left: 4px solid #4F46E5; padding-left: 16px; margin: 20px 0; color: #666;">
          ${messagePreview}
        </blockquote>
        <p>Log in to see the full message and respond.</p>
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          You can manage your email preferences in your account settings.
        </p>
      </div>
    `,
  }),
};
