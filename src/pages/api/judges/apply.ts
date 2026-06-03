import type { APIRoute } from "astro";
import { adminSupabase } from "../../../lib/supabase";
import { sendMail } from "../../../lib/email";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const whyQualified = String(form.get("why_qualified") ?? "").trim();
  const socialLinks = String(form.get("social_links") ?? "").trim();
  const specialties = form.getAll("specialties").map((v) => String(v));

  if (!name || !email || !whyQualified) {
    return new Response("Missing required fields", { status: 400 });
  }

  const sb = adminSupabase();
  const { error } = await sb.from("judge_applications").insert({
    name, email, why_qualified: whyQualified, specialties,
    social_links: socialLinks || null,
  });
  if (error) {
    console.error("Judge application insert failed", error);
    return new Response("Could not save application", { status: 500 });
  }

  // Notify the admin team
  const adminEmails = (import.meta.env.ADMIN_EMAILS ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
  for (const to of adminEmails) {
    try {
      await sendMail({
        to,
        subject: `New judge application — ${name}`,
        html: `<p><strong>${name}</strong> (${email}) applied to judge.</p><p><em>Why qualified:</em></p><blockquote>${whyQualified.replace(/\n/g, "<br>")}</blockquote><p>Specialties: ${specialties.join(", ") || "(none selected)"}</p><p>Social: ${socialLinks || "—"}</p><p><a href="${import.meta.env.SITE_URL}/admin/judges">Review in admin →</a></p>`,
      });
    } catch { /* best effort */ }
  }

  return redirect("/judges/applied", 303);
};
