# Feature completion review

State as of the third scaffold push.

- ✅ **Built** — code exists and works locally once env vars are wired in
- 🟨 **Scaffolded** — endpoints/UI exist but need real service config OR the next implementation pass to function end-to-end
- ⬜ **Not yet built** — needed before going live, not started

---

## Marketing site

| Feature | Status |
|---|---|
| Landing page (`/`) | ✅ |
| Hero, challenge spec, 10×10×10 prompt slate, prizes, calendar | ✅ |
| Rules-at-a-glance | ✅ |
| **Public FAQ (`/faq`)** | ✅ |
| **Public judges page (`/judges`)** | ✅ |
| **Judge application form (`/judges#apply`)** | ✅ |
| Top nav links FAQ + Judges | ✅ |

## Writer auth + signup

| Feature | Status |
|---|---|
| Magic-link login / send-link / callback / cookie session / sign-out | ✅ |
| Account profile w/ pre-fill (legal name, pen name, website, additional writers, newsletter opt-in, timezone) | ✅ |
| Profile RLS | ✅ |

## Registration + payment

| Feature | Status |
|---|---|
| Register page w/ first name, last name, location, website, newsletter opt-in | ✅ |
| Stripe Checkout session w/ metadata | 🟨 *needs Stripe secret* |
| Webhook hands off to welcomeEmail | 🟨 *needs `STRIPE_WEBHOOK_SECRET`* |
| Rich welcome email (recap + receipt + add-to-calendar + timezone) | ✅ |
| Refund endpoint w/ 24h-before-R1 enforcement, force-override | ✅ |
| Refund admin UI | ✅ |
| **Refund confirmation email** | ✅ |
| Stripe Customer Portal embed | ⬜ |

## Submission flow

| Feature | Status |
|---|---|
| Submit form w/ title, synopsis, file | ✅ |
| Multi-format word counter (.txt / .docx via mammoth / .rtf) | ✅ |
| Word-limit penalty (1-50: −10%, 51+: DQ) | ✅ |
| .docx metadata anonymization | ✅ |
| R2 upload (originals + anonymized) | 🟨 *S3-path works; worker binding deferred* |
| Resubmit overwrites prior | ✅ |
| **Submission confirmation email** | ✅ |

## Group & prompt assignment

| Feature | Status |
|---|---|
| Random bucket assignment, distinct prompt draw | ✅ |
| Admin generate/dry-run/kickoff/reminder buttons | ✅ |
| **Reminder email (just-in-case backup)** | ✅ |
| Cron auto-trigger at registration close | ⬜ |

## Judging

| Feature | Status |
|---|---|
| Judge dashboard | ✅ |
| **In-browser .docx rendering (sandboxed iframe)** | ✅ |
| 4-dimension rubric scoring | ✅ |
| **Score autosave (3-sec debounced)** | ✅ |
| **Conflict-of-interest flag + auto-release** | ✅ |
| Save-draft vs submit-final | ✅ |
| Load-balanced, specialty-aware judge assignment | ✅ |
| Feedback markdown editor | ✅ |
| **`/judges` public bios page** | ✅ |
| **`/judges#apply` application form + admin notify** | ✅ |

## Score aggregation + advancement

| Feature | Status |
|---|---|
| Median-based aggregation | ✅ |
| **Honors manual score overrides** | ✅ |
| Tiebreaker (adherence → originality → time) | ✅ |
| Round 1 / Round 2 advance-list publication | ✅ |
| **Final-round overall ranking + prize-place assignment** | ✅ |
| **Prize-winner email template** | ✅ |
| **Honorable-mention email template** | ✅ |
| Admin "publish results" UI button (rounds) | 🟨 *CLI-only* |
| **Admin "publish final ranking" UI** | ✅ |
| Public `/results` page | ✅ |

## Admin

| Feature | Status |
|---|---|
| Admin gating via env | ✅ |
| Admin home w/ stat cards | ✅ |
| Submissions list (links to per-submission page) | ✅ |
| **Per-submission deep view `/admin/submissions/[id]`** | ✅ |
| Judges list | ✅ |
| Groups + prompts list w/ generation + kickoff + reminder | ✅ |
| Refunds dashboard | ✅ |
| Audit log viewer | ✅ |
| **Final ranking page (`/admin/final`)** | ✅ |
| **Manual score override (modal + endpoint + audit log)** | ✅ |
| Public results link from admin home | ✅ |

## Data model

| Feature | Status |
|---|---|
| 11 core tables + 2 enums | ✅ |
| RLS for all tables | ✅ |
| `handle_new_user()` trigger | ✅ |
| Audit log inserts on key actions | ✅ |
| **Profile extensions (website, newsletter, timezone, etc.)** | ✅ |
| **Judge extensions (display_name, photo_url, bios, public_visible)** | ✅ |
| **`judge_applications` table + RLS** | ✅ |
| **Assignment COI columns** | ✅ |
| **Submission `final_place` + `final_prize_cents`** | ✅ |
| **Score override columns (overridden_total, by, at, reason)** | ✅ |

## Email templates (Resend)

| Feature | Status |
|---|---|
| Welcome (registration confirm) | ✅ |
| Round kickoff w/ formatting rules + anti-AI banner | ✅ |
| Kickoff reminder | ✅ |
| Submission confirmation | ✅ |
| Round results (advanced / eliminated) | ✅ |
| **Prize winner** | ✅ |
| **Honorable mention** | ✅ |
| **Refund confirmation** | ✅ |
| Round-2 / Round-3 specific instruction | ⬜ |

## Calendar

| Feature | Status |
|---|---|
| Google Calendar one-click add URL helper | ✅ |
| Downloadable `.ics` endpoint per round | ✅ |
| Linked from welcome email | ✅ |

## Infrastructure / deployment

| Feature | Status |
|---|---|
| Astro 5 + Cloudflare adapter | ✅ |
| Strict TypeScript | ✅ |
| `.env.example` documented | ✅ |
| Service wrappers (Supabase, Stripe, Resend, R2) | ✅ |
| `wrangler.toml` w/ R2 bindings + secrets list | ✅ |
| `docs/DEPLOY.md` end-to-end guide | ✅ |
| Cloudflare Pages deploy | 🟨 *config ready; needs Tom to run `wrangler pages deploy`* |
| Migrations CI / Supabase deploy step | ⬜ |
| Scheduled cron triggers | ⬜ |

## Out-of-scope-for-MVP (defer to post-launch)

- Forum (Discourse or Discord, separate stack)
- Anti-AI detection beyond stated policy + manual review (Originality.ai or GPTZero is post-cycle-1)
- Anti-plagiarism (Copyscape API on top-25 per round)
- Anthology PDF generator
- ReadMoreSFF Quarterly journal CMS
- Multi-cycle / multi-challenge support
- Internationalization
- Mobile native apps

---

## What's actually wireable today

The complete end-to-end cycle now exists in code:

1. **Marketing.** `/` shows the offer. `/faq` answers common questions. `/judges` shows the panel and the apply form.
2. **Register.** Pay via Stripe (test mode). Welcome email lands with receipt + add-to-calendar + magic link.
3. **Sign in.** Magic-link returns you to the dashboard. Profile editor at `/account` (pen name, mailing address, website, timezone, newsletter opt-in).
4. **Admin: generate groups.** `/admin/groups` → dry-run → generate → "Send kickoff" → "Send reminder."
5. **Writer: receive prompt.** Anti-AI banner, big prompt table, full formatting rules, hashtag, contact pattern.
6. **Writer: upload story.** Word count + penalty enforced. .docx metadata stripped. R2 upload (originals + anonymized). Confirmation email.
7. **Admin: assign judges.** `POST /api/admin/judges/assign` (CLI for now; UI button is fast follow).
8. **Judges: read + score.** In-browser .docx rendering. Autosave every 3 sec. Conflict-of-interest flag releases the assignment. Submit-final locks scoring.
9. **Admin: publish round results.** `POST /api/admin/advance` (CLI). Updates submission statuses, sends per-writer results emails, publishes the advance list to `/results`.
10. **Admin: manual score override.** Per-submission page (`/admin/submissions/[id]`) shows every judge's scores; modal to override total + reason; audit log entry.
11. **Admin: final ranking.** `/admin/final` → dry-run → compute & assign places → send winner / HM emails.
12. **Writer: refund.** Admin clicks "Refund" on `/admin/refunds` (24h-before-R1 window enforced; force-override available). Refund confirmation email follows.

That's the complete loop. Operationally you still need to recruit judges, draft legal rules, fund the prize floor, and do the marketing — but the platform itself is complete enough for an inaugural cycle.

## Remaining engineering polish

1. **Admin button to publish round results** (the only thing left as CLI-only)
2. **Admin button to assign judges** (same; CLI works)
3. **Cron triggers** for auto-open / auto-close rounds
4. **Stripe Customer Portal embed** for self-serve refunds
5. **Multi-cycle support** (currently assumes one active challenge)
6. **Round-2 / Round-3 specific kickoff copy** (current `kickoffEmail` works for all rounds but could be more specific)
7. **Final-round prize-confirmation flow** (writer confirms mailing address before payout)
8. **W-9 collection** for US winners over $600

Estimated remaining work: **2 focused weeks**, mostly polish + operational tooling.
