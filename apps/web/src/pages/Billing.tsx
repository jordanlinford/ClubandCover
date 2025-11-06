import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { PageHeader } from '@repo/ui';
import { useAuth } from '../contexts/AuthContext';
import { CreditPurchaseModal } from '../components/CreditPurchaseModal';
import { Coins } from 'lucide-react';

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
  {
    id: 'PRO_CLUB',
    name: 'Pro Club',
    price: '$19.99/mo',
    features: [
      'Unlimited club members',
      'Private club discussions',
      'Advanced moderation tools',
      'Custom club branding',
    ],
  },
];

export function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const { user } = useAuth();

  const { data: userData } = useQuery({
    queryKey: ['/api/user/me'],
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        <PageHeader
          title="Billing & Subscription"
          description="Upgrade your account to unlock premium features"
        />

        <Card className="mt-6 p-6 bg-gradient-to-r from-primary/10 to-primary/5">
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

        {error && (
          <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400" data-testid="text-error">
            {error}
          </div>
        )}

        <div className="mt-8 grid md:grid-cols-2 gap-6">
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

        <Card className="mt-8 p-6">
          <h3 className="font-semibold mb-2">Free Plan</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You're currently on the free plan with up to 3 pending swaps.
            Upgrade to unlock more features!
          </p>
        </Card>
      </div>

      <CreditPurchaseModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        currentBalance={creditBalance}
      />
    </div>
  );
}
