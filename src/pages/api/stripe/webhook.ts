import type { APIRoute } from "astro";
import { stripe } from "../../../lib/stripe";
import { adminSupabase } from "../../../lib/supabase";
import { sendMail } from "../../../lib/email";
import { CHALLENGE } from "../../../lib/config";
import { welcomeEmail } from "../../../lib/emails/templates";
import type Stripe from "stripe";

export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get("stripe-signature") ?? "";
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, import.meta.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Stripe webhook signature failed", err);
    return new Response("Bad signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response("ok", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const email = (session.customer_details?.email ?? session.customer_email ?? "").toLowerCase();
  const promoApplied = session.metadata?.promo_applied === "1";
  const amountPaidCents = session.amount_total ?? 0;

  // Optional metadata captured at /register
  const firstName = session.metadata?.first_name ?? "";
  const lastName = session.metadata?.last_name ?? "";
  const location = session.metadata?.location ?? "";
  const personalWebsite = session.metadata?.personal_website ?? "";
  const newsletterOptIn = session.metadata?.newsletter_opt_in === "1";

  if (!email) {
    console.warn("No email on session", session.id);
    return new Response("ok", { status: 200 });
  }

  const supabase = adminSupabase();

  const { data: challenge } = await supabase
    .from("challenges").select("id").eq("slug", CHALLENGE.slug).single();
  if (!challenge) return new Response("Challenge not seeded", { status: 500 });

  // Get-or-create the auth user
  const { data: existing } = await supabase.auth.admin
    .getUserByEmail(email).catch(() => ({ data: null }));
  let userId = existing?.user?.id;
  if (!userId) {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      console.error("Could not create user", createErr);
      return new Response("Could not create user", { status: 500 });
    }
    userId = created.user.id;
  }

  // Upsert profile + the new optional fields
  await supabase.from("profiles").upsert({
    id: userId,
    email,
    ...(firstName ? { legal_name: `${firstName} ${lastName}`.trim() } : {}),
    ...(location ? { city: location } : {}),
    ...(personalWebsite ? { personal_website: personalWebsite } : {}),
    newsletter_opt_in: newsletterOptIn,
  }, { onConflict: "id" });

  // Upsert registration
  await supabase.from("registrations").upsert({
    user_id: userId,
    challenge_id: challenge.id,
    stripe_session_id: session.id,
    amount_paid_cents: amountPaidCents,
    promo_applied: promoApplied,
    paid_at: new Date().toISOString(),
  }, { onConflict: "user_id,challenge_id" });

  // Magic-link for the dashboard
  const { data: link } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${import.meta.env.SITE_URL ?? "https://readmoresff.org"}/auth/callback?next=/dashboard`,
    },
  });

  // Send the rich welcome email
  const tpl = welcomeEmail({
    email,
    magicLink: link?.properties?.action_link ?? "",
    firstName, lastName,
    location: location || undefined,
    personalWebsite: personalWebsite || undefined,
    additionalWriters: [],
    newsletterOptIn,
    amountPaidCents,
    promoApplied,
    stripeSessionId: session.id,
    round1Start: new Date(CHALLENGE.calendar.round1.start),
    round1End: new Date(CHALLENGE.calendar.round1.end),
  });
  await sendMail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });

  return new Response("ok", { status: 200 });
};
