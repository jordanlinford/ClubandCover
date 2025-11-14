import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { AlertTriangle, ShieldOff, Trash2, X } from 'lucide-react';

type ConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmText: string;
  confirmVariant?: 'default' | 'destructive';
  isLoading?: boolean;
};

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  confirmVariant = 'default',
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-lg mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-6">{description}</div>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isLoading}
            data-testid="button-confirm"
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const disableAccountMutation = useMutation({
    mutationFn: () => api.post('/users/me/disable', {}),
    onSuccess: async () => {
      setDisableDialogOpen(false);
      await signOut();
      setLocation('/');
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => api.post('/users/me/delete', {}),
    onSuccess: async () => {
      setDeleteDialogOpen(false);
      await signOut();
      setLocation('/');
    },
  });

  if (!user) {
    setLocation('/auth/sign-in');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <PageHeader
          title="Account Settings"
          description="Manage your account preferences and security"
        />

        <div className="mt-6 space-y-6">
          {/* Disable Account Section */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <ShieldOff className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Disable Account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Temporarily disable your account. You can reactivate it anytime by signing in again.
                  Your data will be preserved, but your account will be inaccessible until reactivated.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setDisableDialogOpen(true)}
                  data-testid="button-disable-account"
                >
                  Disable Account
                </Button>
              </div>
            </div>
          </Card>

          <ConfirmationModal
            isOpen={disableDialogOpen}
            onClose={() => setDisableDialogOpen(false)}
            onConfirm={() => disableAccountMutation.mutate()}
            title="Disable Your Account?"
            confirmText="Disable Account"
            isLoading={disableAccountMutation.isPending}
            description={
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This will temporarily disable your account. You will be signed out and unable to access
                  the platform until you reactivate.
                </p>
                <p className="font-semibold text-foreground">You can reactivate anytime by signing in again.</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Your data will be preserved</li>
                  <li>Active subscriptions will be paused</li>
                  <li>You can reverse this action</li>
                </ul>
              </div>
            }
          />

          {/* Delete Account Section */}
          <Card className="p-6 border-destructive/50">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">Delete Account</h3>
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently delete your account and remove all personal information.
                  This action cannot be undone. Your content will remain but will be attributed to "Deleted User".
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  data-testid="button-delete-account"
                >
                  Delete Account Permanently
                </Button>
              </div>
            </div>
          </Card>

          <ConfirmationModal
            isOpen={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            onConfirm={() => deleteAccountMutation.mutate()}
            title="Delete Account Permanently?"
            confirmText="Delete Permanently"
            confirmVariant="destructive"
            isLoading={deleteAccountMutation.isPending}
            description={
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-destructive font-semibold">
                  <AlertTriangle className="w-5 h-5" />
                  <span>This action is permanent and cannot be undone.</span>
                </div>
                <p className="text-sm text-muted-foreground">When you delete your account:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>All personal information will be permanently removed</li>
                  <li>Your email, name, and profile will be anonymized</li>
                  <li>Active subscriptions will be canceled</li>
                  <li>Your content (books, reviews, posts) will remain but show as "Deleted User"</li>
                  <li>You will be signed out immediately</li>
                  <li>This action cannot be reversed</li>
                </ul>
                <p className="font-semibold text-foreground mt-4">
                  Are you absolutely sure you want to proceed?
                </p>
              </div>
            }
          />

          {/* Info Card */}
          <Card className="p-6 bg-muted/50">
            <h3 className="text-sm font-semibold mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground">
              If you're having issues with your account or need assistance, please contact our support team
              before disabling or deleting your account.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
