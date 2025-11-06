import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { api } from '../../lib/api';
import { Users, MessageSquare, BarChart3, Info, Calendar } from 'lucide-react';

type Club = {
  id: string;
  name: string;
  description: string | null;
  about: string | null;
  genres: string[];
  frequency: number | null;
  coverImageUrl: string | null;
  minPointsToJoin: number;
  owner: { id: string; name: string; avatarUrl: string | null };
  coHosts: Array<{ id: string; name: string; avatarUrl: string | null }>;
  currentPoll: {
    id: string;
    type: string;
    closesAt: string | null;
    _count: { votes: number };
  } | null;
  lastBooks: Array<{
    title: string;
    author: string;
    selectedAt: string;
  }>;
  _count: { memberships: number };
};

export function ClubRoomPage() {
  const [, params] = useRoute('/clubs/:id/room');
  const clubId = params?.id || '';
  const [activeTab, setActiveTab] = useState<'feed' | 'polls' | 'info'>('feed');
  const [messageBody, setMessageBody] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const { data: club, isLoading: clubLoading } = useQuery<Club>({
    queryKey: ['/api/clubs', clubId],
    enabled: !!clubId,
  });

  const { data: messagesData } = useQuery({
    queryKey: ['/api/clubs', clubId, 'messages'],
    queryFn: () => api.getClubMessages(clubId),
    enabled: !!clubId && activeTab === 'feed',
  });

  const postMessageMutation = useMutation({
    mutationFn: (body: string) => api.postClubMessage(clubId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clubs', clubId, 'messages'] });
      setMessageBody('');
      setError('');
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to post message');
    },
  });

  const handlePostMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim()) {
      setError('Message cannot be empty');
      return;
    }
    if (messageBody.length > 2000) {
      setError('Message is too long (max 2000 characters)');
      return;
    }
    postMessageMutation.mutate(messageBody);
  };

  if (clubLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-600 dark:text-gray-400">Loading club...</p>
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-red-600 dark:text-red-400">Club not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto p-6">
        {/* Club Header */}
        <div className="mb-6">
          {club.coverImageUrl && (
            <div className="w-full h-48 mb-4 rounded-lg overflow-hidden">
              <img
                src={club.coverImageUrl}
                alt={club.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <PageHeader
            title={club.name}
            description={club.description || undefined}
          />
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{club._count.memberships} members</span>
            </div>
            {club.frequency && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{club.frequency} books/year</span>
              </div>
            )}
            {club.genres.length > 0 && (
              <div className="flex gap-1">
                {club.genres.slice(0, 3).map((genre) => (
                  <span
                    key={genre}
                    className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs"
                  >
                    {genre}
                  </span>
                ))}
                {club.genres.length > 3 && (
                  <span className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400">
                    +{club.genres.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'feed'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              data-testid="tab-feed"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Feed</span>
            </button>
            <button
              onClick={() => setActiveTab('polls')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'polls'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              data-testid="tab-polls"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Polls</span>
              {club.currentPoll && (
                <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                  Active
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === 'info'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              data-testid="tab-info"
            >
              <Info className="h-4 w-4" />
              <span>Info</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'feed' && (
          <div className="space-y-6">
            {/* Post Message Form */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Post to Feed
              </h3>
              {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-md">
                  {error}
                </div>
              )}
              <form onSubmit={handlePostMessage} className="space-y-4">
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Share your thoughts with the club..."
                  rows={4}
                  maxLength={2000}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  data-testid="input-message"
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {messageBody.length}/2000
                  </span>
                  <Button
                    type="submit"
                    disabled={postMessageMutation.isPending}
                    data-testid="button-post-message"
                  >
                    {postMessageMutation.isPending ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Messages */}
            <div className="space-y-4">
              {messagesData?.messages.map((message) => (
                <Card key={message.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      {message.author.avatarUrl ? (
                        <img
                          src={message.author.avatarUrl}
                          alt={message.author.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400 font-semibold">
                          {message.author.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {message.author.name}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {message.body}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
              {messagesData?.messages.length === 0 && (
                <Card className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No messages yet. Be the first to post!
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'polls' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Current Poll
            </h3>
            {club.currentPoll ? (
              <div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  Type: {club.currentPoll.type}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {club.currentPoll._count.votes} votes
                </p>
                {club.currentPoll.closesAt && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Closes: {new Date(club.currentPoll.closesAt).toLocaleDateString()}
                  </p>
                )}
                <Button
                  onClick={() => (window.location.href = `/clubs/${clubId}/vote`)}
                  className="mt-4"
                >
                  View & Vote
                </Button>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">No active polls</p>
            )}

            {club.lastBooks.length > 0 && (
              <div className="mt-8">
                <h4 className="text-md font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Recently Selected Books
                </h4>
                <div className="space-y-3">
                  {club.lastBooks.map((book, idx) => (
                    <div
                      key={idx}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {book.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        by {book.author}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Selected {new Date(book.selectedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'info' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Club Information
            </h3>
            <div className="space-y-4">
              {club.about && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    About
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {club.about}
                  </p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Owner
                </h4>
                <p className="text-gray-700 dark:text-gray-300">{club.owner.name}</p>
              </div>
              {club.coHosts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Co-Hosts
                  </h4>
                  <div className="space-y-1">
                    {club.coHosts.map((host) => (
                      <p key={host.id} className="text-gray-700 dark:text-gray-300">
                        {host.name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Genres
                </h4>
                <div className="flex flex-wrap gap-2">
                  {club.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
              {club.minPointsToJoin > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Points Required to Join
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300">{club.minPointsToJoin}</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
