# Feature completion review

State as of the second scaffold push. Categories:

- ✅ **Built** — code exists and works locally once env vars are wired in
- 🟨 **Scaffolded** — endpoints/UI exist but need real service config OR the next implementation pass to function end-to-end
- ⬜ **Not yet built** — needed before going live, not started

---

## Marketing site (`/`)

| Feature | Status |
|---|---|
| Hero with brand, tagline, CTAs, stats | ✅ |
| Challenge spec card (entry fee, word limit, format) | ✅ |
| Prompt slate display (10 × 10 × 10) | ✅ |
| 3-round funnel cards with dates | ✅ |
| Prize ladder table | ✅ |
| Inaugural calendar table | ✅ |
| Rules-at-a-glance (6 cards) | ✅ |
| Footer with GitHub + readmoresff.org link | ✅ |
| FAQ section | ⬜ |
| Judge bios section (once recruited) | ⬜ |
| Past winners section | ⬜ *(post-cycle 1)* |

## Writer auth + signup

| Feature | Status |
|---|---|
| Magic-link login page (`/login`) | ✅ |
| Send-link endpoint (`/api/auth/send-link`) | 🟨 *needs Supabase + Resend keys* |
| Magic-link landing (`/auth/callback`) | ✅ |
| Set-session cookie endpoint | ✅ |
| Sign-out endpoint | ✅ |
| Magic-link emails delivered | 🟨 *handled by Supabase Auth* |
| Account profile page | ✅ |
| Save-profile endpoint | ✅ |
| Profile RLS (writer reads + writes own row only) | ✅ |

## Registration + payment

| Feature | Status |
|---|---|
| Register page | ✅ |
| Promo code input + applied flag | ✅ |
| Stripe Checkout session creation | 🟨 *needs Stripe secret + price config* |
| Success page | ✅ |
| Stripe webhook handler | 🟨 *needs `STRIPE_WEBHOOK_SECRET`* |
| Auto-create profile + registration on payment | ✅ |
| Send welcome email with magic link | ✅ |
| Refund endpoint with 24h-before-R1 enforcement | ✅ |
| Refund admin UI | ✅ |
| Stripe Customer Portal embed | ⬜ |

## Submission flow

| Feature | Status |
|---|---|
| Writer dashboard | ✅ |
| Submit-story page | ✅ |
| Upload endpoint with file validation | ✅ |
| File type validation (.doc/.docx/.txt/.rtf) | ✅ |
| File size cap (2 MB) | ✅ |
| **Word counter (multi-format: .txt / .docx / .rtf)** | ✅ |
| **Word-limit penalty + DQ enforcement** | ✅ |
| **`.docx` metadata anonymization (core.xml, app.xml, comments, headers)** | ✅ |
| **R2 upload (original + anonymized copies)** | 🟨 *S3-compatible path works; Worker binding deferred* |
| Resubmit-overwrites-prior support | ✅ |
| Confirmation email on upload | ⬜ |

## Group & prompt assignment

| Feature | Status |
|---|---|
| Schema | ✅ |
| **Random group assignment algorithm** | ✅ |
| **Group-size planner (target 40, min 20)** | ✅ |
| **Distinct prompt draw (1000 combinations)** | ✅ |
| **Admin endpoint `/api/admin/groups/generate` + dry-run** | ✅ |
| **Admin UI button to trigger generation** | ✅ |
| **Kickoff email endpoint + UI button** | ✅ |
| Cron-based auto-trigger at registration close | ⬜ |

## Judging

| Feature | Status |
|---|---|
| Schema | ✅ |
| Judge login (magic-link, same as writer) | ✅ |
| **Judge dashboard listing assignments** | ✅ |
| **Score page with 4-dimension rubric (25 pts each)** | ✅ |
| **Score save endpoint with draft + final modes** | ✅ |
| **Anonymized story download (signed R2 URL)** | ✅ |
| **Judge assignment algorithm (load-balanced, specialty-aware)** | ✅ |
| Feedback Markdown editor with autosave | 🟨 *manual save only* |
| Browser-native rendering of `.docx` (no download) | ⬜ |
| Conflict-of-interest flagging | ⬜ |

## Score aggregation + advancement

| Feature | Status |
|---|---|
| **Median-based score aggregation** | ✅ |
| **Tiebreaker logic (adherence → originality → time)** | ✅ |
| **`/api/admin/advance` endpoint with dry-run** | ✅ |
| **Auto-mark submissions advanced / eliminated** | ✅ |
| **Results email templates (advanced + eliminated)** | ✅ |
| **Public `/results` page showing advance lists** | ✅ |
| Admin "publish results" UI button | ⬜ *(CLI-only for now)* |
| Final-round overall ranking + prize-place assignment | ⬜ |

## Admin

| Feature | Status |
|---|---|
| Admin gating via `ADMIN_EMAILS` env var | ✅ |
| `tdgarske@gmail.com` set as admin on signup | ✅ |
| Admin home with stat cards | ✅ |
| Submissions list | ✅ |
| Judges list | ✅ |
| Groups + prompts list with generation controls | ✅ |
| **Refunds dashboard with one-click refund** | ✅ |
| **Audit log viewer** | ✅ |
| Public results link from admin home | ✅ |
| Manual score override UI | ⬜ |

## Data model + RLS

| Feature | Status |
|---|---|
| Schema: 11 tables + 2 enums | ✅ |
| RLS policies for all tables | ✅ |
| Seed: inaugural challenge + 3 rounds + admin flag | ✅ |
| `handle_new_user()` trigger | ✅ |
| **Audit log inserts on key actions** | ✅ |

## Email templates (Resend)

| Feature | Status |
|---|---|
| Welcome email (after payment) | ✅ |
| **Round kickoff email (with prompt)** | ✅ |
| **Results email (advanced / eliminated)** | ✅ |
| Round-2 / Round-3 instructions | ⬜ |
| Refund confirmation | ⬜ |
| Final prize confirmation | ⬜ |

## Infrastructure / deployment

| Feature | Status |
|---|---|
| Astro 5 + Cloudflare adapter | ✅ |
| TypeScript + strict config | ✅ |
| Env example documented | ✅ |
| Supabase client wrappers | ✅ |
| Stripe client wrapper | ✅ |
| Resend client wrapper | ✅ |
| R2 helpers (S3-compatible path) | ✅ |
| **R2 upload helper (PutObject, signed GETs)** | ✅ |
| **`wrangler.toml` with R2 bindings declared** | ✅ |
| **`docs/DEPLOY.md` end-to-end setup guide** | ✅ |
| GitHub Pages deploy *(N/A — needs server runtime)* | ⬜ |
| Cloudflare Pages deploy + custom domain | 🟨 *config ready; needs Tom to run `wrangler pages deploy`* |
| Migrations CI / Supabase deploy step | ⬜ |
| Scheduled cron triggers | ⬜ |

## Out-of-scope-for-MVP (defer to post-launch)

- Forum (Discourse or Discord, separate)
- Anti-AI detection beyond stated policy + manual review
- Anti-plagiarism (Copyscape API on top-25 per round)
- Anthology generation
- ReadMoreSFF Quarterly journal CMS
- Multi-cycle / multi-challenge support
- Internationalization
- Mobile native apps

---

## What's actually wireable today

Every code path needed for a writer to complete the round 1 happy path now exists:

1. Visit `/`, see the offer
2. Click Register, pay via Stripe (test mode)
3. Receive welcome email with magic link
4. Sign in to `/dashboard`, fill out profile at `/account`
5. (Admin generates groups + sends kickoff)
6. Receive kickoff email with prompt
7. Upload story at `/dashboard/submit` — word count, anonymization, R2 storage happen automatically
8. (Admin assigns judges, judges score at `/judge/score/[id]`)
9. (Admin publishes advance list, results emails go out)
10. See results at `/results`

Estimated time to wire everything once you've got the cloud accounts open:
**~1 day** of focused config work. Then ~1 day for an internal test cycle
with you + 2 fake writers + you-as-judge to shake out anything I missed.

## Real remaining work for a public cycle

- Cron triggers (auto-open / auto-close rounds, auto-send kickoffs)
- Word counter validation against the contest rule ("lower of Word and Google Docs counts")
- Judge UI: in-browser .docx rendering, autosave
- Final-round prize-place assignment
- Stripe Customer Portal embed (so writers can self-serve refunds in the window)
- FAQ + judge bios on the marketing page
- Cloudflare Pages deploy from the dashboard

Estimated: **2-3 focused weeks** to a public-launchable state.
