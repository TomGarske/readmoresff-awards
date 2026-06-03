/**
 * Email templates. Plain HTML, no framework — they need to render in every
 * mail client. Each template returns { subject, html, text }.
 */
import { lookupGenre, lookupTheme, lookupObject } from "../prompts";

const BASE_STYLE = `font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;font-size:15px;`;

export function welcomeEmail(opts: { magicLink: string }) {
  return {
    subject: "Welcome to The ReadMoreSFF 1500",
    html: `<div style="${BASE_STYLE}">
      <h2>You're in.</h2>
      <p>Thanks for registering for <strong>The ReadMoreSFF 1500</strong>.</p>
      <p>Click below to sign in and set up your account (pen name, mailing address for prize delivery):</p>
      <p><a href="${opts.magicLink}" style="display:inline-block;background:#ffb347;color:#0e1117;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:700;">Sign in to my dashboard →</a></p>
      <p>We'll email you when registration closes with your group assignment and Round 1 prompt.</p>
      <p style="color:#666;font-size:13px;">— The ReadMoreSFF Awards team</p>
    </div>`,
    text: `You're in. Sign in: ${opts.magicLink}`,
  };
}

export function kickoffEmail(opts: {
  groupNumber: number;
  roundKind: string;
  promptGenre: string;
  promptTheme: string;
  promptObject: string;
  deadlineLocal: string;
  dashboardUrl: string;
}) {
  const g = lookupGenre(opts.promptGenre);
  const t = lookupTheme(opts.promptTheme);
  const o = lookupObject(opts.promptObject);
  return {
    subject: `Your ${opts.roundKind.replace("_", " ")} prompt — Group ${opts.groupNumber}`,
    html: `<div style="${BASE_STYLE}">
      <h2>Your prompt is live.</h2>
      <p>You're in <strong>Group ${opts.groupNumber}</strong>. Your assignment:</p>
      <table style="border-collapse:collapse;margin:14px 0;">
        <tr><td style="padding:6px 12px;color:#666;">Genre</td><td style="padding:6px 12px;"><strong>${g?.name ?? opts.promptGenre}</strong></td></tr>
        <tr><td style="padding:6px 12px;color:#666;">Theme</td><td style="padding:6px 12px;"><strong>${t?.name ?? opts.promptTheme}</strong></td></tr>
        <tr><td style="padding:6px 12px;color:#666;">Object</td><td style="padding:6px 12px;"><strong>${o?.name ?? opts.promptObject}</strong></td></tr>
      </table>
      <p>1,500 words max. Story must be in the assigned genre, hinge on the assigned theme, and feature the object physically (not just by reference).</p>
      <p><strong>Deadline:</strong> ${opts.deadlineLocal}</p>
      <p><a href="${opts.dashboardUrl}" style="display:inline-block;background:#ffb347;color:#0e1117;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:700;">Open my dashboard →</a></p>
    </div>`,
    text: `Your prompt: ${g?.name} · ${t?.name} · ${o?.name}. Deadline: ${opts.deadlineLocal}. ${opts.dashboardUrl}`,
  };
}

export function resultsEmail(opts: {
  advanced: boolean;
  rank?: number;
  groupSize: number;
  roundKind: string;
  feedbackUrl?: string;
}) {
  return opts.advanced ? {
    subject: `You advanced — ${opts.roundKind.replace("_", " ")}`,
    html: `<div style="${BASE_STYLE}">
      <h2>You're through to the next round.</h2>
      <p>Your story ranked <strong>#${opts.rank ?? "—"}</strong> in your group of ${opts.groupSize}. Top 10 advance.</p>
      ${opts.feedbackUrl ? `<p><a href="${opts.feedbackUrl}">Read judge feedback →</a></p>` : ""}
    </div>`,
    text: `You advanced (rank ${opts.rank}/${opts.groupSize}).`,
  } : {
    subject: `Round results — thanks for entering`,
    html: `<div style="${BASE_STYLE}">
      <h2>Round results are in.</h2>
      <p>Your story didn't advance this round (rank ${opts.rank ?? "—"} of ${opts.groupSize}). The field was strong.</p>
      ${opts.feedbackUrl ? `<p><a href="${opts.feedbackUrl}">Read judge feedback →</a></p>` : ""}
      <p>Watch your inbox for the next ReadMoreSFF challenge.</p>
    </div>`,
    text: `Didn't advance this round. Feedback: ${opts.feedbackUrl ?? "none"}`,
  };
}
