import type { APIRoute } from "astro";
import { getCurrentUser } from "../../../lib/auth";
import { adminSupabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getCurrentUser(cookies);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({}));
  const assignmentId = String(body.assignment_id ?? "");
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 1000) : "";
  if (!assignmentId) return new Response("Missing assignment", { status: 400 });

  const sb = adminSupabase();
  const { data: judgeRow } = await sb.from("judges").select("id").eq("user_id", user.id).maybeSingle();
  if (!judgeRow) return new Response("Not a judge", { status: 403 });

  const { data: assignment } = await sb
    .from("assignments").select("id, judge_id").eq("id", assignmentId).maybeSingle();
  if (!assignment || assignment.judge_id !== judgeRow.id) {
    return new Response("Forbidden", { status: 403 });
  }

  await sb.from("assignments").update({
    coi_flagged: true,
    coi_reason: reason || null,
    coi_flagged_at: new Date().toISOString(),
    status: "reassigned",
  }).eq("id", assignmentId);

  await sb.from("audit_log").insert({
    actor_id: user.id,
    action: "assignment.coi_flagged",
    target_kind: "assignment",
    target_id: assignmentId,
    payload: { reason },
  });

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};
