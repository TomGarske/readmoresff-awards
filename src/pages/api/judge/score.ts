import type { APIRoute } from "astro";
import { getCurrentUser } from "../../../lib/auth";
import { adminSupabase } from "../../../lib/supabase";

const between = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const user = await getCurrentUser(cookies);
  if (!user) return new Response("Not signed in", { status: 401 });

  const form = await request.formData();
  const assignmentId = String(form.get("assignment_id") ?? "");
  const action = String(form.get("action") ?? "save_draft");
  const promptAdherence = Number(form.get("prompt_adherence"));
  const originality = Number(form.get("originality"));
  const prose = Number(form.get("prose"));
  const structure = Number(form.get("structure"));
  const feedback = String(form.get("feedback_md") ?? "").trim();

  if (!assignmentId) return new Response("Missing assignment", { status: 400 });

  if (action === "submit_final") {
    for (const [name, val] of Object.entries({ promptAdherence, originality, prose, structure })) {
      if (!between(val, 1, 25)) {
        return new Response(`${name} must be 1-25 (got ${val})`, { status: 400 });
      }
    }
    if (feedback.length < 30) {
      return new Response("Feedback must be at least 30 characters", { status: 400 });
    }
  }

  const sb = adminSupabase();
  const { data: judgeRow } = await sb
    .from("judges").select("id").eq("user_id", user.id).maybeSingle();
  if (!judgeRow) return new Response("Not a judge", { status: 403 });

  const { data: assignment } = await sb
    .from("assignments").select("id, judge_id").eq("id", assignmentId).maybeSingle();
  if (!assignment || assignment.judge_id !== judgeRow.id) {
    return new Response("Assignment not yours", { status: 403 });
  }

  // Upsert score
  const submittedAt = action === "submit_final" ? new Date().toISOString() : null;
  const { error: scoreErr } = await sb.from("scores").upsert({
    assignment_id: assignmentId,
    prompt_adherence: promptAdherence || null,
    originality: originality || null,
    prose: prose || null,
    structure: structure || null,
    feedback_md: feedback || null,
    submitted_at: submittedAt,
  }, { onConflict: "assignment_id" });
  if (scoreErr) {
    console.error("Score upsert failed", scoreErr);
    return new Response("Could not save score", { status: 500 });
  }

  if (action === "submit_final") {
    await sb.from("assignments").update({ status: "submitted" }).eq("id", assignmentId);
    await sb.from("audit_log").insert({
      actor_id: user.id,
      action: "score.submit",
      target_kind: "assignment",
      target_id: assignmentId,
      payload: { total: promptAdherence + originality + prose + structure },
    });
  }

  return redirect("/judge", 303);
};
