-- Production starts with the same approved take as local development.
-- Browser submissions cannot use this path: only the migration owner can
-- disable the trigger, and the tables have no direct browser grants.
alter table public.takes disable trigger enforce_take_submission_before_insert;

insert into public.takes (id, body, status, moderated_at)
values (
  '00000000-0000-4000-8000-000000000001',
  'Good singers shouldn’t do karaoke.',
  'approved',
  now()
)
on conflict (id) do nothing;

alter table public.takes enable trigger enforce_take_submission_before_insert;
