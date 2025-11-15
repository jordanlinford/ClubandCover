import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover',
  typescript: true,
});

// Product IDs (will be created idempotently)
export const STRIPE_PRODUCTS = {
  PRO_AUTHOR: 'prod_pro_author',
  PRO_CLUB: 'prod_pro_club',
  PUBLISHER: 'prod_publisher',
  CREDITS_10: 'prod_credits_10',
  CREDITS_50: 'prod_credits_50',
  CREDITS_100: 'prod_credits_100',
};

// Price amounts in cents
export const STRIPE_PRICES = {
  PRO_AUTHOR: 1500, // $15/month
  PRO_CLUB: 2500,   // $25/month
  PUBLISHER: 9900,  // $99/month
  CREDITS_10: 990,  // $9.90 for 10 credits
  CREDITS_50: 4490, // $44.90 for 50 credits
  CREDITS_100: 7990, // $79.90 for 100 credits
};

// Credit amounts for packages
export const CREDIT_PACKAGES = {
  CREDITS_10: 10,
  CREDITS_50: 50,
  CREDITS_100: 100,
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

    // Create or get Publisher product
    await ensureProduct(
      STRIPE_PRODUCTS.PUBLISHER,
      'Publisher',
      'Full publisher access with unlimited features',
      STRIPE_PRICES.PUBLISHER
    );

    // Create or get Credit packages (one-time purchases)
    await ensureCreditProduct(
      STRIPE_PRODUCTS.CREDITS_10,
      '10 Promotion Credits',
      'Boost pitch visibility or sponsor clubs with 10 credits',
      STRIPE_PRICES.CREDITS_10,
      10
    );

    await ensureCreditProduct(
      STRIPE_PRODUCTS.CREDITS_50,
      '50 Promotion Credits',
      'Boost pitch visibility or sponsor clubs with 50 credits (10% discount)',
      STRIPE_PRICES.CREDITS_50,
      50
    );

    await ensureCreditProduct(
      STRIPE_PRODUCTS.CREDITS_100,
      '100 Promotion Credits',
      'Boost pitch visibility or sponsor clubs with 100 credits (20% discount)',
      STRIPE_PRICES.CREDITS_100,
      100
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

async function ensureCreditProduct(
  id: string,
  name: string,
  description: string,
  priceInCents: number,
  credits: number
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
        metadata: {
          credits: credits.toString(),
        },
      });

      // Create one-time payment price
      await stripe.prices.create({
        product: product.id,
        unit_amount: priceInCents,
        currency: 'usd',
        metadata: {
          credits: credits.toString(),
          type: 'credit_purchase',
        },
      });

      console.log(`[STRIPE] Created credit product: ${name}`);
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
