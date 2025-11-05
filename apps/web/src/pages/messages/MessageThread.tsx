import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { useState, useRef, useEffect } from 'react';
import { Card, Button, Input } from '@repo/ui';
import type { MessagePage } from '@repo/types';

export default function MessageThread() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery<{ success: boolean; data: MessagePage }>({
    queryKey: ['/api/threads', id, 'messages'],
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/threads/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['/api/threads', id, 'messages'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/threads/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      return res.json();
    },
  });

  useEffect(() => {
    markReadMutation.mutate();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (content.trim()) {
      sendMutation.mutate(content);
    }
  };

  const messageList = messages?.data?.messages || [];

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-4">
        <Link href="/messages">
          <Button variant="outline" size="sm">
            ← Back
          </Button>
        </Link>
      </div>

      <Card>
        <div className="flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messageList.map((msg: any) => (
              <div key={msg.id} className="space-y-1" data-testid={`message-${msg.id}`}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{msg.sender.name}</span>
                  <span className="text-gray-500 text-xs">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                  {msg.flaggedAt && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">Flagged</span>
                  )}
                </div>
                <p className="text-sm">{msg.content}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={content}
                onChange={(e: any) => setContent(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                data-testid="input-message"
              />
              <Button onClick={handleSend} disabled={!content.trim()} data-testid="button-send">
                Send
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
