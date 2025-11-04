import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// Product IDs (will be created idempotently)
export const STRIPE_PRODUCTS = {
  PRO_AUTHOR: 'prod_pro_author',
  PRO_CLUB: 'prod_pro_club',
  PUBLISHER: 'prod_publisher',
};

// Price amounts in cents
export const STRIPE_PRICES = {
  PRO_AUTHOR: 1500, // $15/month
  PRO_CLUB: 2500,   // $25/month
  PUBLISHER: 9900,  // $99/month
};

/**
 * Ensure products and prices exist in Stripe (idempotent)
 */
export async function ensureStripeProducts(): Promise<void> {
  try {
    // Create or get Pro Author product
    await ensureProduct(
      STRIPE_PRODUCTS.PRO_AUTHOR,
      'Pro Author',
      'Access to author-level features with increased swap limits',
      STRIPE_PRICES.PRO_AUTHOR
    );

    // Create or get Pro Club product
    await ensureProduct(
      STRIPE_PRODUCTS.PRO_CLUB,
      'Pro Club',
      'Manage book clubs with advanced features',
      STRIPE_PRICES.PRO_CLUB
    );

    // Create or get Publisher product (stub for later)
    await ensureProduct(
      STRIPE_PRODUCTS.PUBLISHER,
      'Publisher',
      'Full publisher access with unlimited features',
      STRIPE_PRICES.PUBLISHER
    );

    console.log('[STRIPE] Products and prices ensured');
  } catch (error) {
    console.error('[STRIPE] Error ensuring products:', error);
  }
}

async function ensureProduct(
  id: string,
  name: string,
  description: string,
  priceInCents: number
): Promise<void> {
  try {
    // Try to retrieve existing product
    await stripe.products.retrieve(id);
  } catch (error: any) {
    if (error.code === 'resource_missing') {
      // Create product
      const product = await stripe.products.create({
        id,
        name,
        description,
      });

      // Create price
      await stripe.prices.create({
        product: product.id,
        unit_amount: priceInCents,
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          plan: id.replace('prod_', '').toUpperCase(),
        },
      });

      console.log(`[STRIPE] Created product: ${name}`);
    }
  }
}

/**
 * Map Stripe product ID to Tier enum
 */
export function mapProductToTier(productId: string): 'PRO_AUTHOR' | 'PRO_CLUB' | 'PUBLISHER' | null {
  switch (productId) {
    case STRIPE_PRODUCTS.PRO_AUTHOR:
      return 'PRO_AUTHOR';
    case STRIPE_PRODUCTS.PRO_CLUB:
      return 'PRO_CLUB';
    case STRIPE_PRODUCTS.PUBLISHER:
      return 'PUBLISHER';
    default:
      return null;
  }
}

// Legacy helpers
export async function createPaymentIntent(amount: number, currency = 'usd') {
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
  });
}

export async function createCustomer(email: string, name?: string) {
  return stripe.customers.create({
    email,
    name,
  });
}
