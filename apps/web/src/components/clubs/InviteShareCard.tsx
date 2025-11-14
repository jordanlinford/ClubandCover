import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import {
  Copy,
  Check,
  Mail,
  Share2,
  RefreshCw,
  Loader2,
  Users,
  Clock,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface InviteShareCardProps {
  clubId: string;
  clubName: string;
}

export function InviteShareCard({ clubId, clubName }: InviteShareCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expiresIn, setExpiresIn] = useState('30');
  const [maxUses, setMaxUses] = useState('');

  // Fetch existing invite (if any)
  const { data: inviteData } = useQuery({
    queryKey: ['/api/clubs', clubId, 'invite'],
    queryFn: async () => {
      // Try to get the current club to see if it has an inviteCode
      const response = await api.get<{
        success: boolean;
        data?: any;
      }>(`/clubs/${clubId}`);
      
      if (response.success && response.data?.inviteCode) {
        // If there's an invite code, fetch the full invite details
        return response.data;
      }
      return null;
    },
  });

  // Generate new invite mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        expiresIn: parseInt(expiresIn) || 30,
      };
      
      if (maxUses) {
        body.maxUses = parseInt(maxUses);
      }

      const response = await api.post<{
        success: boolean;
        data?: any;
        error?: string;
      }>(`/clubs/${clubId}/invite`, body);

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate invite');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clubs', clubId] });
      toast({
        title: 'Invite code generated!',
        description: 'You can now share this link with potential members',
      });
      setShowAdvanced(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to generate invite',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const inviteCode = inviteData?.inviteCode;
  const inviteUrl = inviteCode
    ? `${window.location.origin}/clubs/invite/${inviteCode}`
    : '';

  const handleCopy = async () => {
    if (!inviteUrl) return;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Invite link has been copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy link to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleEmailShare = () => {
    if (!inviteUrl) return;
    
    const subject = encodeURIComponent(`Join ${clubName} on Club & Cover`);
    const body = encodeURIComponent(
      `You've been invited to join ${clubName}!\n\nClick here to accept: ${inviteUrl}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleWebShare = async () => {
    if (!inviteUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${clubName}`,
          text: `You've been invited to join ${clubName} on Club & Cover`,
          url: inviteUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Invite Members</h3>
        <Users className="h-5 w-5 text-muted-foreground" />
      </div>

      {!inviteCode ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate a shareable invite link to invite new members to your club
          </p>

          {!showAdvanced ? (
            <div className="flex gap-2">
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                data-testid="button-generate-invite"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Generate Invite Link
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAdvanced(true)}
                data-testid="button-advanced-options"
              >
                Advanced Options
              </Button>
            </div>
          ) : (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Advanced Options</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAdvanced(false)}
                  data-testid="button-close-advanced"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    Expires In (days)
                  </label>
                  <Input
                    type="number"
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    min="1"
                    max="365"
                    placeholder="30"
                    data-testid="input-expires-in"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    Max Uses (optional)
                  </label>
                  <Input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    min="1"
                    placeholder="Unlimited"
                    data-testid="input-max-uses"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty for unlimited uses
                  </p>
                </div>
              </div>
              
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="w-full"
                data-testid="button-generate-custom-invite"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Custom Invite'
                )}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">
              Invite Link
            </label>
            <div className="flex gap-2">
              <Input
                value={inviteUrl}
                readOnly
                className="font-mono text-sm"
                data-testid="input-invite-url"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                data-testid="button-copy-link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleEmailShare}
              data-testid="button-email-share"
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
            
            <Button
              variant="outline"
              onClick={handleWebShare}
              data-testid="button-web-share"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            
            <Button
              variant="outline"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-regenerate"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>Link will be revoked when regenerated</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
