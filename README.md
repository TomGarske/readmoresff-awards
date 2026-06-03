# ReadMoreSFF Awards — platform

The **ReadMoreSFF 1500**: a 1,500-word speculative-fiction writing challenge. Three rounds, 48-hour writing windows, anonymous judging by working SFF editors.

Code for the marketing site, writer signup + upload, judge UI, and admin dashboard. Designed to live at `readmoresff.org/awards` or `awards.readmoresff.org` once deployed.

**Stack:** Astro 5 (server-render via Cloudflare Pages) · Supabase Postgres + Auth · Stripe Checkout · Cloudflare R2 · Resend.

**Status: scaffold complete. See [`docs/FEATURES.md`](docs/FEATURES.md) for what's built vs needed.**

---

## Quick start (local dev)

```bash
# 1. Install
npm install

# 2. Copy env vars
cp .env.example .env
# fill in Supabase, Stripe (test), Resend, R2 keys

# 3. Apply migrations
# In Supabase SQL Editor, run in order:
#   migrations/0001_initial.sql
#   migrations/0002_rls.sql
#   migrations/0003_seed.sql

# 4. Run dev server
npm run dev
# → http://localhost:4321
```

## Admin access

Set `ADMIN_EMAILS` in `.env` (comma-separated). Any user who signs in with one of those emails gets admin access at `/admin`.

```env
ADMIN_EMAILS=tdgarske@gmail.com
```

The migration also sets `tdgarske@gmail.com` as admin in the `profiles` table on signup. The env-var check is the runtime gate; the column flag is for direct SQL queries.

## Repo layout

```
src/
  layouts/Base.astro          ← global shell, top nav, footer
  pages/                      ← Astro routes
    index.astro               ← marketing landing
    register.astro            ← signup form
    register/success.astro    ← post-checkout landing
    login.astro               ← magic-link entry
    login/sent.astro          ← post-link landing
    auth/callback.ts          ← magic-link redirect target
    dashboard.astro           ← writer home
    dashboard/submit.astro    ← story uploader
    account.astro             ← profile editor
    admin/                    ← admin-only pages
      index.astro
      submissions.astro
      judges.astro
      groups.astro
    api/                      ← server endpoints
      register.ts             ← creates Stripe Checkout session
      stripe/webhook.ts       ← payment → user/registration/welcome-email
      auth/send-link.ts       ← magic-link request
      auth/set-session.ts     ← cookie setter from callback
      auth/sign-out.ts
      account/save.ts
      submissions/upload.ts
  lib/
    config.ts                 ← challenge config (calendar, prizes, fees)
    prompts.ts                ← 10 genres × 10 themes × 10 objects
    supabase.ts               ← client wrappers (browser/server/admin)
    auth.ts                   ← cookie helpers + admin gate
    stripe.ts                 ← Stripe client + Checkout helper
    email.ts                  ← Resend client
    r2.ts                     ← Cloudflare R2 helpers
  styles/global.css           ← all UI styles (no Tailwind, no build step)
migrations/
  0001_initial.sql            ← tables, enums, trigger
  0002_rls.sql                ← Row Level Security policies
  0003_seed.sql               ← inaugural challenge + rounds + admin flag
docs/
  FEATURES.md                 ← feature completion review
```

## What's the competition?

See [`src/lib/config.ts`](src/lib/config.ts) for the full spec. Quick version:

- **Word limit:** 1,500 max · 1–50 over = −10% · 51+ over = DQ
- **Entry fee:** $45 list, $35 with `READMORE10` promo
- **Prize floor:** $7,450 across 10 places (top 5: $3,000 / $1,500 / $800 / $500 / $400)
- **Rounds:** 3, 48 hours each, top-10 of ~40 advance from R1, top-4 advance from R2, top-10 from final
- **Prompt:** 3 slots — genre (10 options) × theme (10) × object (10) = 1,000 combinations
- **Calendar:** registration Aug–Oct 2026 · R1 Oct 23–25, 2026 · final Mar 12–14, 2027

## Companion projects

- **[readmoresff.org](https://readmoresff.org)** — the live Hugo/Nebula reading tracker (separate codebase). This awards platform will link from there and feed winners back into it.
- **[nycm-2026](https://github.com/TomGarske/nycm-2026)** — analytics dashboard that mapped the in-flight NYC Midnight 500-word challenge. Findings from that project shaped this spec.

## License

Source available, all rights reserved by default. Open-source license decision is TBD pre-launch.
