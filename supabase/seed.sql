-- Local-development content. The fixed UUIDs make this seed repeatable.
insert into public.takes (id, body, status, moderated_at)
select seed.id, seed.body, 'approved'::public.take_status, now()
from (
  values
    ('00000000-0000-4000-8000-000000000001'::uuid, 'Good singers shouldn’t do karaoke.')
) as seed(id, body)
on conflict (id) do nothing;
