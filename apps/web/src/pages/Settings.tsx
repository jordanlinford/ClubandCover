import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@repo/ui';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { AlertTriangle, ShieldOff, Trash2 } from 'lucide-react';

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
                <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      data-testid="button-disable-account"
                    >
                      Disable Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disable Your Account?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>
                          This will temporarily disable your account. You will be signed out and unable to access
                          the platform until you reactivate.
                        </p>
                        <p className="font-semibold">You can reactivate anytime by signing in again.</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Your data will be preserved</li>
                          <li>Active subscriptions will be paused</li>
                          <li>You can reverse this action</li>
                        </ul>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-disable">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => disableAccountMutation.mutate()}
                        disabled={disableAccountMutation.isPending}
                        data-testid="button-confirm-disable"
                      >
                        {disableAccountMutation.isPending ? 'Disabling...' : 'Disable Account'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>

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
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      data-testid="button-delete-account"
                    >
                      Delete Account Permanently
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                        <AlertDialogTitle>Delete Account Permanently?</AlertDialogTitle>
                      </div>
                      <AlertDialogDescription className="space-y-3">
                        <p className="font-semibold text-destructive">
                          This action is permanent and cannot be undone.
                        </p>
                        <p>When you delete your account:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>All personal information will be permanently removed</li>
                          <li>Your email, name, and profile will be anonymized</li>
                          <li>Active subscriptions will be canceled</li>
                          <li>Your content (books, reviews, posts) will remain but show as "Deleted User"</li>
                          <li>You will be signed out immediately</li>
                          <li>This action cannot be reversed</li>
                        </ul>
                        <p className="font-semibold mt-4">
                          Are you absolutely sure you want to proceed?
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-delete">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteAccountMutation.mutate()}
                        disabled={deleteAccountMutation.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="button-confirm-delete"
                      >
                        {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>

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
