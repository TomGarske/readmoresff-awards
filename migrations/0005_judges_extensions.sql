-- Migration 0005 — judge bios, public applications, COI flagging, prize places.

-- Public bios on judges
alter table judges
  add column if not exists display_name text,
  add column if not exists photo_url text,
  add column if not exists bio_short text,    -- 1-2 sentences for the /judges page
  add column if not exists bio_long text,
  add column if not exists active boolean not null default true,
  add column if not exists public_visible boolean not null default true;

-- Judge applications (from /judges#apply)
create table if not exists judge_applications (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  why_qualified text not null,    -- credentials, prior NYCM rounds, MFA, books, etc.
  specialties   text[] default '{}',
  social_links  text,
  status        text not null default 'pending',   -- pending | accepted | declined
  notes         text,
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid references profiles(id)
);

alter table judge_applications enable row level security;
-- Public can insert applications, only admins read
create policy "apps_public_insert" on judge_applications for insert with check (true);
create policy "apps_admin_read"   on judge_applications for select using (
  (select is_admin from profiles where id = auth.uid())
);
create policy "apps_admin_update" on judge_applications for update using (
  (select is_admin from profiles where id = auth.uid())
);

-- Conflict of interest flagging on assignments
alter table assignments
  add column if not exists coi_flagged boolean not null default false,
  add column if not exists coi_reason text,
  add column if not exists coi_flagged_at timestamptz;

-- Final ranking — which place each submission finished
alter table submissions
  add column if not exists final_place int,                     -- 1..10 for the top finishers
  add column if not exists final_prize_cents int default 0;

create index if not exists submissions_final_place on submissions (final_place);

-- Manual score override — record on a new column rather than mutating scores
alter table scores
  add column if not exists overridden_total int,
  add column if not exists overridden_by uuid references profiles(id),
  add column if not exists overridden_at timestamptz,
  add column if not exists override_reason text;
