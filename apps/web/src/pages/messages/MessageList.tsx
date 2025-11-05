import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card } from '@repo/ui';
import type { ThreadListItem } from '@repo/types';

export default function MessageList() {
  const { data: threads, isLoading } = useQuery<{ success: boolean; data: ThreadListItem[] }>({
    queryKey: ['/api/threads/mine'],
  });

  if (isLoading) {
    return <div className="p-6">Loading threads...</div>;
  }

  const threadList = threads?.data || [];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>

      {threadList.length === 0 ? (
        <Card>
          <div className="p-8 text-center">
            <p className="text-gray-500">No conversations yet</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {threadList.map((thread) => (
            <Link key={thread.id} href={`/messages/${thread.id}`}>
              <Card>
                <div className="p-4 cursor-pointer hover:bg-gray-50" data-testid={`thread-${thread.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium mb-1">
                        {thread.type === 'CLUB'
                          ? 'Club Thread'
                          : thread.otherMembers.map((m) => m.name).join(', ')}
                        {thread.unreadCount > 0 && (
                          <span
                            className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded"
                            data-testid={`unread-${thread.id}`}
                          >
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                      {thread.lastMessage && (
                        <p className="text-sm text-gray-500 truncate">
                          {thread.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
