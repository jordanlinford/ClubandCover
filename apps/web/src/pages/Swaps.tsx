import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { Input } from '@repo/ui';
import type { Swap } from '@repo/types';
import { useAuth } from '../contexts/AuthContext';

export function SwapsPage() {
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const [deliverable, setDeliverable] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: swaps, isLoading } = useQuery<Swap[]>({
    queryKey: ['/api/swaps'],
  });

  const updateSwapMutation = useMutation({
    mutationFn: async ({ id, status, deliverable }: { id: string; status: string; deliverable?: string }) => {
      const response = await fetch(`/api/swaps/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, deliverable }),
      });
      if (!response.ok) throw new Error('Failed to update swap');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/swaps'] });
      setDeliverable({});
    },
  });

  const sentSwaps = swaps?.filter(swap => swap.requesterId === user?.id) || [];
  const receivedSwaps = swaps?.filter(swap => swap.responderId === user?.id) || [];
  const displaySwaps = activeTab === 'sent' ? sentSwaps : receivedSwaps;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'DECLINED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'DELIVERED': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'VERIFIED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        <PageHeader
          title="My Swaps"
          description="Manage your book swap requests"
        />

        <div className="mt-6">
          <div className="flex space-x-2 mb-6 border-b dark:border-gray-700">
            <button
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'sent'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              data-testid="tab-sent"
            >
              Sent ({sentSwaps.length})
            </button>
            <button
              onClick={() => setActiveTab('received')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'received'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              data-testid="tab-received"
            >
              Received ({receivedSwaps.length})
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </Card>
              ))}
            </div>
          ) : displaySwaps.length > 0 ? (
            <div className="space-y-4">
              {displaySwaps.map((swap) => (
                <Card key={swap.id} className="p-6" data-testid={`card-swap-${swap.id}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold">
                          Swap Request
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(swap.status)}`} data-testid={`status-${swap.id}`}>
                          {swap.status}
                        </span>
                      </div>
                      {swap.message && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {swap.message}
                        </p>
                      )}
                      {swap.deliverable && (
                        <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                          📦 Deliverable: {swap.deliverable}
                        </p>
                      )}
                      <div className="text-sm text-gray-500">
                        Created {new Date(swap.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                      {/* Received tab: Responder actions */}
                      {activeTab === 'received' && (
                        <>
                          {swap.status === 'REQUESTED' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateSwapMutation.mutate({ id: swap.id, status: 'ACCEPTED' })}
                                disabled={updateSwapMutation.isPending}
                                data-testid={`button-accept-${swap.id}`}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateSwapMutation.mutate({ id: swap.id, status: 'DECLINED' })}
                                disabled={updateSwapMutation.isPending}
                                data-testid={`button-decline-${swap.id}`}
                              >
                                Decline
                              </Button>
                            </>
                          )}
                          {swap.status === 'ACCEPTED' && (
                            <div className="space-y-2">
                              <Input
                                placeholder="Tracking URL"
                                value={deliverable[swap.id] || ''}
                                onChange={(e) => setDeliverable(prev => ({ ...prev, [swap.id]: e.target.value }))}
                                data-testid={`input-deliverable-${swap.id}`}
                              />
                              <Button
                                size="sm"
                                onClick={() => updateSwapMutation.mutate({
                                  id: swap.id,
                                  status: 'DELIVERED',
                                  deliverable: deliverable[swap.id] || 'No tracking info',
                                })}
                                disabled={updateSwapMutation.isPending}
                                data-testid={`button-deliver-${swap.id}`}
                              >
                                Mark Delivered
                              </Button>
                            </div>
                          )}
                        </>
                      )}

                      {/* Sent tab: Requester actions */}
                      {activeTab === 'sent' && swap.status === 'DELIVERED' && (
                        <Button
                          size="sm"
                          onClick={() => updateSwapMutation.mutate({ id: swap.id, status: 'VERIFIED' })}
                          disabled={updateSwapMutation.isPending}
                          data-testid={`button-verify-${swap.id}`}
                        >
                          Verify Received
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No {activeTab} swap requests yet
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
