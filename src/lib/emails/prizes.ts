/**
 * Prize-announcement email templates for final-round results.
 */
import { CHALLENGE } from "../config";

const BASE = `font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.55;font-size:15px;max-width:580px;`;

const ordinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
};

export function prizeWinnerEmail(opts: {
  place: number;
  prizeCents: number;
  storyTitle: string;
  dashboardUrl: string;
}) {
  const placeStr = ordinal(opts.place);
  const prizeStr = `$${(opts.prizeCents / 100).toLocaleString()}`;
  const html = `<div style="${BASE}">
    <h1 style="margin:0 0 8px;">You placed <strong>${placeStr}</strong>.</h1>
    <p style="font-size:17px;">Congratulations on placing in <strong>${CHALLENGE.name}</strong>.</p>
    <p style="font-size:24px;font-weight:800;color:#3a5e2c;">Prize: ${prizeStr}</p>
    <p>Your story <em>"${opts.storyTitle}"</em> beat ${"3,000+ entries"}.</p>
    <p>Next steps:</p>
    <ol style="line-height:1.7;">
      <li>Sign in to your dashboard and confirm your mailing address.</li>
      <li>If you're a US citizen, we'll send a W-9 for amounts over $600.</li>
      <li>Prize payment goes out within 30 days of confirmation.</li>
      <li>Your story will be featured in the annual anthology — we'll be in touch about edits.</li>
    </ol>
    <p><a href="${opts.dashboardUrl}" style="display:inline-block;background:#ffb347;color:#0e1117;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:700;">Confirm mailing address →</a></p>
    <p>Thank you for entering. Truly.</p>
  </div>`;
  const text = `You placed ${placeStr} (${prizeStr}) in ${CHALLENGE.name}. Confirm mailing address: ${opts.dashboardUrl}`;
  return { subject: `${placeStr} place — ${CHALLENGE.name}`, html, text };
}

export function honorableMentionEmail(opts: {
  rank: number;
  storyTitle: string;
  dashboardUrl: string;
}) {
  const html = `<div style="${BASE}">
    <h2>Honorable mention.</h2>
    <p>Your story <em>"${opts.storyTitle}"</em> ranked #${opts.rank} in the final round of ${CHALLENGE.name}.</p>
    <p>You didn't claim a cash place, but you came close. Your story is being considered for the annual anthology and you'll get a reply about that in the next few weeks.</p>
    <p><a href="${opts.dashboardUrl}">Open dashboard →</a></p>
    <p>Thank you for entering.</p>
  </div>`;
  return {
    subject: `Honorable mention — ${CHALLENGE.name}`,
    html,
    text: `Honorable mention — your story "${opts.storyTitle}" ranked #${opts.rank}. ${opts.dashboardUrl}`,
  };
}

export function refundConfirmEmail(opts: { amountCents: number; reason?: string }) {
  return {
    subject: `Your refund is on the way`,
    html: `<div style="${BASE}">
      <h2>Refund processed.</h2>
      <p>We've issued a refund of <strong>$${(opts.amountCents/100).toFixed(2)}</strong> back to your original payment method. It typically clears in 5-10 business days.</p>
      ${opts.reason ? `<p style="color:#666;font-size:13px;">Reason: ${opts.reason}</p>` : ""}
    </div>`,
    text: `Refund of $${(opts.amountCents/100).toFixed(2)} processed. Clears 5-10 business days.`,
  };
}
