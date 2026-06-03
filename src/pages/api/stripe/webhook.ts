import type { APIRoute } from "astro";
import { stripe } from "../../../lib/stripe";
import { adminSupabase } from "../../../lib/supabase";
import { sendMail } from "../../../lib/email";
import { CHALLENGE } from "../../../lib/config";
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = (session.customer_details?.email ?? session.customer_email ?? "").toLowerCase();
    const promoApplied = session.metadata?.promo_applied === "1";

    if (!email) {
      console.warn("No email on session", session.id);
      return new Response("ok", { status: 200 });
    }

    const supabase = adminSupabase();

    // Look up challenge
    const { data: challenge } = await supabase
      .from("challenges").select("id").eq("slug", CHALLENGE.slug).single();
    if (!challenge) return new Response("Challenge not seeded", { status: 500 });

    // Create or fetch the auth user via Supabase admin API
    const { data: existing } = await supabase.auth.admin.getUserByEmail(email).catch(() => ({ data: null }));
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

    // Upsert profile
    await supabase.from("profiles").upsert({ id: userId, email }, { onConflict: "id" });

    // Upsert registration
    await supabase.from("registrations").upsert({
      user_id: userId,
      challenge_id: challenge.id,
      stripe_session_id: session.id,
      amount_paid_cents: session.amount_total ?? 0,
      promo_applied: promoApplied,
      paid_at: new Date().toISOString(),
    }, { onConflict: "user_id,challenge_id" });

    // Send magic link to land them in their dashboard
    const { data: link } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${import.meta.env.SITE_URL ?? "https://readmoresff.org"}/auth/callback?next=/dashboard` },
    });

    await sendMail({
      to: email,
      subject: "Welcome to The ReadMoreSFF 1500",
      html: `
        <p>Thanks for registering for <strong>${CHALLENGE.name}</strong>.</p>
        <p>Click below to sign in and set up your account (pen name, mailing address for prize delivery):</p>
        <p><a href="${link?.properties?.action_link ?? "#"}">Sign in to my dashboard →</a></p>
        <p>We'll email you when registration closes with your group assignment and Round 1 prompt.</p>
        <p>— The ReadMoreSFF Awards team</p>
      `,
    });
  }

  return new Response("ok", { status: 200 });
};
