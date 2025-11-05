import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export type NotificationEvent = 
  | 'swap_requested'
  | 'swap_accepted'
  | 'swap_delivered'
  | 'swap_verified'
  | 'swap_declined'
  | 'message_received';

interface NotificationPayload {
  event: NotificationEvent;
  recipientEmail: string;
  recipientName: string;
  data: {
    swapId?: string;
    bookTitle?: string;
    requesterName?: string;
    responderName?: string;
    deliverable?: string;
    senderName?: string;
    threadId?: string;
    messagePreview?: string;
  };
}

export async function notify(payload: NotificationPayload): Promise<void> {
  const { event, recipientEmail, recipientName, data } = payload;

  // If Resend is not configured, log to console
  if (!resend) {
    console.log('[NOTIFICATION]', {
      event,
      to: recipientEmail,
      data,
    });
    return;
  }

  // Send email via Resend
  const subject = getSubject(event);
  const body = getBody(event, recipientName, data);

  try {
    await resend.emails.send({
      from: 'Book Swap <notifications@bookswap.app>',
      to: recipientEmail,
      subject,
      html: body,
    });
    console.log(`[EMAIL SENT] ${event} to ${recipientEmail}`);
  } catch (error) {
    console.error('[EMAIL ERROR]', error);
    // Fallback to console log
    console.log('[NOTIFICATION FALLBACK]', { event, to: recipientEmail, data });
  }
}

function getSubject(event: NotificationEvent): string {
  switch (event) {
    case 'swap_requested':
      return 'New Book Swap Request';
    case 'swap_accepted':
      return 'Book Swap Request Accepted';
    case 'swap_delivered':
      return 'Book Swap Delivered';
    case 'swap_verified':
      return 'Book Swap Verified';
    case 'swap_declined':
      return 'Book Swap Declined';
    case 'message_received':
      return 'New Message';
    default:
      return 'Book Swap Update';
  }
}

function getBody(event: NotificationEvent, recipientName: string, data: any): string {
  switch (event) {
    case 'swap_requested':
      return `
        <h2>Hi ${recipientName},</h2>
        <p>${data.requesterName} has requested to swap books with you!</p>
        <p><strong>Book:</strong> ${data.bookTitle}</p>
        <p>Visit your swaps page to accept or decline.</p>
      `;
    case 'swap_accepted':
      return `
        <h2>Hi ${recipientName},</h2>
        <p>${data.responderName} has accepted your book swap request!</p>
        <p>Please coordinate delivery details.</p>
      `;
    case 'swap_delivered':
      return `
        <h2>Hi ${recipientName},</h2>
        <p>Your book swap has been marked as delivered.</p>
        <p><strong>Deliverable:</strong> <a href="${data.deliverable}">${data.deliverable}</a></p>
        <p>Please verify the delivery to complete the swap.</p>
      `;
    case 'swap_verified':
      return `
        <h2>Hi ${recipientName},</h2>
        <p>Your book swap has been verified and completed!</p>
        <p>Thank you for being part of our community.</p>
      `;
    case 'swap_declined':
      return `
        <h2>Hi ${recipientName},</h2>
        <p>Your swap request has been declined.</p>
        <p>Don't worry - keep exploring other books!</p>
      `;
    case 'message_received':
      return `
        <h2>Hi ${recipientName},</h2>
        <p>${data.senderName} sent you a message:</p>
        <blockquote>${data.messagePreview}</blockquote>
        <p><a href="${process.env.VITE_APP_URL || 'http://localhost:5000'}/messages/${data.threadId}">View conversation</a></p>
      `;
    default:
      return `<p>You have a new update on your book swap.</p>`;
  }
}
