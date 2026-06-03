/**
 * Refund a registration.
 *
 * Rules:
 *   - Only paid registrations
 *   - Only before Round 1 start - 24h (configurable via challenge config)
 *   - Stripe refund issued + registration marked refunded_at
 */
import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth";
import { adminSupabase } from "../../../lib/supabase";
import { stripe } from "../../../lib/stripe";

export const POST: APIRoute = async ({ cookies, request }) => {
  const admin = await requireAdmin(cookies);
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({} as any));
  const registrationId = String(body.registrationId ?? "");
  const force = body.force === true;
  if (!registrationId) return new Response("Missing registrationId", { status: 400 });

  const sb = adminSupabase();
  const { data: reg } = await sb
    .from("registrations")
    .select("id, stripe_session_id, amount_paid_cents, paid_at, refunded_at, challenge_id")
    .eq("id", registrationId)
    .single();

  if (!reg) return new Response("Registration not found", { status: 404 });
  if (!reg.paid_at) return new Response("Not paid; nothing to refund", { status: 400 });
  if (reg.refunded_at) return new Response("Already refunded", { status: 400 });

  // Check window — must be before round_1.start_at minus 24h, unless force=true
  if (!force) {
    const { data: r1 } = await sb
      .from("rounds")
      .select("start_at")
      .eq("challenge_id", reg.challenge_id)
      .eq("kind", "round_1")
      .maybeSingle();
    if (r1?.start_at) {
      const cutoff = new Date(r1.start_at).getTime() - 24 * 3600 * 1000;
      if (Date.now() > cutoff) {
        return new Response(
          JSON.stringify({ error: "Refund window closed (must be 24h before Round 1). Pass `force: true` to override." }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }
    }
  }

  // Issue Stripe refund
  if (!reg.stripe_session_id) return new Response("No Stripe session on file", { status: 400 });
  const session = await stripe().checkout.sessions.retrieve(reg.stripe_session_id, { expand: ["payment_intent"] });
  const pi = session.payment_intent as any;
  if (!pi) return new Response("Could not resolve payment intent", { status: 500 });

  try {
    await stripe().refunds.create({ payment_intent: typeof pi === "string" ? pi : pi.id });
  } catch (err: any) {
    console.error("Stripe refund failed", err);
    return new Response(`Stripe refund failed: ${err?.message ?? err}`, { status: 500 });
  }

  await sb.from("registrations").update({ refunded_at: new Date().toISOString() }).eq("id", reg.id);
  await sb.from("audit_log").insert({
    actor_id: admin.id,
    action: "registration.refund",
    target_kind: "registration",
    target_id: reg.id,
    payload: { amount_cents: reg.amount_paid_cents, force },
  });

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};
