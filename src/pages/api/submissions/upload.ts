import type { APIRoute } from "astro";
import { getCurrentUser } from "../../../lib/auth";
import { serverSupabase, adminSupabase } from "../../../lib/supabase";
import { getAccessTokenFromCookies } from "../../../lib/auth";

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

  // TODO (week 3-4): upload to R2 + run anonymization + word count.
  // For the scaffold, we record the metadata and stash the file key as `pending`.
  const token = getAccessTokenFromCookies(cookies)!;
  const supabase = serverSupabase(token);
  const admin = adminSupabase();

  // Find the writer's current registration + round
  const { data: reg } = await admin
    .from("registrations")
    .select("id, challenge_id")
    .eq("user_id", user.id)
    .single();
  if (!reg) return new Response("No active registration", { status: 400 });

  const { data: round } = await admin
    .from("rounds")
    .select("id")
    .eq("challenge_id", reg.challenge_id)
    .eq("kind", "round_1")
    .single();
  if (!round) return new Response("Round 1 not configured", { status: 500 });

  // Stub R2 key — wire to real R2 once bindings are configured
  const r2Key = `pending/${reg.id}/${round.id}/${Date.now()}-${file.name}`;

  const { error } = await admin.from("submissions").upsert({
    registration_id: reg.id,
    round_id: round.id,
    title,
    synopsis,
    file_r2_key: r2Key,
    status: "submitted",
    submitted_at: new Date().toISOString(),
  }, { onConflict: "registration_id,round_id" });

  if (error) {
    console.error("Submission insert failed", error);
    return new Response("Could not save submission", { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, key: r2Key }), {
    headers: { "content-type": "application/json" },
  });
};
