/**
 * Email templates. Plain HTML, no framework — they need to render in every
 * mail client. Each template returns { subject, html, text }.
 *
 * Patterns modeled on the NYC Midnight email cadence:
 *   - welcome (registration confirmation, with details recap + add-to-calendar)
 *   - kickoff (round opens — full prompt + formatting rules + anti-AI line)
 *   - kickoffReminder (sent 6-12h after kickoff for inboxes that filtered it)
 *   - submissionConfirmation (sent immediately after upload)
 *   - results (advanced / eliminated, with feedback link)
 *   - receipt (custom-branded receipt — Stripe sends one too)
 */
import { lookupGenre, lookupTheme, lookupObject } from "../prompts";
import { CHALLENGE } from "../config";
import { googleCalendarUrl, type CalEvent } from "../calendar";

const BASE_STYLE = `font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;font-size:15px;max-width:580px;`;
const BUTTON = `display:inline-block;background:#ffb347;color:#0e1117;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:700;`;
const SOFT = `color:#666;font-size:13px;`;

const HASHTAG = "#ReadMoreSFF1500";
const SITE = () => import.meta.env.SITE_URL ?? "https://readmoresff.org";

// ---------- WELCOME (registration confirmation) ----------

export type WelcomeInput = {
  email: string;
  magicLink: string;
  firstName?: string;
  lastName?: string;
  location?: string;       // "Denver, CO, United States"
  personalWebsite?: string;
  additionalWriters?: string[];
  newsletterOptIn: boolean;
  amountPaidCents: number;
  promoApplied: boolean;
  stripeSessionId?: string;
  round1Start: Date;
  round1End: Date;
};

export function welcomeEmail(i: WelcomeInput) {
  const r1Cal = googleCalendarUrl({
    uid: "rmsf-1500-2026-r1-welcome",
    title: "ReadMoreSFF 1500 — Round 1 opens",
    description: "Your prompt drops at the start of this window. 48 hours to write a 1,500-word story. Sign in at " + SITE() + "/dashboard.",
    startUtc: i.round1Start,
    endUtc: i.round1End,
    url: SITE() + "/dashboard",
  });
  const startNy = i.round1Start.toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });

  const registrationTable = `
    <table style="margin:10px 0 18px;border-collapse:collapse;font-size:14px;">
      <tbody>
        ${tableRow("First name", i.firstName ?? "—")}
        ${tableRow("Last name", i.lastName ?? "—")}
        ${tableRow("Email", i.email)}
        ${tableRow("Location", i.location ?? "—")}
        ${tableRow("Personal website", i.personalWebsite ?? "—")}
        ${tableRow("Additional writers", (i.additionalWriters ?? []).join(", ") || "—")}
        ${tableRow("Newsletter", i.newsletterOptIn ? "Subscribed" : "Declined")}
      </tbody>
    </table>`;

  const receipt = `
    <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;">
    <h3>Receipt</h3>
    <table style="border-collapse:collapse;font-size:14px;">
      ${tableRow("Transaction", i.stripeSessionId ?? "—")}
      ${tableRow("Date", new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", year: "numeric", month: "long", day: "numeric" }))}
      ${tableRow("Method", "Stripe Checkout")}
      ${tableRow("Description", CHALLENGE.name + " — entry (all 3 rounds)")}
      ${tableRow(i.promoApplied ? "Promo applied" : "List price", `$${(i.amountPaidCents/100).toFixed(2)}`)}
      ${tableRow("Total", `$${(i.amountPaidCents/100).toFixed(2)}`)}
    </table>`;

  const html = `<div style="${BASE_STYLE}">
    <h2>You're registered for ${CHALLENGE.name}.</h2>
    <p>Round 1 begins <strong>${startNy}</strong>. Please read this email all the way through — there are details that will save you grief later.</p>

    <h3>Your registration</h3>
    <p style="${SOFT}">If anything below is wrong, just reply to this email and we'll update it.</p>
    ${registrationTable}

    <h3>Sign in to your dashboard</h3>
    <p>Use the magic link below to finish setting up your account (pen name for credit, mailing address for prize delivery). No password — just click.</p>
    <p><a href="${i.magicLink}" style="${BUTTON}">Sign in to my dashboard →</a></p>

    <h3>Mark your calendar</h3>
    <p>
      <a href="${r1Cal}">Add Round 1 to Google Calendar</a> ·
      <a href="${SITE()}/calendar/round-1.ics">Download .ics (Outlook / Apple)</a>
    </p>
    <p style="${SOFT}">Round 1 begins at the time shown above (Eastern). If you're in Los Angeles, that's <strong>${i.round1Start.toLocaleString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month:"short", day:"numeric", hour:"numeric", minute:"2-digit", timeZoneName:"short" })}</strong>. If you're in London, <strong>${i.round1Start.toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", month:"short", day:"numeric", hour:"numeric", minute:"2-digit", timeZoneName:"short" })}</strong>.</p>

    <h3>Add this email to your contacts</h3>
    <p>All competition emails come from <strong>awards@readmoresff.org</strong>. Add us to your address book so the round kickoff doesn't filter into spam. If this email is already in your spam folder, click "Not spam" or "Add sender to allow-list."</p>

    <h3>Official competition site &amp; forum</h3>
    <p>Rules, FAQ, past prompts: <a href="${SITE()}">${SITE().replace(/^https?:\/\//, "")}</a></p>
    <p>Writer forum: <a href="${SITE()}/forum">${SITE().replace(/^https?:\/\//, "")}/forum</a></p>

    ${receipt}

    <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;">
    <p style="${SOFT}">— The ReadMoreSFF Awards team<br>
      Replies to this address reach a human. Don't reply for support tickets; use <a href="${SITE()}/contact">${SITE().replace(/^https?:\/\//, "")}/contact</a>.</p>
  </div>`;

  const text =
`You're registered for ${CHALLENGE.name}. Round 1 begins ${startNy}.
Sign in: ${i.magicLink}
Add Round 1 to calendar: ${r1Cal}
Add awards@readmoresff.org to your contacts so the round kickoff doesn't filter to spam.
Receipt: $${(i.amountPaidCents/100).toFixed(2)} · ${i.stripeSessionId ?? ""}`;

  return { subject: `You're registered for ${CHALLENGE.name}`, html, text };
}

// ---------- KICKOFF (round opens) ----------

export type KickoffInput = {
  groupNumber: number;
  roundKind: string;
  promptGenre: string;
  promptTheme: string;
  promptObject: string;
  deadlineUtc: Date;
  dashboardUrl: string;
  uploadUrl: string;
  rulesUrl: string;
  faqUrl: string;
};

export function kickoffEmail(i: KickoffInput) {
  const g = lookupGenre(i.promptGenre);
  const t = lookupTheme(i.promptTheme);
  const o = lookupObject(i.promptObject);
  const deadlineNy = i.deadlineUtc.toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });

  const html = `<div style="${BASE_STYLE}">
    <p style="background:#fff3d6;border:1px solid #ffb347;padding:8px 12px;border-radius:6px;font-size:13px;color:#7a4d00;">
      Please do <strong>NOT</strong> use AI to summarize this email. AI tools sometimes return wrong genre/theme/object combinations. Read it yourself.
    </p>

    <h2>Round ${i.roundKind === "round_1" ? "1" : i.roundKind === "round_2" ? "2" : "Final"} is live — Group ${i.groupNumber}.</h2>
    <p>You have 48 hours to write a 1,500-word story based on the prompt below. Deadline:</p>
    <p style="font-size:17px;font-weight:700;background:#f7f7f9;padding:8px 12px;border-radius:6px;">${deadlineNy}</p>

    <h3>Your assignment</h3>
    <table style="border-collapse:collapse;margin:12px 0;">
      <tr><td style="padding:8px 14px;color:#666;">Genre</td><td style="padding:8px 14px;font-weight:700;font-size:17px;">${g?.name ?? i.promptGenre}</td></tr>
      <tr><td style="padding:8px 14px;color:#666;">Theme</td><td style="padding:8px 14px;font-weight:700;font-size:17px;">${t?.name ?? i.promptTheme}</td></tr>
      <tr><td style="padding:8px 14px;color:#666;">Object</td><td style="padding:8px 14px;font-weight:700;font-size:17px;">${o?.name ?? i.promptObject}</td></tr>
    </table>

    <p><a href="${i.uploadUrl}" style="${BUTTON}">Upload my story →</a></p>

    <h3>Prompt rules — read these before you start</h3>
    <ul style="line-height:1.7;">
      <li><strong>Genre.</strong> Your story must unmistakably fit the assigned genre. Elements of other genres are fine; the dominant tone must be the assigned one. A story that reads as comedy when assigned horror will likely be disqualified.</li>
      <li><strong>Theme.</strong> The story must hinge on the assigned theme — not just reference it. It should be impossible to retell the story without the theme.</li>
      <li><strong>Object.</strong> The object must <em>physically appear</em> in the story (not just be mentioned in dialogue, a sign, or a brand name). A character touching, holding, wearing, or interacting with the object satisfies the rule.</li>
    </ul>

    <h3>Formatting</h3>
    <ul style="line-height:1.7;">
      <li><strong>Length:</strong> 1,500 words max. Title page (title + 1-2-sentence synopsis) is excluded from the count. We count using both Word and Google Docs and take the lower of the two.</li>
      <li><strong>Penalties:</strong> 1–50 words over: −10% score. 51+ over: disqualification.</li>
      <li><strong>File type:</strong> .doc, .docx, .txt, or .rtf only.</li>
      <li><strong>File name:</strong> must match the title of your story.</li>
      <li><strong>Font:</strong> 12pt Courier, New Courier, or Times New Roman only.</li>
      <li><strong>Title page:</strong> story title + 1–2-sentence synopsis only. Nothing else.</li>
      <li><strong>Anonymity:</strong> your name appears nowhere in the file, including document properties. Our system strips metadata on upload but please verify yours.</li>
      <li><strong>Spacing/margins:</strong> your choice, but anything more than double-spaced is hard on judges.</li>
      <li><strong>Word-cheats DQ:</strong> stories that excessively merge words via hyphens, em-dashes, or missing spaces to bypass the count may be disqualified.</li>
    </ul>

    <h3>Resubmitting</h3>
    <p>You may upload as many times as you like before the deadline. We take the latest upload.</p>

    <h3>Share your progress</h3>
    <p>Posting about it? Use <strong>${HASHTAG}</strong>.</p>

    <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;">

    <h3>Quick links</h3>
    <ul style="line-height:1.8;list-style:none;padding:0;">
      <li><a href="${i.dashboardUrl}">My dashboard</a></li>
      <li><a href="${i.uploadUrl}">Upload story</a></li>
      <li><a href="${i.rulesUrl}">Official rules</a></li>
      <li><a href="${i.faqUrl}">FAQ</a></li>
    </ul>

    <p style="${SOFT}">Questions? Use the contact form at ${SITE()}/contact rather than replying — it routes faster.</p>
    <p style="${SOFT}">— The ReadMoreSFF Awards team</p>
  </div>`;

  const text =
`Round ${i.roundKind} is live — Group ${i.groupNumber}.
Genre: ${g?.name}
Theme: ${t?.name}
Object: ${o?.name}
Deadline: ${deadlineNy}
Upload: ${i.uploadUrl}
Rules: ${i.rulesUrl}`;

  return { subject: `Round ${i.roundKind.replace("round_", "")} prompt — Group ${i.groupNumber}`, html, text };
}

// ---------- KICKOFF REMINDER (just-in-case duplicate) ----------

export function kickoffReminderEmail(i: KickoffInput) {
  const g = lookupGenre(i.promptGenre);
  const t = lookupTheme(i.promptTheme);
  const o = lookupObject(i.promptObject);

  const html = `<div style="${BASE_STYLE}">
    <h2>Just in case — your Round ${i.roundKind.replace("round_", "")} prompt</h2>
    <p>This is a backup of the kickoff email in case the first one filtered to spam or got missed. Same content. Don't worry about uploading twice — you can resubmit anytime before the deadline; we take the latest.</p>
    <table style="border-collapse:collapse;margin:12px 0;">
      <tr><td style="padding:6px 12px;color:#666;">Group</td><td style="padding:6px 12px;font-weight:700;">${i.groupNumber}</td></tr>
      <tr><td style="padding:6px 12px;color:#666;">Genre</td><td style="padding:6px 12px;font-weight:700;">${g?.name ?? i.promptGenre}</td></tr>
      <tr><td style="padding:6px 12px;color:#666;">Theme</td><td style="padding:6px 12px;font-weight:700;">${t?.name ?? i.promptTheme}</td></tr>
      <tr><td style="padding:6px 12px;color:#666;">Object</td><td style="padding:6px 12px;font-weight:700;">${o?.name ?? i.promptObject}</td></tr>
    </table>
    <p><a href="${i.uploadUrl}" style="${BUTTON}">Upload my story →</a></p>
    <p style="${SOFT}">Dashboard: <a href="${i.dashboardUrl}">${i.dashboardUrl.replace(/^https?:\/\//, "")}</a> · Rules: <a href="${i.rulesUrl}">${i.rulesUrl.replace(/^https?:\/\//, "")}</a> · FAQ: <a href="${i.faqUrl}">${i.faqUrl.replace(/^https?:\/\//, "")}</a></p>
    <p style="${SOFT}">— The ReadMoreSFF Awards team</p>
  </div>`;

  const text = `Backup of your kickoff: Group ${i.groupNumber}. ${g?.name} · ${t?.name} · ${o?.name}. Upload: ${i.uploadUrl}`;
  return { subject: `Reminder — your Round ${i.roundKind.replace("round_", "")} prompt (Group ${i.groupNumber})`, html, text };
}

// ---------- SUBMISSION CONFIRMATION ----------

export type SubmissionConfirmInput = {
  title: string;
  wordCount: number;
  penalty: { over: number; penaltyPct: number; dq: boolean };
  roundKind: string;
  dashboardUrl: string;
};

export function submissionConfirmEmail(i: SubmissionConfirmInput) {
  const penaltyMsg = i.penalty.over === 0
    ? "Your story is within the 1,500-word limit."
    : i.penalty.dq
    ? `<strong style="color:#9b3447;">⚠️ Your story is ${i.penalty.over} words over the limit and would be disqualified. Please trim and re-upload before the deadline.</strong>`
    : `Your story is ${i.penalty.over} words over the limit — a −${i.penalty.penaltyPct}% score penalty applies. You may trim and re-upload.`;

  const html = `<div style="${BASE_STYLE}">
    <h2>We received your story.</h2>
    <p>Thank you for submitting <strong>${escapeHtml(i.title)}</strong> for Round ${i.roundKind.replace("round_", "")} of ${CHALLENGE.name}.</p>
    <table style="border-collapse:collapse;margin:12px 0;">
      <tr><td style="padding:6px 12px;color:#666;">Word count</td><td style="padding:6px 12px;font-weight:700;">${i.wordCount.toLocaleString()}</td></tr>
      <tr><td style="padding:6px 12px;color:#666;">Status</td><td style="padding:6px 12px;font-weight:700;">${i.penalty.dq ? "Needs revision" : "Accepted"}</td></tr>
    </table>
    <p>${penaltyMsg}</p>
    <p style="${SOFT}">You can resubmit as many times as you like before the deadline. We take the latest upload for judging and archive the rest.</p>
    <p><a href="${i.dashboardUrl}" style="${BUTTON}">View my dashboard →</a></p>
    <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;">
    <p style="${SOFT}">Official confirmation emails (with judging details and forum-sharing info) go out within 72 hours of the round deadline.</p>
    <p style="${SOFT}">— The ReadMoreSFF Awards team</p>
  </div>`;

  const text = `Received: "${i.title}" · ${i.wordCount} words. ${penaltyMsg.replace(/<[^>]+>/g, "")}`;
  return { subject: `Submission received — ${i.title}`, html, text };
}

// ---------- RESULTS ----------

export function resultsEmail(opts: {
  advanced: boolean;
  rank?: number;
  groupSize: number;
  roundKind: string;
  feedbackUrl?: string;
}) {
  if (opts.advanced) {
    return {
      subject: `You advanced — Round ${opts.roundKind.replace("round_", "")}`,
      html: `<div style="${BASE_STYLE}">
        <h2>You're through to the next round.</h2>
        <p>Your story ranked <strong>#${opts.rank ?? "—"}</strong> in your group of ${opts.groupSize}. Top 10 advance.</p>
        ${opts.feedbackUrl ? `<p><a href="${opts.feedbackUrl}" style="${BUTTON}">Read judge feedback →</a></p>` : ""}
        <p>Next round prompt drops in a few weeks — watch this address.</p>
      </div>`,
      text: `You advanced (rank ${opts.rank ?? "?"}/${opts.groupSize}). Feedback: ${opts.feedbackUrl ?? "—"}`,
    };
  }
  return {
    subject: `Round results — thanks for entering`,
    html: `<div style="${BASE_STYLE}">
      <h2>Round results are in.</h2>
      <p>Your story didn't advance this round (rank ${opts.rank ?? "—"} of ${opts.groupSize}). The field was strong.</p>
      ${opts.feedbackUrl ? `<p><a href="${opts.feedbackUrl}" style="${BUTTON}">Read judge feedback →</a></p>` : ""}
      <p style="${SOFT}">Watch your inbox for the next ReadMoreSFF challenge.</p>
    </div>`,
    text: `Didn't advance this round (rank ${opts.rank}/${opts.groupSize}). Feedback: ${opts.feedbackUrl ?? "—"}`,
  };
}

// ---------- helpers ----------

function tableRow(label: string, value: string) {
  return `<tr><td style="padding:4px 14px 4px 0;color:#666;">${escapeHtml(label)}</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(value)}</td></tr>`;
}
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
