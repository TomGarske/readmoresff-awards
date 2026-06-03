import Stripe from "stripe";

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = import.meta.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  _stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" as any });
  return _stripe;
}

export type CheckoutInput = {
  email: string;
  challengeSlug: string;
  promoApplied: boolean;
  successUrl: string;
  cancelUrl: string;
};

export async function createCheckoutSession(input: CheckoutInput): Promise<{ url: string; id: string }> {
  const cents = input.promoApplied
    ? Number(import.meta.env.STRIPE_PRICE_PROMO_CENTS ?? 3500)
    : Number(import.meta.env.STRIPE_PRICE_LIST_CENTS ?? 4500);

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: input.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: cents,
          product_data: {
            name: `The ReadMoreSFF 1500 — entry`,
            description: `Inaugural cycle. All three rounds covered.`,
          },
        },
      },
    ],
    metadata: {
      challenge_slug: input.challengeSlug,
      promo_applied: input.promoApplied ? "1" : "0",
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url, id: session.id };
}
