import type { APIRoute } from "astro";
import { requireAdmin } from "../../../../lib/auth";
import { adminSupabase } from "../../../../lib/supabase";
import { assignAll } from "../../../../lib/groups";

export const POST: APIRoute = async ({ cookies, request }) => {
  const admin = await requireAdmin(cookies);
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({} as any));
  const roundKind = String(body.roundKind ?? "round_1");
  const challengeSlug = String(body.challengeSlug ?? "readmoresff-1500-2026");
  const seed = typeof body.seed === "number" ? body.seed : undefined;
  const dryRun = body.dryRun === true;

  const sb = adminSupabase();

  // Find round
  const { data: ch } = await sb.from("challenges").select("id").eq("slug", challengeSlug).single();
  if (!ch) return new Response("Challenge not found", { status: 404 });

  const { data: round } = await sb
    .from("rounds")
    .select("id, kind")
    .eq("challenge_id", ch.id)
    .eq("kind", roundKind)
    .single();
  if (!round) return new Response("Round not found", { status: 404 });

  // Pull paid registrations (Round 1 = all paid; Round 2+ filter by advance list)
  let writers: { registrationId: string }[] = [];
  if (roundKind === "round_1") {
    const { data: regs } = await sb
      .from("registrations")
      .select("id")
      .eq("challenge_id", ch.id)
      .not("paid_at", "is", null)
      .is("refunded_at", null)
      .is("withdrew_at", null);
    writers = (regs ?? []).map((r: any) => ({ registrationId: r.id }));
  } else {
    // Pull from the prior round's advance list
    const priorKind = roundKind === "round_2" ? "round_1" : "round_2";
    const { data: prior } = await sb
      .from("rounds").select("id").eq("challenge_id", ch.id).eq("kind", priorKind).single();
    if (!prior) return new Response("Prior round not found", { status: 400 });
    const { data: lists } = await sb
      .from("advance_lists").select("submission_ids").eq("round_id", prior.id);
    const allSubIds = (lists ?? []).flatMap((l: any) => l.submission_ids ?? []);
    if (allSubIds.length === 0) {
      return new Response("No advance list found for prior round", { status: 400 });
    }
    const { data: subs } = await sb
      .from("submissions").select("registration_id").in("id", allSubIds);
    writers = (subs ?? []).map((s: any) => ({ registrationId: s.registration_id }));
  }

  if (writers.length === 0) {
    return new Response(JSON.stringify({ error: "No writers to assign" }), { status: 400 });
  }

  const plan = assignAll(writers, seed);

  if (dryRun) {
    return new Response(JSON.stringify({
      ok: true,
      dryRun: true,
      writers: writers.length,
      groupCount: plan.length,
      groupSizes: plan.map((g) => g.members.length),
      samplePrompts: plan.slice(0, 3).map((g) => g.prompt),
    }), { headers: { "content-type": "application/json" } });
  }

  // Clear any existing groups for this round (re-runnable)
  await sb.from("groups").delete().eq("round_id", round.id);

  // Insert groups
  const groupRows = plan.map((g) => ({
    round_id: round.id,
    number: g.groupNumber,
    prompt_genre: g.prompt.genre,
    prompt_theme: g.prompt.theme,
    prompt_object: g.prompt.object,
  }));
  const { data: insertedGroups, error: insertErr } = await sb
    .from("groups").insert(groupRows).select("id, number");
  if (insertErr || !insertedGroups) {
    console.error("Group insert failed", insertErr);
    return new Response("Group insert failed", { status: 500 });
  }

  // Insert group_members
  const memberRows = plan.flatMap((g) => {
    const grp = insertedGroups.find((ig) => ig.number === g.groupNumber);
    if (!grp) return [];
    return g.members.map((rid) => ({ registration_id: rid, group_id: grp.id }));
  });
  const { error: memErr } = await sb.from("group_members").insert(memberRows);
  if (memErr) {
    console.error("Group member insert failed", memErr);
    return new Response("Member insert failed", { status: 500 });
  }

  // Audit log
  await sb.from("audit_log").insert({
    actor_id: admin.id,
    action: "groups.generate",
    target_kind: "round",
    target_id: round.id,
    payload: { writers: writers.length, groups: plan.length, seed },
  });

  return new Response(JSON.stringify({
    ok: true,
    groupCount: plan.length,
    writerCount: writers.length,
    sizes: plan.map((g) => g.members.length),
  }), { headers: { "content-type": "application/json" } });
};
