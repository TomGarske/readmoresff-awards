import type { APIRoute } from "astro";
import { getCurrentUser } from "../../../lib/auth";
import { adminSupabase } from "../../../lib/supabase";
import { countByFilename, penaltyForOver } from "../../../lib/wordcount";
import { anonymizeByFilename } from "../../../lib/anonymize";
import { putObject } from "../../../lib/r2-upload";
import { sendMail } from "../../../lib/email";
import { submissionConfirmEmail } from "../../../lib/emails/templates";
import { CHALLENGE } from "../../../lib/config";

const ALLOWED = [".doc", ".docx", ".txt", ".rtf"];
const MAX_BYTES = 2 * 1024 * 1024;  // 2 MB

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getCurrentUser(cookies);
  if (!user) return new Response("Not signed in", { status: 401 });

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const synopsis = String(form.get("synopsis") ?? "").trim();
  const file = form.get("file") as File | null;

  if (!title || !synopsis || !file) return new Response("Missing fields", { status: 400 });
  const lower = file.name.toLowerCase();
  if (!ALLOWED.some((ext) => lower.endsWith(ext))) {
    return new Response("Only .doc/.docx/.txt/.rtf are accepted", { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return new Response("File too large (>2 MB)", { status: 400 });
  }
  if (lower.endsWith(".doc")) {
    return new Response(".doc (Word 97-2003) requires conversion. Please re-save as .docx.", { status: 400 });
  }

  // Find active registration + round
  const admin = adminSupabase();
  const { data: reg } = await admin
    .from("registrations")
    .select("id, challenge_id")
    .eq("user_id", user.id)
    .not("paid_at", "is", null)
    .single();
  if (!reg) return new Response("No paid registration found", { status: 400 });

  // For v1, only Round 1 uploads are accepted. Round 2 + Final use the same flow
  // but the active-round logic should look at the current calendar / DB state.
  const { data: round } = await admin
    .from("rounds")
    .select("id, kind, start_at, end_at")
    .eq("challenge_id", reg.challenge_id)
    .eq("kind", "round_1")
    .single();
  if (!round) return new Response("Round 1 not configured", { status: 500 });

  // Read file into memory
  const buf = await file.arrayBuffer();

  // Count words (server-side, multi-format)
  const counted = await countByFilename(file.name, buf);
  const wordPenalty = penaltyForOver(
    counted.count,
    CHALLENGE.wordLimit,
    CHALLENGE.wordPenalty.overWordsForPenalty,
    CHALLENGE.wordPenalty.overWordsForDQ,
  );
  if (wordPenalty.dq) {
    return new Response(
      JSON.stringify({
        error: `Word count ${counted.count} exceeds limit by ${wordPenalty.over} words (≥${CHALLENGE.wordPenalty.overWordsForDQ}). Submission would be disqualified — please trim and re-upload.`,
        warnings: counted.warnings,
      }),
      { status: 422, headers: { "content-type": "application/json" } },
    );
  }

  // Anonymize (strip .docx metadata) — produces a clean copy
  const anonymized = await anonymizeByFilename(file.name, buf);

  // Upload BOTH originals to R2 — the writer's original (for audit) and the anonymized
  // version that judges actually see.
  const ts = Date.now();
  const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const origKey = `originals/${reg.id}/${round.id}/${ts}-${safeBase}`;
  const anonKey = `anonymized/${reg.id}/${round.id}/${ts}-${safeBase}`;

  const contentType =
    lower.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : lower.endsWith(".rtf") ? "application/rtf"
    : "text/plain";

  try {
    await Promise.all([
      putObject(origKey, buf, contentType),
      putObject(anonKey, anonymized, contentType),
    ]);
  } catch (err: any) {
    console.error("R2 upload failed", err);
    // Surface to writer but keep DB unchanged so they can retry
    return new Response(
      JSON.stringify({ error: `Storage upload failed: ${err?.message ?? err}` }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  // Upsert submission row
  const { error } = await admin.from("submissions").upsert({
    registration_id: reg.id,
    round_id: round.id,
    title,
    synopsis,
    file_r2_key: origKey,
    anonymized_r2_key: anonKey,
    word_count: counted.count,
    status: "anonymized",
    submitted_at: new Date().toISOString(),
  }, { onConflict: "registration_id,round_id" });

  if (error) {
    console.error("Submission insert failed", error);
    return new Response("Could not save submission", { status: 500 });
  }

  // Send the confirmation email — best effort; failure here doesn't fail the upload.
  try {
    const tpl = submissionConfirmEmail({
      title,
      wordCount: counted.count,
      penalty: wordPenalty,
      roundKind: "round_1",
      dashboardUrl: `${import.meta.env.SITE_URL ?? "https://readmoresff.org"}/dashboard`,
    });
    if (user.email) await sendMail({ to: user.email, subject: tpl.subject, html: tpl.html, text: tpl.text });
  } catch (err) {
    console.warn("Submission confirmation email failed", err);
  }

  return new Response(JSON.stringify({
    ok: true,
    wordCount: counted.count,
    penalty: wordPenalty,
    warnings: counted.warnings,
    originalKey: origKey,
    anonymizedKey: anonKey,
  }), {
    headers: { "content-type": "application/json" },
  });
};
