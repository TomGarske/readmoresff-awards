import type { APIRoute } from "astro";
import { createCheckoutSession } from "../../lib/stripe";
import { CHALLENGE } from "../../lib/config";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const firstName = String(form.get("first_name") ?? "").trim();
  const lastName = String(form.get("last_name") ?? "").trim();
  const location = String(form.get("location") ?? "").trim();
  const personalWebsite = String(form.get("personal_website") ?? "").trim();
  const promoRaw = String(form.get("promo") ?? "").trim().toUpperCase();
  const newsletterOptIn = form.get("newsletter_opt_in") === "1";

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
      metadata: {
        first_name: firstName,
        last_name: lastName,
        location,
        personal_website: personalWebsite,
        newsletter_opt_in: newsletterOptIn ? "1" : "0",
      },
    });
    return redirect(session.url, 303);
  } catch (err) {
    console.error("Checkout error", err);
    return new Response("Could not start checkout. Please try again.", { status: 500 });
  }
};
