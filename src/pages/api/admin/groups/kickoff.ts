import type { APIRoute } from "astro";
import { requireAdmin } from "../../../../lib/auth";
import { adminSupabase } from "../../../../lib/supabase";
import { sendMail } from "../../../../lib/email";
import { kickoffEmail } from "../../../../lib/emails/templates";

export const POST: APIRoute = async ({ cookies, request }) => {
  const admin = await requireAdmin(cookies);
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({} as any));
  const roundKind = String(body.roundKind ?? "round_1");
  const challengeSlug = String(body.challengeSlug ?? "readmoresff-1500-2026");

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
  const deadline = new Date(round.end_at).toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });

  let sent = 0, errors = 0;
  for (const g of groups) {
    const recipients: string[] = [];
    for (const m of (g.group_members ?? [])) {
      const email = m.registrations?.profiles?.email;
      if (email) recipients.push(email);
    }
    for (const to of recipients) {
      try {
        const tpl = kickoffEmail({
          groupNumber: g.number,
          roundKind,
          promptGenre: g.prompt_genre,
          promptTheme: g.prompt_theme,
          promptObject: g.prompt_object,
          deadlineLocal: deadline,
          dashboardUrl: `${siteUrl}/dashboard`,
        });
        await sendMail({ to, subject: tpl.subject, html: tpl.html, text: tpl.text });
        sent++;
      } catch (err) {
        console.error("kickoff send failed", to, err);
        errors++;
      }
    }
  }

  await sb.from("audit_log").insert({
    actor_id: admin.id,
    action: "groups.kickoff",
    target_kind: "round",
    target_id: round.id,
    payload: { sent, errors, groups: groups.length },
  });

  return new Response(JSON.stringify({ ok: true, sent, errors, groups: groups.length }),
    { headers: { "content-type": "application/json" } });
};
