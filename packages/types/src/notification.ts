export type NotificationType =
  | 'POLL_CREATED'
  | 'POLL_CLOSING'
  | 'PITCH_ACCEPTED'
  | 'PITCH_REJECTED'
  | 'SWAP_DELIVERED'
  | 'SWAP_VERIFIED'
  | 'REFERRAL_ACTIVATED'
  | 'POINTS_AWARDED'
  | 'MEMBERSHIP_APPROVED'
  | 'NEW_MESSAGE';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  data: any;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationList {
  notifications: Notification[];
  total: number;
  hasMore: boolean;
}

export interface UnreadCount {
  count: number;
}
