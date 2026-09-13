-- Run once in the dedicated Supabase project after confirming its organization/cost.
-- No service-role credential is needed or exposed in the frontend.
begin;

create table public.tisch_kochbuch (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'version' = '1'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint cookbook_size_limit check (octet_length(data::text) <= 20000000)
);

alter table public.tisch_kochbuch enable row level security;
revoke all on public.tisch_kochbuch from public, anon;
grant select, insert, update, delete on public.tisch_kochbuch to authenticated;

create policy "Read own cookbook" on public.tisch_kochbuch
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own cookbook" on public.tisch_kochbuch
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own cookbook" on public.tisch_kochbuch
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Delete own cookbook" on public.tisch_kochbuch
  for delete to authenticated using ((select auth.uid()) = user_id);

comment on table public.tisch_kochbuch is 'Private personal cookbook snapshot. Optimistic revision checks prevent overwriting a newer device snapshot.';
commit;
