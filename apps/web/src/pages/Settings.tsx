import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { Input } from '@repo/ui';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { AlertTriangle, ShieldOff, Trash2, X, Eye, EyeOff, Key, User } from 'lucide-react';

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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profileResponse } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['/api/users/me/profile'],
    enabled: !!user?.id,
  });

  const { data: currentUserResponse } = useQuery<{ success: boolean; data: { id: string; name: string; email: string } }>({
    queryKey: ['/api/users/me'],
    enabled: !!user?.id,
  });

  const privacyMutation = useMutation({
    mutationFn: (data: { showClubs?: boolean; showBadges?: boolean; showGenres?: boolean }) =>
      api.patch('/users/profile/privacy', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/profile'] });
    },
  });

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

  const displayNameMutation = useMutation({
    mutationFn: (newName: string) => api.patch('/users/me/profile', { displayName: newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      toast({
        title: 'Display name updated',
        description: 'Your display name has been changed successfully.',
      });
      setDisplayName('');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update display name',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  const passwordChangeMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => 
      api.post('/users/me/change-password', data),
    onSuccess: () => {
      toast({
        title: 'Password changed',
        description: 'Your password has been updated. A confirmation email has been sent.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to change password',
        description: error.message || 'Please check your current password and try again.',
        variant: 'destructive',
      });
    },
  });

  const passwordsMatch = newPassword === confirmPassword;
  const isPasswordValid = newPassword.length >= 8 && 
    /[A-Z]/.test(newPassword) && 
    /[a-z]/.test(newPassword) && 
    /[0-9]/.test(newPassword);

  const profileData = profileResponse?.data;
  const showClubs = profileData?.showClubs ?? true;
  const showBadges = profileData?.showBadges ?? true;
  const showGenres = profileData?.showGenres ?? true;
  const currentUserName = currentUserResponse?.data?.name || 'User';

  // Prefill display name field when data loads
  useEffect(() => {
    if (currentUserResponse?.data?.name && !displayName) {
      setDisplayName(currentUserResponse.data.name);
    }
  }, [currentUserResponse?.data?.name]);

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
          {/* Profile Privacy Section */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Profile Privacy</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Control what information is visible on your public profile
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Show Clubs</p>
                      <p className="text-sm text-muted-foreground">Display the clubs you're a member of</p>
                    </div>
                    <Button
                      variant={showClubs ? "default" : "outline"}
                      size="sm"
                      onClick={() => privacyMutation.mutate({ showClubs: !showClubs })}
                      disabled={privacyMutation.isPending}
                      data-testid="toggle-show-clubs"
                    >
                      {showClubs ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                      {showClubs ? 'Visible' : 'Hidden'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t">
                    <div>
                      <p className="font-medium">Show Badges</p>
                      <p className="text-sm text-muted-foreground">Display your earned achievement badges</p>
                    </div>
                    <Button
                      variant={showBadges ? "default" : "outline"}
                      size="sm"
                      onClick={() => privacyMutation.mutate({ showBadges: !showBadges })}
                      disabled={privacyMutation.isPending}
                      data-testid="toggle-show-badges"
                    >
                      {showBadges ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                      {showBadges ? 'Visible' : 'Hidden'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t">
                    <div>
                      <p className="font-medium">Show Favorite Genres</p>
                      <p className="text-sm text-muted-foreground">Display your preferred book genres</p>
                    </div>
                    <Button
                      variant={showGenres ? "default" : "outline"}
                      size="sm"
                      onClick={() => privacyMutation.mutate({ showGenres: !showGenres })}
                      disabled={privacyMutation.isPending}
                      data-testid="toggle-show-genres"
                    >
                      {showGenres ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                      {showGenres ? 'Visible' : 'Hidden'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Display Name Section */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Display Name</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Change how your name appears across the platform. Your display name must be 2-50 characters and can only contain letters, numbers, spaces, dots, underscores, and hyphens.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (displayName.trim()) {
                      displayNameMutation.mutate(displayName.trim());
                    }
                  }}
                  className="space-y-3"
                >
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      placeholder={currentUserName || 'Enter new display name'}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={displayNameMutation.isPending}
                      minLength={2}
                      maxLength={50}
                      data-testid="input-display-name"
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={!displayName.trim() || displayNameMutation.isPending}
                      data-testid="button-update-display-name"
                    >
                      {displayNameMutation.isPending ? 'Updating...' : 'Update Name'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current: <span className="font-medium">{currentUserName}</span> • You can change your name 3 times per day
                  </p>
                </form>
              </div>
            </div>
          </Card>

          {/* Password Change Section */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Key className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Change Password</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Update your password to keep your account secure. Your password must be at least 8 characters and include uppercase, lowercase, and a number.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (currentPassword && newPassword && passwordsMatch && isPasswordValid) {
                      passwordChangeMutation.mutate({ currentPassword, newPassword });
                    }
                  }}
                  className="space-y-3"
                >
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={passwordChangeMutation.isPending}
                      data-testid="input-current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      data-testid="toggle-current-password"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={passwordChangeMutation.isPending}
                      minLength={8}
                      data-testid="input-new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      data-testid="toggle-new-password"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="text-xs space-y-1">
                      <p className={newPassword.length >= 8 ? 'text-green-600' : 'text-muted-foreground'}>
                        • At least 8 characters
                      </p>
                      <p className={/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-muted-foreground'}>
                        • One uppercase letter
                      </p>
                      <p className={/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-muted-foreground'}>
                        • One lowercase letter
                      </p>
                      <p className={/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-muted-foreground'}>
                        • One number
                      </p>
                    </div>
                  )}
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={passwordChangeMutation.isPending}
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      data-testid="toggle-confirm-password"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                  <Button
                    type="submit"
                    disabled={!currentPassword || !newPassword || !confirmPassword || !passwordsMatch || !isPasswordValid || passwordChangeMutation.isPending}
                    data-testid="button-change-password"
                    className="w-full"
                  >
                    {passwordChangeMutation.isPending ? 'Changing Password...' : 'Change Password'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    A confirmation email will be sent after changing your password
                  </p>
                </form>
              </div>
            </div>
          </Card>

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
