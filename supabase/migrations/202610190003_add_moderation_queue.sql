-- Give the static admin page a narrow, moderator-only view of pending takes.
-- The function deliberately omits author identity and relies on the protected
-- app_metadata claim in the caller's Supabase JWT.
create function public.get_pending_takes()
returns table (
  id uuid,
  body text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'moderator' then
    raise exception 'Moderator access required.' using errcode = '42501';
  end if;

  return query
  select t.id, t.body, t.created_at
  from public.takes as t
  where t.status = 'pending'
  order by t.created_at asc;
end;
$$;

revoke all on function public.get_pending_takes() from public;
grant execute on function public.get_pending_takes() to authenticated;
