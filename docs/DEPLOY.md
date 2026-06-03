# Deploy guide

End-to-end checklist for standing up a fresh environment from zero. All
infrastructure is Cloudflare + Supabase + Stripe + Resend. No AWS or
GCP needed.

---

## 1. Supabase project (~30 min)

1. Create a new project at <https://supabase.com/dashboard>.
2. Copy the `Project URL`, `anon` key, and `service_role` key from
   Project Settings → API.
3. In SQL Editor, run the three migrations in order:
   - `migrations/0001_initial.sql`
   - `migrations/0002_rls.sql`
   - `migrations/0003_seed.sql`
4. Auth → URL Configuration → Set Site URL to your production URL
   (`https://awards.readmoresff.org` once chosen) and add the
   `https://<your-pages-domain>/auth/callback` to Redirect URLs.
5. Auth → Providers → Email: leave magic link enabled, optionally
   disable email/password if you want passwordless-only.

**Outputs:** `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`.

## 2. Cloudflare R2 (~10 min)

1. Cloudflare dashboard → R2 → Create bucket
   - `readmoresff-submissions` (originals)
   - `readmoresff-anonymized` (anonymized copies for judges)
2. R2 → Manage R2 API Tokens → Create API token with `Object Read & Write`
   on both buckets.

**Outputs:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.

## 3. Stripe (~20 min)

1. Create account at <https://stripe.com>.
2. Get publishable + secret keys from Developers → API keys.
   Use **test mode** for everything until cycle 1 actually runs.
3. In the Astro app, prices are created **dynamically per checkout** —
   no need to create products in the Stripe dashboard.
4. Set up webhook at Developers → Webhooks:
   - Endpoint: `https://awards.readmoresff.org/api/stripe/webhook`
   - Events: `checkout.session.completed`
   - Copy signing secret.

**Outputs:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`PUBLIC_STRIPE_PUBLISHABLE_KEY`.

## 4. Resend (~10 min)

1. Create account at <https://resend.com>.
2. Add and verify the sending domain (DNS records via Cloudflare DNS).
3. Generate an API key in Settings → API Keys.

**Outputs:** `RESEND_API_KEY`, `EMAIL_FROM` (e.g.
`ReadMoreSFF Awards <awards@readmoresff.org>`).

## 5. Cloudflare Pages (~10 min)

1. Cloudflare dashboard → Pages → Create project → Connect to Git →
   pick `TomGarske/readmoresff-awards`.
2. Build configuration:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output: `dist`
   - Node version: **20**
3. Environment variables — paste in everything from `.env.example`
   (use the secret-type field for `*_KEY` values).
4. Functions → R2 → Bind:
   - `SUBMISSIONS` → `readmoresff-submissions`
   - `ANONYMIZED` → `readmoresff-anonymized`
5. After first deploy, attach the custom domain
   (`awards.readmoresff.org` or `/awards` sub-path).

## 6. Local development

```bash
npm install
cp .env.example .env
# fill in real values

# Run migrations (in Supabase SQL editor)

npm run dev
# → http://localhost:4321
```

For local R2 testing, the S3-compatible client uses your R2 API token.
For production, Cloudflare Pages will use the R2 binding (zero egress);
the code currently uses the S3 path universally. To switch to the
binding path, refactor `lib/r2-upload.ts` to take `(env)` and call
`env.SUBMISSIONS.put(key, body)`.

## 7. First admin login

1. `ADMIN_EMAILS=tdgarske@gmail.com` is in `.env.example`.
2. Visit `/login`, enter that email, click the magic link.
3. Land on `/dashboard`, see "Admin access detected", click into `/admin`.

## 8. First test cycle (in test mode)

1. **Register a couple of fake writers** via `/register` using Stripe
   test card `4242 4242 4242 4242`.
2. **Verify Stripe webhook fires** — should see paid registrations in
   `/admin`.
3. **Add yourself as a judge** via the Supabase SQL editor:
   ```sql
   insert into judges (user_id, challenge_id)
   select id, (select id from challenges where slug = 'readmoresff-1500-2026')
   from profiles where email = 'tdgarske@gmail.com';
   ```
4. **Generate groups** at `/admin/groups` → "Generate groups".
5. **Send kickoff emails** (test inboxes).
6. **Upload test stories** via `/dashboard/submit`.
7. **Assign judges** via the assign endpoint:
   ```bash
   curl -X POST $SITE_URL/api/admin/judges/assign \
     -H 'Content-Type: application/json' \
     -b "sb-access-token=$YOUR_COOKIE" \
     -d '{"roundKind":"round_1"}'
   ```
8. **Score stories** as the judge at `/judge`.
9. **Publish advance list** via `/api/admin/advance` (or build a UI
   button — currently CLI-only):
   ```bash
   curl -X POST $SITE_URL/api/admin/advance \
     -H 'Content-Type: application/json' \
     -b "sb-access-token=$YOUR_COOKIE" \
     -d '{"roundKind":"round_1","sendEmails":true}'
   ```
10. **Check public results** at `/results`.

That's the full happy path. Everything else (Round 2 → Final, refunds,
audit log) follows the same pattern.
