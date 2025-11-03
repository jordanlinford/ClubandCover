import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';

export function ProfilePage() {
  // Mock user data when Supabase is not configured
  const mockUser = {
    id: 'mock-user-123',
    name: 'Demo User',
    email: 'demo@bookclub.com',
    avatarUrl: null,
    bio: 'Book enthusiast and avid reader',
    memberSince: '2024-01-01'
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <PageHeader
          title="Profile"
          description="Manage your account settings"
        />
        
        <div className="mt-6 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-2xl">
                  {mockUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-lg" data-testid="text-username">
                    {mockUser.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-email">
                    {mockUser.email}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <p className="text-gray-700 dark:text-gray-300" data-testid="text-bio">
                  {mockUser.bio}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Member Since</label>
                <p className="text-gray-700 dark:text-gray-300">
                  {new Date(mockUser.memberSince).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex space-x-3">
              <Button data-testid="button-edit-profile">Edit Profile</Button>
              <Button variant="outline" data-testid="button-change-password">
                Change Password
              </Button>
            </div>
          </Card>
          
          <Card className="p-6 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
            <h3 className="font-semibold mb-2">Mock Data Notice</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              This is mock profile data. Configure Supabase to enable real authentication and user profiles.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
