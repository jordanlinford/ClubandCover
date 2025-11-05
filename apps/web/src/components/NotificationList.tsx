import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Notification, NotificationType } from '@repo/types';
import { formatDistanceToNow } from 'date-fns';
import { Check, CheckCheck, X, BarChart3, CheckCircle, XCircle, Package, PartyPopper, Star, Users, MessageCircle, Bell } from 'lucide-react';

interface NotificationListProps {
  onClose: () => void;
}

function getNotificationIcon(type: NotificationType) {
  const className = "h-4 w-4";
  
  switch (type) {
    case 'POLL_CREATED':
    case 'POLL_CLOSING':
      return <BarChart3 className={className} />;
    case 'PITCH_ACCEPTED':
      return <CheckCircle className={`${className} text-green-500`} />;
    case 'PITCH_REJECTED':
      return <XCircle className={`${className} text-red-500`} />;
    case 'SWAP_DELIVERED':
    case 'SWAP_VERIFIED':
      return <Package className={className} />;
    case 'REFERRAL_ACTIVATED':
      return <PartyPopper className={`${className} text-purple-500`} />;
    case 'POINTS_AWARDED':
      return <Star className={`${className} text-yellow-500`} />;
    case 'MEMBERSHIP_APPROVED':
      return <Users className={className} />;
    case 'NEW_MESSAGE':
      return <MessageCircle className={className} />;
    default:
      return <Bell className={className} />;
  }
}

function getNotificationTitle(notification: Notification): string {
  const data = notification.data || {};
  
  switch (notification.type) {
    case 'POLL_CREATED':
      return `New poll: ${data.pollTitle || 'Untitled'}`;
    case 'POLL_CLOSING':
      return `Poll closing soon: ${data.pollTitle || 'Untitled'}`;
    case 'PITCH_ACCEPTED':
      return 'Your pitch was accepted!';
    case 'PITCH_REJECTED':
      return 'Your pitch was not selected';
    case 'SWAP_DELIVERED':
      return 'Book swap delivered';
    case 'SWAP_VERIFIED':
      return 'Book swap verified';
    case 'REFERRAL_ACTIVATED':
      return `${data.refereeName || 'Someone'} joined via your referral!`;
    case 'POINTS_AWARDED':
      return `You earned ${data.points || 0} points!`;
    case 'MEMBERSHIP_APPROVED':
      return `You joined ${data.clubName || 'a club'}`;
    case 'NEW_MESSAGE':
      return `New message from ${data.senderName || 'someone'}`;
    default:
      return 'New notification';
  }
}

export function NotificationList({ onClose }: NotificationListProps) {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: () => api.getNotifications(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100" data-testid="title-notifications">
          Notifications
        </h3>
        <div className="flex items-center gap-2">
          {notifications.some((n: Notification) => !n.readAt) && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              data-testid="button-mark-all-read"
              aria-label="Mark all as read"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            data-testid="button-close-notifications"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto" data-testid="list-notifications">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification: Notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                !notification.readAt ? 'bg-blue-50 dark:bg-blue-900/10' : ''
              }`}
              data-testid={`notification-${notification.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5" data-testid={`icon-${notification.type}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100" data-testid={`title-${notification.id}`}>
                    {getNotificationTitle(notification)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!notification.readAt && (
                  <button
                    onClick={() => markReadMutation.mutate(notification.id)}
                    disabled={markReadMutation.isPending}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    data-testid={`button-mark-read-${notification.id}`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
