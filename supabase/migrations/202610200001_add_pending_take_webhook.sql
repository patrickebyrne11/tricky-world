-- Queue approval-email notifications without making take submission depend on
-- the Edge Function or Resend. The shared secret is stored separately in
-- Supabase Vault as `hot_takes_webhook_secret`; it never appears in git.
create extension if not exists pg_net with schema extensions;

create function public.notify_pending_take_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_secret text;
begin
  select decrypted_secret
  into webhook_secret
  from vault.decrypted_secrets
  where name = 'hot_takes_webhook_secret'
  limit 1;

  if webhook_secret is null then
    raise warning 'Hot Takes webhook secret is not configured in Vault.';
    return new;
  end if;

  perform net.http_post(
    url := 'https://gwhnkjsikzzysskwdiwd.supabase.co/functions/v1/notify-pending-take',
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', to_jsonb(new),
      'old_record', null
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    timeout_milliseconds := 1000
  );

  return new;
exception
  when others then
    -- Email is a downstream side effect. A configuration or queueing failure
    -- must not roll back a valid take submission.
    raise warning 'Unable to queue Hot Takes notification: %', sqlerrm;
    return new;
end;
$$;

revoke all on function public.notify_pending_take_webhook() from public;

create trigger notify_pending_take_after_insert
after insert on public.takes
for each row execute function public.notify_pending_take_webhook();
