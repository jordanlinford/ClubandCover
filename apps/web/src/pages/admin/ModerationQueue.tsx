import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button } from '@repo/ui';
import type { ModerationQueueItem } from '@repo/types';

export default function ModerationQueue() {
  const queryClient = useQueryClient();
  const { data: queue } = useQuery<{ success: boolean; data: ModerationQueueItem[] }>({
    queryKey: ['/api/moderation/queue'],
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ reportId, action }: { reportId: string; action: string }) => {
      const res = await fetch('/api/moderation/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/moderation/queue'] });
    },
  });

  const reports = queue?.data || [];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Moderation Queue (STAFF)</h1>

      {reports.length === 0 ? (
        <Card>
          <div className="p-8 text-center">
            <p className="text-gray-500">No pending reports</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <div className="p-4 space-y-3" data-testid={`report-${report.id}`}>
                <div>
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">Reported</span>
                  <span className="ml-2 text-sm text-gray-600">by {report.reporter.name}</span>
                </div>
                <p className="text-sm font-medium">Reason: {report.reason}</p>
                <div className="bg-gray-100 p-3 rounded">
                  <p className="text-sm">
                    <strong>{report.message.sender.name}:</strong> {report.message.content}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => reviewMutation.mutate({ reportId: report.id, action: 'FLAG' })}
                    data-testid="button-flag"
                  >
                    Flag
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => reviewMutation.mutate({ reportId: report.id, action: 'CLEAR' })}
                    data-testid="button-clear"
                  >
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reviewMutation.mutate({ reportId: report.id, action: 'DISMISS' })}
                    data-testid="button-dismiss"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
