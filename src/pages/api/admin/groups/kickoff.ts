import type { APIRoute } from "astro";
import { requireAdmin } from "../../../../lib/auth";
import { adminSupabase } from "../../../../lib/supabase";
import { sendMail } from "../../../../lib/email";
import { kickoffEmail, kickoffReminderEmail } from "../../../../lib/emails/templates";

export const POST: APIRoute = async ({ cookies, request }) => {
  const admin = await requireAdmin(cookies);
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({} as any));
  const roundKind = String(body.roundKind ?? "round_1");
  const challengeSlug = String(body.challengeSlug ?? "readmoresff-1500-2026");
  // mode: "kickoff" (default) or "reminder" — the latter is the "just in case" duplicate
  const mode = body.mode === "reminder" ? "reminder" : "kickoff";

  const sb = adminSupabase();

  const { data: ch } = await sb.from("challenges").select("id").eq("slug", challengeSlug).single();
  if (!ch) return new Response("Challenge not found", { status: 404 });

  const { data: round } = await sb
    .from("rounds")
    .select("id, end_at")
    .eq("challenge_id", ch.id)
    .eq("kind", roundKind)
    .single();
  if (!round) return new Response("Round not found", { status: 404 });

  // Pull groups + writer emails
  const { data: groups } = await sb
    .from("groups")
    .select(`
      id, number, prompt_genre, prompt_theme, prompt_object,
      group_members(
        registration_id,
        registrations(profiles(email))
      )
    `)
    .eq("round_id", round.id);

  if (!groups?.length) return new Response("No groups configured", { status: 400 });

  const siteUrl = import.meta.env.SITE_URL ?? "https://readmoresff.org";
  const deadlineUtc = new Date(round.end_at);

  let sent = 0, errors = 0;
  for (const g of groups) {
    const recipients: string[] = [];
    for (const m of (g.group_members ?? [])) {
      const email = m.registrations?.profiles?.email;
      if (email) recipients.push(email);
    }
    const input = {
      groupNumber: g.number,
      roundKind,
      promptGenre: g.prompt_genre,
      promptTheme: g.prompt_theme,
      promptObject: g.prompt_object,
      deadlineUtc,
      dashboardUrl: `${siteUrl}/dashboard`,
      uploadUrl: `${siteUrl}/dashboard/submit`,
      rulesUrl: `${siteUrl}/#rules`,
      faqUrl: `${siteUrl}/#how`,
    };
    for (const to of recipients) {
      try {
        const tpl = mode === "reminder" ? kickoffReminderEmail(input) : kickoffEmail(input);
        await sendMail({ to, subject: tpl.subject, html: tpl.html, text: tpl.text });
        sent++;
      } catch (err) {
        console.error(`${mode} send failed`, to, err);
        errors++;
      }
    }
  }

  await sb.from("audit_log").insert({
    actor_id: admin.id,
    action: `groups.${mode}`,
    target_kind: "round",
    target_id: round.id,
    payload: { sent, errors, groups: groups.length, mode },
  });

  return new Response(JSON.stringify({ ok: true, sent, errors, groups: groups.length }),
    { headers: { "content-type": "application/json" } });
};
