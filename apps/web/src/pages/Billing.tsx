import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';

export function BillingPage() {
  const handleUpgrade = async () => {
    try {
      const response = await fetch('/api/billing/stub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      console.log('Billing stub response:', data);
      alert('Upgrade feature coming soon!');
    } catch (error) {
      console.error('Billing error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <PageHeader
          title="Billing & Subscription"
          description="Manage your subscription and payment details"
        />

        <div className="mt-6 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-lg">Free Plan</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Basic features included
                </p>
              </div>
              <span className="text-2xl font-bold">$0<span className="text-sm font-normal text-gray-600 dark:text-gray-400">/mo</span></span>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-2">Free Plan</h3>
              <p className="text-3xl font-bold mb-4">$0<span className="text-base font-normal text-gray-600 dark:text-gray-400">/mo</span></p>
              <ul className="space-y-2 mb-6 text-sm">
                <li>✓ Up to 10 books</li>
                <li>✓ Join 3 clubs</li>
                <li>✓ 5 swaps per month</li>
                <li>✓ Basic support</li>
              </ul>
              <Button variant="outline" disabled className="w-full" data-testid="button-current-plan">
                Current Plan
              </Button>
            </Card>

            <Card className="p-6 border-2 border-blue-500 relative">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-3 py-1 rounded-bl">
                Popular
              </div>
              <h3 className="font-semibold text-lg mb-2">Premium Plan</h3>
              <p className="text-3xl font-bold mb-4">$9<span className="text-base font-normal text-gray-600 dark:text-gray-400">/mo</span></p>
              <ul className="space-y-2 mb-6 text-sm">
                <li>✓ Unlimited books</li>
                <li>✓ Unlimited clubs</li>
                <li>✓ Unlimited swaps</li>
                <li>✓ Priority support</li>
                <li>✓ Advanced analytics</li>
              </ul>
              <Button onClick={handleUpgrade} className="w-full" data-testid="button-upgrade">
                Upgrade Plan
              </Button>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              No payment method on file
            </p>
            <Button variant="outline" data-testid="button-add-payment">
              Add Payment Method
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
