import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { useAuth } from '../contexts/AuthContext';
import { CreditPurchaseModal } from '../components/CreditPurchaseModal';
import { Coins, CreditCard, Receipt } from 'lucide-react';

const PLANS = [
  {
    id: 'PRO_AUTHOR',
    name: 'Pro Author',
    price: '$9.99/mo',
    features: [
      'Up to 10 pending swaps',
      'Priority book matches',
      'Verified author badge',
      'Author insights dashboard',
    ],
  },
  // PRO_CLUB tier hidden from UI until premium club features are implemented
  // Tier still exists in backend for existing subscribers
];

const TIER_LABELS: Record<string, string> = {
  FREE: 'Free',
  PRO_AUTHOR: 'Pro Author',
  PRO_CLUB: 'Pro Club',
  PUBLISHER: 'Publisher',
};

export function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const { user } = useAuth();

  const { data: userData } = useQuery({
    queryKey: ['/api/user/me'],
    enabled: !!user,
  });

  const { data: billingHistoryData } = useQuery({
    queryKey: ['/api/billing/history'],
    enabled: !!user,
  });

  const handleCheckout = async (plan: string) => {
    if (!user) {
      setError('Please sign in to subscribe');
      return;
    }

    setLoading(plan);
    setError('');

    try {
      const response = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) throw new Error('Failed to create checkout session');

      const data = await response.json();
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoading(null);
    }
  };

  const creditBalance = (userData as any)?.creditBalance || 0;
  const currentTier = (userData as any)?.tier || 'FREE';
  const billingHistory = (billingHistoryData as any)?.data || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        <PageHeader
          title="Billing & Usage"
          description="Manage your subscription, credits, and view billing history"
        />

        <div className="mt-6 grid md:grid-cols-2 gap-6">
          {/* Current Plan Card */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Current Plan</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Active Plan</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold" data-testid="text-current-tier">
                    {TIER_LABELS[currentTier] || currentTier}
                  </p>
                  {currentTier !== 'FREE' && (
                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary" data-testid="badge-tier-status">
                      Active
                    </span>
                  )}
                </div>
              </div>
              {currentTier !== 'FREE' && (
                <p className="text-sm text-muted-foreground">
                  Your subscription renews monthly
                </p>
              )}
              {currentTier === 'FREE' && (
                <p className="text-sm text-muted-foreground">
                  Upgrade to unlock premium features
                </p>
              )}
            </div>
          </Card>

          {/* Credit Balance Card */}
          <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Promotion Credits</h3>
                </div>
                <p className="text-2xl font-bold" data-testid="text-credit-balance">{creditBalance} credits</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use credits to boost pitches and sponsor clubs
                </p>
              </div>
              <Button
                onClick={() => setShowCreditModal(true)}
                data-testid="button-buy-credits"
              >
                Buy Credits
              </Button>
            </div>
          </Card>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive" data-testid="text-error">
            {error}
          </div>
        )}

        {/* Billing History */}
        {billingHistory.length > 0 && (
          <Card className="mt-6 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Billing History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-billing-history">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Description</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.map((item: any) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0 hover-elevate"
                      data-testid={`billing-row-${item.id}`}
                    >
                      <td className="py-3 text-sm">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-sm font-medium">
                        {item.description}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                          item.type === 'subscription' 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-secondary/10 text-secondary-foreground'
                        }`}>
                          {item.type === 'subscription' ? 'Subscription' : 'Credits'}
                        </span>
                      </td>
                      <td className="py-3 text-sm font-semibold">
                        ${(item.amount / 100).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-md capitalize ${
                          item.status === 'completed' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                            : 'bg-secondary/10 text-secondary-foreground'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Available Plans */}
        {currentTier === 'FREE' && (
          <>
            <h2 className="text-2xl font-bold mt-10 mb-4">Available Plans</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {PLANS.map((plan) => (
                <Card key={plan.id} className="p-6" data-testid={`card-plan-${plan.id}`}>
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-3xl font-bold mb-4">{plan.price}</p>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start text-sm">
                        <span className="mr-2">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    onClick={() => handleCheckout(plan.id)}
                    disabled={loading !== null}
                    data-testid={`button-subscribe-${plan.id}`}
                  >
                    {loading === plan.id ? 'Processing...' : `Subscribe to ${plan.name}`}
                  </Button>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <CreditPurchaseModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        currentBalance={creditBalance}
      />
    </div>
  );
}
