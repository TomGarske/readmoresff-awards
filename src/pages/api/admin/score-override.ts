import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth";
import { adminSupabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ cookies, request }) => {
  const admin = await requireAdmin(cookies);
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({}));
  const scoreId = String(body.score_id ?? "");
  const total = Number(body.overridden_total);
  const reason = String(body.override_reason ?? "").trim();

  if (!scoreId || !Number.isFinite(total) || total < 1 || total > 100 || !reason) {
    return new Response("Bad input", { status: 400 });
  }

  const sb = adminSupabase();
  const { error } = await sb.from("scores").update({
    overridden_total: total,
    overridden_by: admin.id,
    overridden_at: new Date().toISOString(),
    override_reason: reason,
  }).eq("id", scoreId);

  if (error) {
    console.error("Override save failed", error);
    return new Response("Save failed", { status: 500 });
  }

  await sb.from("audit_log").insert({
    actor_id: admin.id,
    action: "score.override",
    target_kind: "score",
    target_id: scoreId,
    payload: { total, reason },
  });

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};
