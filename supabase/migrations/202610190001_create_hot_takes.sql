-- Hot Takes backend: private base tables plus a deliberately small RPC surface.

create type public.take_status as enum ('pending', 'approved', 'rejected');
create type public.vote_choice as enum ('agree', 'disagree');

create table public.takes (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(btrim(body)) between 1 and 280),
  -- Nullable only for moderator-created seed/system content. API submissions are
  -- always assigned to auth.uid() by the trigger below.
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  status public.take_status not null default 'pending',
  moderated_at timestamptz,
  constraint takes_moderation_time_check check (
    (status = 'pending' and moderated_at is null)
    or (status <> 'pending' and moderated_at is not null)
  )
);

create table public.votes (
  take_id uuid not null references public.takes (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  choice public.vote_choice not null,
  created_at timestamptz not null default now(),
  primary key (take_id, user_id)
);

create index takes_public_feed_idx
  on public.takes (created_at desc)
  where status = 'approved';

alter table public.takes enable row level security;
alter table public.votes enable row level security;

-- Defence in depth: clients use the RPC functions below, but these policies keep
-- ownership rules intact if narrow table grants are added in the future.
create policy "approved takes are public and authors see their own"
  on public.takes for select
  using (status = 'approved' or created_by = (select auth.uid()));

create policy "users submit pending takes as themselves"
  on public.takes for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and status = 'pending'
    and moderated_at is null
  );

create policy "users see only their own raw votes"
  on public.votes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users cast only their own votes"
  on public.votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.takes
      where takes.id = votes.take_id and takes.status = 'approved'
    )
  );

create policy "users change only their own votes"
  on public.votes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.takes
      where takes.id = votes.take_id and takes.status = 'approved'
    )
  );

-- Do not expose base tables through the Data API. The functions below are the
-- public contract and return no authorship or voter-identity columns.
revoke all on public.takes, public.votes from anon, authenticated;

create function public.get_takes()
returns table (
  id uuid,
  body text,
  created_at timestamptz,
  agree_count bigint,
  disagree_count bigint,
  viewer_choice public.vote_choice
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    t.body,
    t.created_at,
    count(v.user_id) filter (where v.choice = 'agree') as agree_count,
    count(v.user_id) filter (where v.choice = 'disagree') as disagree_count,
    (
      max(v.choice::text) filter (where v.user_id = (select auth.uid()))
    )::public.vote_choice as viewer_choice
  from public.takes as t
  left join public.votes as v on v.take_id = t.id
  where t.status = 'approved'
  group by t.id
  order by t.created_at desc;
$$;

create function public.enforce_take_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    -- Seed scripts and manual moderator inserts connect as postgres. PostgREST
    -- requests connect as authenticator, so they cannot use this escape hatch.
    if session_user = 'postgres' and new.status = 'approved' then
      new.body := btrim(new.body);
      return new;
    end if;

    raise exception 'You must be signed in to submit a take.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.takes
    where created_by = current_user_id
      and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'Please wait 10 minutes before submitting another take.' using errcode = 'P0001';
  end if;

  new.created_by := current_user_id;
  new.status := 'pending';
  new.moderated_at := null;
  new.body := btrim(new.body);
  return new;
end;
$$;

create trigger enforce_take_submission_before_insert
before insert on public.takes
for each row execute function public.enforce_take_submission();

create function public.submit_take(p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.takes (body) values (p_body) returning id into new_id;
  return new_id;
end;
$$;

create function public.cast_vote(p_take_id uuid, p_choice public.vote_choice)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'You must be signed in to vote.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.takes where id = p_take_id and status = 'approved'
  ) then
    raise exception 'This take is not available for voting.' using errcode = 'P0002';
  end if;

  insert into public.votes (take_id, user_id, choice)
  values (p_take_id, current_user_id, p_choice)
  on conflict (take_id, user_id)
  do update set choice = excluded.choice, created_at = now();
end;
$$;

create function public.moderate_take(p_take_id uuid, p_status public.take_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'moderator' then
    raise exception 'Moderator access required.' using errcode = '42501';
  end if;

  if p_status = 'pending' then
    raise exception 'Moderation must approve or reject a take.' using errcode = '22023';
  end if;

  update public.takes
  set status = p_status, moderated_at = now()
  where id = p_take_id;

  if not found then
    raise exception 'Take not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.get_takes() from public;
revoke all on function public.submit_take(text) from public;
revoke all on function public.cast_vote(uuid, public.vote_choice) from public;
revoke all on function public.moderate_take(uuid, public.take_status) from public;

grant execute on function public.get_takes() to anon, authenticated;
grant execute on function public.submit_take(text) to authenticated;
grant execute on function public.cast_vote(uuid, public.vote_choice) to authenticated;
grant execute on function public.moderate_take(uuid, public.take_status) to authenticated;
