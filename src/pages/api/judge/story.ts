/**
 * Server-side render of an anonymized story to HTML for in-browser reading.
 *
 * Flow:
 *   1. Verify caller is the assigned judge for this submission
 *   2. Fetch anonymized .docx from R2
 *   3. Convert to HTML with mammoth (style-stripped)
 *   4. Return inside a minimal HTML envelope
 *
 * .txt and .rtf submissions are returned as preformatted text.
 * Sanitization: mammoth only emits semantic tags. We further wrap output
 * in a sandboxed iframe at the consuming page (defense in depth).
 */
import type { APIRoute } from "astro";
import { getCurrentUser } from "../../../lib/auth";
import { adminSupabase } from "../../../lib/supabase";
import * as mammoth from "mammoth";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2Config, r2Endpoint } from "../../../lib/r2";

const ENVELOPE = (body: string) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font: 16px/1.7 Georgia, 'Times New Roman', serif; color: #1a1a1a; max-width: 720px; margin: 28px auto; padding: 0 20px; }
  h1 { font-size: 22px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
  h2, h3 { font-size: 18px; }
  p { margin: 0 0 14px; }
  blockquote { border-left: 3px solid #ddd; padding-left: 14px; color: #555; }
  pre { white-space: pre-wrap; font: 14px/1.6 ui-monospace, monospace; }
  em { font-style: italic; }
  strong { font-weight: 700; }
</style></head>
<body>${body}</body></html>`;

async function fetchR2(key: string): Promise<{ buf: Uint8Array; contentType: string }> {
  const cfg = getR2Config();
  const client = new S3Client({
    region: "auto",
    endpoint: r2Endpoint(cfg),
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  const r = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
  const chunks: Uint8Array[] = [];
  const stream = r.Body as any;
  for await (const c of stream) chunks.push(c);
  const total = chunks.reduce((s, c) => s + c.byteLength, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.byteLength; }
  return { buf: out, contentType: r.ContentType ?? "application/octet-stream" };
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const user = await getCurrentUser(cookies);
  if (!user) return new Response("Not signed in", { status: 401 });

  const submissionId = url.searchParams.get("submission");
  if (!submissionId) return new Response("Missing ?submission", { status: 400 });

  const sb = adminSupabase();

  // Caller must be the assigned judge OR an admin
  const { data: judgeRow } = await sb.from("judges").select("id").eq("user_id", user.id).maybeSingle();
  const { data: profile } = await sb.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();

  let authorized = (profile as any)?.is_admin === true;
  if (!authorized && judgeRow) {
    const { count } = await sb
      .from("assignments")
      .select("id", { head: true, count: "exact" })
      .eq("submission_id", submissionId)
      .eq("judge_id", judgeRow.id);
    authorized = (count ?? 0) > 0;
  }
  if (!authorized) return new Response("Forbidden", { status: 403 });

  const { data: sub } = await sb
    .from("submissions")
    .select("anonymized_r2_key, title, word_count")
    .eq("id", submissionId)
    .single();
  if (!sub || !sub.anonymized_r2_key) return new Response("Story not available yet", { status: 404 });

  let body = "";
  try {
    const { buf } = await fetchR2(sub.anonymized_r2_key);
    const lower = sub.anonymized_r2_key.toLowerCase();
    if (lower.endsWith(".docx")) {
      const { value } = await (mammoth as any).convertToHtml({ arrayBuffer: buf.buffer });
      body = `<h1>${escapeHtml(sub.title ?? "Untitled")}</h1>${value}`;
    } else if (lower.endsWith(".txt")) {
      const text = new TextDecoder().decode(buf);
      body = `<h1>${escapeHtml(sub.title ?? "Untitled")}</h1><pre>${escapeHtml(text)}</pre>`;
    } else if (lower.endsWith(".rtf")) {
      const text = new TextDecoder().decode(buf)
        .replace(/\\(?:[a-zA-Z]+(?:-?\d+)?\s?|[^a-zA-Z0-9])|[{}]/g, " ")
        .replace(/\s+/g, " ");
      body = `<h1>${escapeHtml(sub.title ?? "Untitled")}</h1><pre>${escapeHtml(text.trim())}</pre>`;
    } else {
      return new Response("Unsupported file type", { status: 415 });
    }
  } catch (err: any) {
    console.error("Render failed", err);
    return new Response(`Render failed: ${err?.message ?? err}`, { status: 500 });
  }

  return new Response(ENVELOPE(body), { headers: { "content-type": "text/html; charset=utf-8" } });
};

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
