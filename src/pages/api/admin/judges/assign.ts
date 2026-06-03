/**
 * Distribute submissions to judges for a round.
 *
 * Each submission gets N judge reads (default 2). Load-balanced — every
 * judge gets roughly the same number. Avoids assigning a judge to a story
 * in a subgenre they've flagged as out-of-specialty (if specialty_genres set).
 */
import type { APIRoute } from "astro";
import { requireAdmin } from "../../../../lib/auth";
import { adminSupabase } from "../../../../lib/supabase";
import { shuffle } from "../../../../lib/groups";

const READS_PER_STORY = 2;

export const POST: APIRoute = async ({ cookies, request }) => {
  const admin = await requireAdmin(cookies);
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({} as any));
  const roundKind = String(body.roundKind ?? "round_1");
  const challengeSlug = String(body.challengeSlug ?? "readmoresff-1500-2026");
  const seed = typeof body.seed === "number" ? body.seed : undefined;
  const readsPerStory = Number(body.readsPerStory ?? READS_PER_STORY);

  const sb = adminSupabase();
  const { data: ch } = await sb.from("challenges").select("id").eq("slug", challengeSlug).single();
  if (!ch) return new Response("Challenge not found", { status: 404 });
  const { data: round } = await sb.from("rounds").select("id").eq("challenge_id", ch.id).eq("kind", roundKind).single();
  if (!round) return new Response("Round not found", { status: 404 });

  const { data: subs } = await sb
    .from("submissions")
    .select("id, group_members:group_members!inner(group_id), registration_id, groups:group_members(group_id, groups(prompt_genre))")
    .eq("round_id", round.id)
    .in("status", ["submitted", "anonymized"]);

  const { data: judges } = await sb.from("judges").select("id, specialty_genres").eq("challenge_id", ch.id);

  if (!judges?.length) return new Response("No judges configured", { status: 400 });
  if (!subs?.length) return new Response("No submissions in this round", { status: 400 });

  const judgeLoad = new Map<string, number>();
  judges.forEach((j: any) => judgeLoad.set(j.id, 0));

  const newAssignments: { submission_id: string; judge_id: string; due_at: string }[] = [];

  const dueAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const orderedSubs = shuffle(subs as any[], seed);

  for (const sub of orderedSubs) {
    const subGenre = (sub as any).groups?.[0]?.groups?.prompt_genre as string | undefined;
    const candidates = judges
      .map((j: any) => {
        const onSpec = (j.specialty_genres ?? []).length === 0
          || (subGenre && j.specialty_genres.includes(subGenre));
        return { id: j.id, onSpec, load: judgeLoad.get(j.id) ?? 0 };
      })
      .sort((a, b) => {
        if (a.onSpec !== b.onSpec) return a.onSpec ? -1 : 1;
        return a.load - b.load;
      });

    const picked: string[] = [];
    for (const c of candidates) {
      if (picked.length >= readsPerStory) break;
      if (picked.includes(c.id)) continue;
      picked.push(c.id);
      judgeLoad.set(c.id, (judgeLoad.get(c.id) ?? 0) + 1);
    }
    for (const jid of picked) {
      newAssignments.push({ submission_id: (sub as any).id, judge_id: jid, due_at: dueAt });
    }
  }

  // Insert all assignments (idempotent via unique constraint)
  const { error: insErr } = await sb.from("assignments").upsert(newAssignments, {
    onConflict: "submission_id,judge_id",
    ignoreDuplicates: true,
  });
  if (insErr) {
    console.error("Assignment insert failed", insErr);
    return new Response("Insert failed", { status: 500 });
  }

  await sb.from("audit_log").insert({
    actor_id: admin.id,
    action: "judges.assign",
    target_kind: "round",
    target_id: round.id,
    payload: { assignments: newAssignments.length, judges: judges.length, subs: subs.length, readsPerStory },
  });

  return new Response(JSON.stringify({
    ok: true,
    assignments: newAssignments.length,
    judges: judges.length,
    submissions: subs.length,
    load: Object.fromEntries(judgeLoad),
  }), { headers: { "content-type": "application/json" } });
};
