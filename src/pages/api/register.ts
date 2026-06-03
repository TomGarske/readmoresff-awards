import type { APIRoute } from "astro";
import { createCheckoutSession } from "../../lib/stripe";
import { CHALLENGE } from "../../lib/config";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const promoRaw = String(form.get("promo") ?? "").trim().toUpperCase();

  if (!email || !email.includes("@")) {
    return new Response("Email required", { status: 400 });
  }

  const expectedPromo = (import.meta.env.STRIPE_PROMO_CODE ?? "READMORE10").toUpperCase();
  const promoApplied = promoRaw === expectedPromo;

  const origin = new URL(request.url).origin;
  try {
    const session = await createCheckoutSession({
      email,
      challengeSlug: CHALLENGE.slug,
      promoApplied,
      successUrl: `${origin}/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl:  `${origin}/register?cancelled=1`,
    });
    return redirect(session.url, 303);
  } catch (err) {
    console.error("Checkout error", err);
    return new Response("Could not start checkout. Please try again.", { status: 500 });
  }
};
