-- Row Level Security policies.

-- Profiles: own row read/write; admins read all
alter table profiles enable row level security;

create policy "profile_self_read" on profiles
  for select using (auth.uid() = id);

create policy "profile_self_update" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profile_admin_read" on profiles
  for select using ( (select is_admin from profiles where id = auth.uid()) );

-- Challenges: public read
alter table challenges enable row level security;
create policy "challenge_public_read" on challenges for select using (true);

alter table rounds enable row level security;
create policy "rounds_public_read" on rounds for select using (true);

-- Registrations: writer reads their own; admins read all
alter table registrations enable row level security;

create policy "registration_self_read" on registrations
  for select using (user_id = auth.uid());

create policy "registration_admin_read" on registrations
  for select using ( (select is_admin from profiles where id = auth.uid()) );

-- Groups + group_members + submissions: writer reads their own group/sub; admin reads all
alter table groups enable row level security;
alter table group_members enable row level security;
alter table submissions enable row level security;

create policy "group_member_read_self" on group_members
  for select using (
    exists (select 1 from registrations r where r.id = registration_id and r.user_id = auth.uid())
  );

create policy "groups_member_read" on groups
  for select using (
    exists (
      select 1 from group_members gm
      join registrations r on r.id = gm.registration_id
      where gm.group_id = groups.id and r.user_id = auth.uid()
    )
  );

create policy "groups_admin_read" on groups
  for select using ( (select is_admin from profiles where id = auth.uid()) );

create policy "submissions_self_rw" on submissions
  for all
  using (
    exists (select 1 from registrations r where r.id = registration_id and r.user_id = auth.uid())
  )
  with check (
    exists (select 1 from registrations r where r.id = registration_id and r.user_id = auth.uid())
  );

create policy "submissions_admin_read" on submissions
  for select using ( (select is_admin from profiles where id = auth.uid()) );

-- Judging tables: judges read assigned submissions, never registrations
alter table judges enable row level security;
alter table assignments enable row level security;
alter table scores enable row level security;

create policy "judge_self_read" on judges
  for select using (user_id = auth.uid());

create policy "assignment_judge_read" on assignments
  for select using (
    exists (select 1 from judges j where j.id = judge_id and j.user_id = auth.uid())
  );

create policy "assignment_judge_update" on assignments
  for update using (
    exists (select 1 from judges j where j.id = judge_id and j.user_id = auth.uid())
  );

create policy "score_judge_rw" on scores
  for all
  using (
    exists (
      select 1 from assignments a join judges j on j.id = a.judge_id
      where a.id = assignment_id and j.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from assignments a join judges j on j.id = a.judge_id
      where a.id = assignment_id and j.user_id = auth.uid()
    )
  );

-- Admins see everything in the judging tables too
create policy "judge_admin_all" on judges for all
  using ( (select is_admin from profiles where id = auth.uid()) )
  with check ( (select is_admin from profiles where id = auth.uid()) );

create policy "assignment_admin_all" on assignments for all
  using ( (select is_admin from profiles where id = auth.uid()) )
  with check ( (select is_admin from profiles where id = auth.uid()) );

create policy "score_admin_read" on scores for select
  using ( (select is_admin from profiles where id = auth.uid()) );

-- Audit log is admin-only
alter table audit_log enable row level security;
create policy "audit_admin_read" on audit_log for select
  using ( (select is_admin from profiles where id = auth.uid()) );
