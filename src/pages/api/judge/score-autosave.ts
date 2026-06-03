/**
 * Lightweight autosave endpoint. Accepts partial JSON; never marks the
 * score "submitted" — that's reserved for the explicit submit_final.
 */
import type { APIRoute } from "astro";
import { getCurrentUser } from "../../../lib/auth";
import { adminSupabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getCurrentUser(cookies);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({}));
  const assignmentId = String(body.assignment_id ?? "");
  if (!assignmentId) return new Response("Missing assignment", { status: 400 });

  const sb = adminSupabase();
  const { data: judgeRow } = await sb.from("judges").select("id").eq("user_id", user.id).maybeSingle();
  if (!judgeRow) return new Response("Not a judge", { status: 403 });

  const { data: assignment } = await sb
    .from("assignments").select("id, judge_id").eq("id", assignmentId).maybeSingle();
  if (!assignment || assignment.judge_id !== judgeRow.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const cleanInt = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && n <= 25 ? n : null;
  };

  const { error } = await sb.from("scores").upsert({
    assignment_id: assignmentId,
    prompt_adherence: cleanInt(body.prompt_adherence),
    originality: cleanInt(body.originality),
    prose: cleanInt(body.prose),
    structure: cleanInt(body.structure),
    feedback_md: typeof body.feedback_md === "string" ? body.feedback_md.slice(0, 8000) : null,
    submitted_at: null,
  }, { onConflict: "assignment_id" });

  if (error) {
    console.error("Autosave failed", error);
    return new Response("Save failed", { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true, saved_at: new Date().toISOString() }),
    { headers: { "content-type": "application/json" } });
};
