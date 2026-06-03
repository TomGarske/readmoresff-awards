# Feature completion review

State as of the initial scaffold commit. Categories:

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
| Set-session cookie endpoint (`/api/auth/set-session`) | ✅ |
| Sign-out endpoint | ✅ |
| Magic-link emails delivered | 🟨 *handled by Supabase Auth, requires SMTP/Resend config* |
| Account profile page (`/account`) | ✅ |
| Save-profile endpoint (`/api/account/save`) | ✅ |
| Profile RLS (writer reads + writes own row only) | ✅ |

## Registration + payment

| Feature | Status |
|---|---|
| Register page (`/register`) | ✅ |
| Promo code input + applied flag | ✅ |
| Stripe Checkout session creation | 🟨 *needs Stripe secret + price config* |
| Success page (`/register/success`) | ✅ |
| Stripe webhook handler | 🟨 *needs `STRIPE_WEBHOOK_SECRET`* |
| Auto-create profile + registration on payment | ✅ |
| Send welcome email with magic link | ✅ *(routes through Resend)* |
| Refund flow / refund UI | ⬜ |
| Refund window enforcement (24h before R1) | ⬜ |
| Stripe Customer Portal embed | ⬜ |

## Submission flow

| Feature | Status |
|---|---|
| Writer dashboard (`/dashboard`) | ✅ |
| Submit-story page (`/dashboard/submit`) | ✅ |
| Upload endpoint (`/api/submissions/upload`) | 🟨 *records metadata; R2 upload itself is TODO* |
| File type validation (.doc/.docx/.txt/.rtf) | ✅ |
| File size cap (2 MB) | ✅ |
| Word counter (server-side, .docx/.txt/.rtf parsers) | ⬜ |
| Title-page anonymization check | ⬜ |
| Metadata stripping (anonymization pipeline) | ⬜ |
| R2 upload (binding via Wrangler) | ⬜ *needs Wrangler config + R2 bucket* |
| Resubmit-overwrites-prior support | ✅ *(upsert by registration+round)* |
| Confirmation email on upload | ⬜ |

## Group & prompt assignment

| Feature | Status |
|---|---|
| `groups` + `group_members` schema | ✅ |
| Random group assignment at registration close | ⬜ |
| Random prompt draw per group | ⬜ |
| Admin override for group prompts | ⬜ *(UI exists at `/admin/groups`; edit not yet wired)* |
| Prompt email kickoff (cron) | ⬜ |

## Judging

| Feature | Status |
|---|---|
| `judges` + `assignments` + `scores` schema | ✅ |
| Judge login (uses same magic-link auth) | ✅ |
| Judge dashboard (`/judge`) | ⬜ |
| Rubric-based scoring UI | ⬜ |
| Feedback Markdown editor with autosave | ⬜ |
| Anonymized story renderer (.docx → HTML) | ⬜ |
| Judge assignment algorithm (load balance + COI flags) | ⬜ |
| Score aggregation + tiebreaker logic | ⬜ |
| Advance list generation | ⬜ |

## Admin

| Feature | Status |
|---|---|
| Admin gating via `ADMIN_EMAILS` env var | ✅ |
| `tdgarske@gmail.com` set as admin on signup | ✅ *(via migration 0003 + env)* |
| Admin home (`/admin`) with stat cards | ✅ |
| Submissions list (`/admin/submissions`) | ✅ |
| Judges list (`/admin/judges`) | ✅ |
| Groups + prompts list (`/admin/groups`) | ✅ |
| Send round-kickoff emails | ⬜ |
| Trigger advance-list publication | ⬜ |
| Refund processing | ⬜ |
| Audit log viewer | ⬜ |

## Data model + RLS

| Feature | Status |
|---|---|
| Schema: 11 tables + 2 enums (`migrations/0001_initial.sql`) | ✅ |
| RLS policies for all tables (`migrations/0002_rls.sql`) | ✅ |
| Seed: inaugural challenge + 3 rounds + admin flag (`migrations/0003_seed.sql`) | ✅ |
| `handle_new_user()` trigger (profile on signup) | ✅ |

## Infrastructure / deployment

| Feature | Status |
|---|---|
| Astro 5 + Cloudflare adapter | ✅ |
| TypeScript + strict config | ✅ |
| Env example documented | ✅ |
| Supabase client wrappers (browser / server / admin) | ✅ |
| Stripe client wrapper | ✅ |
| Resend client wrapper | ✅ |
| R2 helpers (S3-compatible + Worker binding TODO) | 🟨 |
| Wrangler config for Workers / R2 bindings | ⬜ |
| GitHub Pages deploy *(static only — won't serve API routes)* | ⬜ *Cloudflare Pages preferred* |
| Cloudflare Pages project + custom domain | ⬜ |
| Migrations CI / Supabase deploy step | ⬜ |

## Out-of-scope-for-MVP (defer to post-launch)

- Forum (Discourse or Discord, separate)
- Anti-AI detection beyond stated policy + manual review
- Anti-plagiarism (Copyscape API on top-25 per round)
- Anthology generation
- ReadMoreSFF Quarterly journal CMS
- Multi-cycle / multi-challenge support (current code assumes one active challenge)
- Internationalization
- Mobile native apps

---

## Suggested next implementation order

1. **Wire env vars + run migrations.** Supabase project, Stripe test keys, Resend key, R2 bucket. ~1 day.
2. **End-to-end signup test.** Real Stripe checkout in test mode → webhook → magic link → land on `/dashboard`. ~1 day.
3. **Word counter + R2 upload.** Use `mammoth` for `.docx` parsing, `node-rtf-parser` for `.rtf`. ~2-3 days.
4. **Anonymization pipeline.** Strip `.docx` metadata; render anonymized HTML preview. ~3 days.
5. **Group assignment cron.** Triggered at `registration_closes`; randomly bucket writers, draw prompts, send R1 kickoff emails. ~2 days.
6. **Judge UI.** Rubric form, autosave, mobile-friendly. ~5-7 days.
7. **Score aggregation + advance list.** Median, tiebreak rule, top-N publish. ~2 days.
8. **Polish admin UI.** Refund triggers, manual overrides, audit log viewer. ~3-5 days.

Total to first cycle: **roughly 4-6 focused weeks of dev**, plus the operational work (judge recruiting, contest-rules drafting, marketing) that runs in parallel.
