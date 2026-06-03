/**
 * Compute + publish the advance list for a round.
 *
 * Pulls every submission in every group, aggregates judge scores, ranks
 * within group, takes top-N per group (per `rounds.advance_per_group`),
 * writes one `advance_lists` row per group, marks submissions advanced /
 * eliminated, and optionally sends result emails.
 */
import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth";
import { adminSupabase } from "../../../lib/supabase";
import { aggregate, rankWithinGroup, type RankableRow } from "../../../lib/scoring";
import { sendMail } from "../../../lib/email";
import { resultsEmail } from "../../../lib/emails/templates";

export const POST: APIRoute = async ({ cookies, request }) => {
  const admin = await requireAdmin(cookies);
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({} as any));
  const roundKind = String(body.roundKind ?? "round_1");
  const challengeSlug = String(body.challengeSlug ?? "readmoresff-1500-2026");
  const sendEmails = body.sendEmails === true;
  const dryRun = body.dryRun === true;

  const sb = adminSupabase();
  const { data: ch } = await sb.from("challenges").select("id").eq("slug", challengeSlug).single();
  if (!ch) return new Response("Challenge not found", { status: 404 });
  const { data: round } = await sb
    .from("rounds")
    .select("id, advance_per_group")
    .eq("challenge_id", ch.id)
    .eq("kind", roundKind)
    .single();
  if (!round) return new Response("Round not found", { status: 404 });

  // Pull every group + each group's submissions with their scores
  const { data: groups } = await sb
    .from("groups")
    .select(`
      id, number,
      group_members(
        registration_id,
        submissions:registration_id(id, submitted_at,
          assignments(id, scores(prompt_adherence, originality, prose, structure, total, submitted_at))
        )
      )
    `)
    .eq("round_id", round.id);

  if (!groups?.length) return new Response("No groups in this round", { status: 400 });

  const groupResults: { groupId: string; groupNumber: number; ranked: (RankableRow & { advanced: boolean; rank: number })[] }[] = [];
  for (const g of groups) {
    const rows: RankableRow[] = [];
    for (const member of (g.group_members ?? [])) {
      const subs = (member as any).submissions ?? [];
      for (const s of subs) {
        if (!s) continue;
        const submittedScores = (s.assignments ?? [])
          .flatMap((a: any) => a.scores ?? [])
          .filter((sc: any) => sc.submitted_at);
        if (submittedScores.length === 0) continue;
        rows.push({
          submission_id: s.id,
          agg: aggregate(submittedScores),
          submitted_at: s.submitted_at,
        });
      }
    }
    const ranked = rankWithinGroup(rows);
    const advanceN = round.advance_per_group;
    groupResults.push({
      groupId: g.id,
      groupNumber: g.number,
      ranked: ranked.map((r, idx) => ({ ...r, rank: idx + 1, advanced: idx < advanceN })),
    });
  }

  if (dryRun) {
    return new Response(JSON.stringify({
      ok: true, dryRun: true,
      groups: groupResults.map((g) => ({
        groupNumber: g.groupNumber,
        size: g.ranked.length,
        advanced: g.ranked.filter((r) => r.advanced).length,
        topThree: g.ranked.slice(0, 3).map((r) => ({ submission_id: r.submission_id, total: r.agg.median_total })),
      })),
    }, null, 2), { headers: { "content-type": "application/json" } });
  }

  // Write advance lists + mark submissions
  for (const g of groupResults) {
    const advanced = g.ranked.filter((r) => r.advanced).map((r) => r.submission_id);
    const eliminated = g.ranked.filter((r) => !r.advanced).map((r) => r.submission_id);

    await sb.from("advance_lists").upsert({
      round_id: round.id,
      group_id: g.groupId,
      submission_ids: advanced,
      finalized_at: new Date().toISOString(),
    });

    if (advanced.length > 0) {
      await sb.from("submissions").update({ status: "advanced" }).in("id", advanced);
    }
    if (eliminated.length > 0) {
      await sb.from("submissions").update({ status: "eliminated" }).in("id", eliminated);
    }
  }

  await sb.from("audit_log").insert({
    actor_id: admin.id,
    action: "advance.publish",
    target_kind: "round",
    target_id: round.id,
    payload: { groups: groupResults.length, sendEmails },
  });

  // Optionally send results emails
  let sent = 0, errors = 0;
  if (sendEmails) {
    for (const g of groupResults) {
      for (const r of g.ranked) {
        const { data: sub } = await sb
          .from("submissions")
          .select("registration_id, registrations(profiles(email))")
          .eq("id", r.submission_id)
          .maybeSingle();
        const email = (sub as any)?.registrations?.profiles?.email;
        if (!email) continue;
        try {
          const tpl = resultsEmail({
            advanced: r.advanced,
            rank: r.rank,
            groupSize: g.ranked.length,
            roundKind,
            feedbackUrl: `${import.meta.env.SITE_URL ?? "https://readmoresff.org"}/dashboard`,
          });
          await sendMail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });
          sent++;
        } catch (e) { errors++; }
      }
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    groups: groupResults.length,
    advanced: groupResults.reduce((s, g) => s + g.ranked.filter((r) => r.advanced).length, 0),
    eliminated: groupResults.reduce((s, g) => s + g.ranked.filter((r) => !r.advanced).length, 0),
    emails: { sent, errors },
  }), { headers: { "content-type": "application/json" } });
};
