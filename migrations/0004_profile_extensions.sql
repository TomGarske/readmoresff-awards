-- Migration 0004 — extend profiles to match the data the NYC Midnight pattern collects.
-- New columns:
--   personal_website (text)          — optional URL for credit
--   additional_writers (text[])      — names of co-writers when teams submit
--   newsletter_opt_in (boolean)      — explicit opt-in for non-transactional email
--   timezone (text)                  — IANA tz, for deadline conversion in emails
--   referred_by (text)               — free-text "how did you hear about us"

alter table profiles
  add column if not exists personal_website text,
  add column if not exists additional_writers text[] default '{}',
  add column if not exists newsletter_opt_in boolean not null default false,
  add column if not exists timezone text,
  add column if not exists referred_by text;
