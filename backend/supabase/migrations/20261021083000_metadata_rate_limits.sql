create table private.metadata_rate_limits (
  scope_key text primary key,
  window_started timestamp with time zone not null default statement_timestamp(),
  request_count integer not null default 0,
  constraint metadata_rate_limits_key_length check (char_length(scope_key) between 1 and 160),
  constraint metadata_rate_limits_count_nonnegative check (request_count >= 0)
);

revoke all on table private.metadata_rate_limits from public, anon, authenticated;

create function public.consume_metadata_rate_limit(p_ip text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id text := auth.jwt() ->> 'sub';
  ip_key text := 'ip:' || encode(extensions.digest(left(coalesce(p_ip, 'unknown'), 128), 'sha256'), 'hex');
  user_key text := 'user:' || current_user_id;
  now_value timestamp with time zone := clock_timestamp();
  window_seconds integer := 300;
  user_limit integer := 20;
  ip_limit integer := 60;
  user_count integer;
  ip_count integer;
  user_started timestamp with time zone;
  ip_started timestamp with time zone;
  retry_after integer := 300;
begin
  if current_user_id is null or char_length(current_user_id) = 0 then
    raise exception using errcode = '28000', message = 'authenticated subject is required';
  end if;

  insert into private.metadata_rate_limits (scope_key)
  values (user_key), (ip_key)
  on conflict (scope_key) do nothing;

  select request_count, window_started
  into user_count, user_started
  from private.metadata_rate_limits
  where scope_key = user_key
  for update;

  select request_count, window_started
  into ip_count, ip_started
  from private.metadata_rate_limits
  where scope_key = ip_key
  for update;

  if now_value >= user_started + make_interval(secs => window_seconds) then
    user_count := 0;
    user_started := now_value;
  end if;
  if now_value >= ip_started + make_interval(secs => window_seconds) then
    ip_count := 0;
    ip_started := now_value;
  end if;

  if user_count >= user_limit or ip_count >= ip_limit then
    retry_after := greatest(
      1,
      ceil(extract(epoch from least(
        user_started + make_interval(secs => window_seconds),
        ip_started + make_interval(secs => window_seconds)
      ) - now_value))::integer
    );
    return jsonb_build_object('allowed', false, 'retryAfterSeconds', retry_after);
  end if;

  update private.metadata_rate_limits
  set request_count = user_count + 1, window_started = user_started
  where scope_key = user_key;
  update private.metadata_rate_limits
  set request_count = ip_count + 1, window_started = ip_started
  where scope_key = ip_key;

  return jsonb_build_object(
    'allowed', true,
    'retryAfterSeconds', 0,
    'remainingUser', greatest(0, user_limit - user_count - 1),
    'remainingIp', greatest(0, ip_limit - ip_count - 1)
  );
end;
$$;

revoke all on function public.consume_metadata_rate_limit(text) from public, anon;
grant execute on function public.consume_metadata_rate_limit(text) to authenticated;
