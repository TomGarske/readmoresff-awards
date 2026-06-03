-- Seed the inaugural challenge + the three rounds.
-- Idempotent: re-running won't duplicate.

insert into challenges (slug, name, format, word_limit, fee_list_cents, fee_promo_cents,
                        registration_opens, registration_closes)
values ('readmoresff-1500-2026',
        'The ReadMoreSFF 1500',
        '1500-word short story, three-round elimination',
        1500, 4500, 3500,
        '2026-08-01T00:00:00-04:00',
        '2026-10-19T23:59:00-04:00')
on conflict (slug) do nothing;

with c as (select id from challenges where slug = 'readmoresff-1500-2026')
insert into rounds (challenge_id, kind, start_at, end_at, advance_per_group, group_size_target)
select c.id, 'round_1', '2026-10-23T23:59:00-04:00', '2026-10-25T23:59:00-04:00', 10, 40 from c
union all
select c.id, 'round_2', '2027-01-15T23:59:00-05:00', '2027-01-17T23:59:00-05:00', 4, 40 from c
union all
select c.id, 'final',   '2027-03-12T23:59:00-05:00', '2027-03-14T23:59:00-04:00', 10, 100 from c
on conflict (challenge_id, kind) do nothing;

-- Set admin email (overridable via ADMIN_EMAILS env var at runtime,
-- but useful to also flag here for direct DB queries).
update profiles set is_admin = true where lower(email) = 'tdgarske@gmail.com';
