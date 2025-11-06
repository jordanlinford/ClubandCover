import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@repo/ui';
import { Button } from '@repo/ui';
import { X, Coins, Zap, TrendingUp } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

const CREDIT_PACKAGES = [
  {
    amount: 100,
    price: 9.99,
    label: 'Starter',
    icon: Coins,
    popular: false,
  },
  {
    amount: 500,
    price: 39.99,
    label: 'Pro',
    icon: Zap,
    popular: true,
    bonus: 50, // 10% bonus
  },
  {
    amount: 1000,
    price: 69.99,
    label: 'Business',
    icon: TrendingUp,
    popular: false,
    bonus: 150, // 15% bonus
  },
];

type CreditPurchaseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number;
};

function CreditPurchaseForm({ 
  onClose, 
  currentBalance 
}: { 
  onClose: () => void; 
  currentBalance: number;
}) {
  const [selectedPackage, setSelectedPackage] = useState(CREDIT_PACKAGES[1]);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();
  const stripe = useStripe();
  const elements = useElements();

  const handlePurchase = async () => {
    if (!stripe || !elements) {
      setError('Payment system not ready');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card information missing');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Create payment intent
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: selectedPackage.amount + (selectedPackage.bonus || 0),
          price: selectedPackage.price,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Purchase failed');
      }

      const data = await response.json();

      // Confirm payment with card details
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.data.clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Call confirm endpoint to award credits
        const confirmResponse = await fetch('/api/credits/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
          }),
        });

        const confirmData = await confirmResponse.json();
        if (confirmData.success) {
          queryClient.invalidateQueries({ queryKey: ['/api/user/me'] });
          queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });
          onClose();
        } else {
          setError('Failed to confirm payment. Please contact support.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Purchase failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-modal-title">Purchase Credits</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Current Balance: <span className="font-semibold" data-testid="text-current-balance">{currentBalance} credits</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive" data-testid="text-error">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {CREDIT_PACKAGES.map((pkg) => {
              const Icon = pkg.icon;
              const totalCredits = pkg.amount + (pkg.bonus || 0);
              const isSelected = selectedPackage.amount === pkg.amount;

              return (
                <Card
                  key={pkg.amount}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  } ${pkg.popular ? 'border-primary' : ''}`}
                  onClick={() => setSelectedPackage(pkg)}
                  data-testid={`card-package-${pkg.amount}`}
                >
                  {pkg.popular && (
                    <div className="text-xs font-semibold text-primary mb-2" data-testid="text-popular">
                      MOST POPULAR
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{pkg.label}</h3>
                  </div>
                  <div className="mb-2">
                    <div className="text-3xl font-bold">${pkg.price}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="font-medium" data-testid={`text-credits-${pkg.amount}`}>
                      {pkg.amount} credits
                    </div>
                    {pkg.bonus && (
                      <div className="text-primary font-semibold mt-1" data-testid={`text-bonus-${pkg.amount}`}>
                        + {pkg.bonus} bonus credits!
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t">
                      <div className="font-semibold" data-testid={`text-total-${pkg.amount}`}>
                        Total: {totalCredits} credits
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-3">What can you do with credits?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Boost visibility:</strong> Make your pitches appear higher in discovery and search results</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Sponsor clubs:</strong> Target specific clubs that match your book's genre and audience</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span><strong>Track performance:</strong> View detailed analytics on impressions, clicks, and conversions</span>
              </li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-3">Payment Details</h3>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800" data-testid="card-element">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={processing || !stripe}
              className="flex-1"
              data-testid="button-purchase"
            >
              {processing ? 'Processing...' : `Purchase ${selectedPackage.amount + (selectedPackage.bonus || 0)} Credits for $${selectedPackage.price}`}
            </Button>
          </div>
        </div>
      </Card>
  );
}

export function CreditPurchaseModal({ isOpen, onClose, currentBalance = 0 }: CreditPurchaseModalProps) {
  if (!isOpen) return null;

  if (!stripePromise) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-md w-full p-6">
          <h2 className="text-xl font-bold mb-4">Payment System Unavailable</h2>
          <p className="text-muted-foreground">Stripe is not configured. Please contact support.</p>
          <Button onClick={onClose} className="mt-4 w-full">Close</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="modal-credit-purchase">
      <Elements stripe={stripePromise}>
        <CreditPurchaseForm onClose={onClose} currentBalance={currentBalance} />
      </Elements>
    </div>
  );
}
