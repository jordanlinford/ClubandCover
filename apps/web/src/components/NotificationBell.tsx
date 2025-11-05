import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { NotificationList } from './NotificationList';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: unreadData } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    queryFn: () => api.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = unreadData?.count || 0;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        data-testid="button-notifications"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium"
            data-testid="badge-unread-count"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            data-testid="overlay-notifications"
          />
          <div className="absolute right-0 mt-2 w-80 z-20">
            <NotificationList onClose={() => setIsOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
