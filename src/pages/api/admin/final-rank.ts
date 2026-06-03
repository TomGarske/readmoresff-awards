/**
 * Compute the overall ranking for the FINAL round and assign prize places.
 *
 * Final-round submissions live in a single big "pool" group. We aggregate
 * scores across all finalists, rank them, and assign:
 *   - place 1..10 (the prize ladder from CHALLENGE.prizes.ladder)
 *   - final_prize_cents from the ladder
 *   - HM for finalists who didn't place but submitted
 *
 * Sends prize/HM emails when sendEmails=true.
 */
import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth";
import { adminSupabase } from "../../../lib/supabase";
import { aggregate, rankWithinGroup, type RankableRow } from "../../../lib/scoring";
import { CHALLENGE } from "../../../lib/config";
import { sendMail } from "../../../lib/email";
import { prizeWinnerEmail, honorableMentionEmail } from "../../../lib/emails/prizes";

export const POST: APIRoute = async ({ cookies, request }) => {
  const admin = await requireAdmin(cookies);
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({} as any));
  const challengeSlug = String(body.challengeSlug ?? "readmoresff-1500-2026");
  const sendEmails = body.sendEmails === true;
  const dryRun = body.dryRun === true;

  const sb = adminSupabase();
  const { data: ch } = await sb.from("challenges").select("id").eq("slug", challengeSlug).single();
  if (!ch) return new Response("Challenge not found", { status: 404 });
  const { data: finalRound } = await sb
    .from("rounds").select("id").eq("challenge_id", ch.id).eq("kind", "final").single();
  if (!finalRound) return new Response("Final round not found", { status: 404 });

  // Pull every submission for the final round with its scores
  const { data: subs } = await sb
    .from("submissions")
    .select(`
      id, title, submitted_at, registration_id,
      registrations(profiles(email, pen_name)),
      assignments(scores(prompt_adherence, originality, prose, structure, total, submitted_at))
    `)
    .eq("round_id", finalRound.id);

  if (!subs?.length) return new Response("No final submissions", { status: 400 });

  const rows: (RankableRow & { title: string; email?: string })[] = subs
    .map((s: any) => {
      const scoreRows = (s.assignments ?? [])
        .flatMap((a: any) => a.scores ?? [])
        .filter((sc: any) => sc.submitted_at);
      if (scoreRows.length === 0) return null;
      return {
        submission_id: s.id,
        title: s.title ?? "Untitled",
        email: s.registrations?.profiles?.email,
        agg: aggregate(scoreRows),
        submitted_at: s.submitted_at,
      };
    })
    .filter(Boolean) as any[];

  const ranked = rankWithinGroup(rows);
  const ladder = CHALLENGE.prizes.ladder;

  // Assign places + prize amounts
  const assignments = ranked.map((r, idx) => {
    const place = idx + 1;
    const prize = ladder.find((l) => l.place === place);
    return {
      ...r,
      rank: place,
      final_place: place <= ladder.length ? place : null,
      final_prize_cents: prize?.cents ?? 0,
    };
  });

  if (dryRun) {
    return new Response(JSON.stringify({
      ok: true, dryRun: true,
      total: assignments.length,
      top10: assignments.slice(0, 10).map((a) => ({
        rank: a.rank, title: a.title,
        median_total: a.agg.median_total,
        prize_cents: a.final_prize_cents,
      })),
    }, null, 2), { headers: { "content-type": "application/json" } });
  }

  // Write final_place + prize_cents to submissions
  for (const a of assignments) {
    if (a.final_place == null && a.final_prize_cents === 0) continue;
    await sb.from("submissions").update({
      final_place: a.final_place,
      final_prize_cents: a.final_prize_cents,
    }).eq("id", a.submission_id);
  }

  // Build a "winners" advance list row for /results to show
  const winnersIds = assignments.filter((a) => a.final_place !== null).map((a) => a.submission_id);
  await sb.from("advance_lists").upsert({
    round_id: finalRound.id,
    group_id: null,
    submission_ids: winnersIds,
    finalized_at: new Date().toISOString(),
  });

  await sb.from("audit_log").insert({
    actor_id: admin.id,
    action: "final.publish",
    target_kind: "round",
    target_id: finalRound.id,
    payload: { winners: winnersIds.length, total: assignments.length, sendEmails },
  });

  let sent = 0, errors = 0;
  if (sendEmails) {
    const siteUrl = import.meta.env.SITE_URL ?? "https://readmoresff.org";
    for (const a of assignments) {
      if (!a.email) continue;
      try {
        const tpl = a.final_place !== null
          ? prizeWinnerEmail({
              place: a.final_place,
              prizeCents: a.final_prize_cents,
              storyTitle: a.title,
              dashboardUrl: `${siteUrl}/dashboard`,
            })
          : honorableMentionEmail({
              rank: a.rank,
              storyTitle: a.title,
              dashboardUrl: `${siteUrl}/dashboard`,
            });
        await sendMail({ to: a.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
        sent++;
      } catch (e) { errors++; }
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    winners: winnersIds.length,
    total: assignments.length,
    emails: { sent, errors },
  }), { headers: { "content-type": "application/json" } });
};
