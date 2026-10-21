-- Mandatory post-authentication email OTP.
--
-- The server generates a six-digit code, sends it by email, and stores only an
-- HMAC of it (keyed with a server secret the client never sees). Each challenge is
-- bound to the Clerk user (`sub`) and Clerk session (`sid`) read from the verified
-- JWT, so a code issued for one sign-in cannot verify another.
--
-- Limits: codes expire after 10 minutes, allow 5 attempts, are single use, may be
-- resent once per 60 seconds per session, and at most 5 times per hour per user.

create table private.email_otp_challenges (
  user_id text not null,
  session_id text not null,
  code_hash text not null,
  expires_at timestamp with time zone not null,
  attempts integer not null default 0,
  last_sent_at timestamp with time zone not null,
  created_at timestamp with time zone not null default clock_timestamp(),
  primary key (user_id, session_id),
  constraint email_otp_challenges_user_length check (char_length(user_id) between 1 and 255),
  constraint email_otp_challenges_session_length check (char_length(session_id) between 1 and 255),
  constraint email_otp_challenges_hash_format check (code_hash ~ '^[0-9a-f]{64}$'),
  constraint email_otp_challenges_attempts_range check (attempts between 0 and 5)
);

create table private.email_otp_sends (
  id bigint generated always as identity primary key,
  user_id text not null,
  sent_at timestamp with time zone not null default clock_timestamp(),
  constraint email_otp_sends_user_length check (char_length(user_id) between 1 and 255)
);

create index email_otp_sends_user_sent_idx on private.email_otp_sends (user_id, sent_at desc);

revoke all on table private.email_otp_challenges from public, anon, authenticated;
revoke all on table private.email_otp_sends from public, anon, authenticated;

-- Issue (or re-issue) the challenge for the caller's current session.
create function public.issue_email_otp(p_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id text := auth.jwt() ->> 'sub';
  current_session_id text := auth.jwt() ->> 'sid';
  now_value timestamp with time zone := clock_timestamp();
  ttl_seconds constant integer := 600;
  cooldown_seconds constant integer := 60;
  hourly_limit constant integer := 5;
  max_attempts constant integer := 5;
  existing private.email_otp_challenges%rowtype;
  sends_last_hour integer;
  oldest_send timestamp with time zone;
begin
  if coalesce(current_user_id, '') = '' or coalesce(current_session_id, '') = '' then
    raise exception using errcode = '28000', message = 'authenticated session is required';
  end if;
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid code hash';
  end if;

  -- Serialise issuance per user so the hourly cap holds under concurrent requests.
  perform pg_advisory_xact_lock(hashtextextended('email_otp:' || current_user_id, 0));

  select * into existing
  from private.email_otp_challenges
  where user_id = current_user_id and session_id = current_session_id
  for update;

  if found and existing.last_sent_at + make_interval(secs => cooldown_seconds) > now_value then
    return jsonb_build_object(
      'issued', false,
      'reason', 'cooldown',
      'retryAfterSeconds', greatest(1, ceil(extract(epoch from
        existing.last_sent_at + make_interval(secs => cooldown_seconds) - now_value))::integer)
    );
  end if;

  select count(*), min(sent_at) into sends_last_hour, oldest_send
  from private.email_otp_sends
  where user_id = current_user_id and sent_at > now_value - interval '1 hour';

  if sends_last_hour >= hourly_limit then
    return jsonb_build_object(
      'issued', false,
      'reason', 'rate_limited',
      'retryAfterSeconds', greatest(1, ceil(extract(epoch from
        oldest_send + interval '1 hour' - now_value))::integer)
    );
  end if;

  insert into private.email_otp_challenges (user_id, session_id, code_hash, expires_at, attempts, last_sent_at)
  values (current_user_id, current_session_id, p_code_hash,
          now_value + make_interval(secs => ttl_seconds), 0, now_value)
  on conflict (user_id, session_id) do update
  set code_hash = excluded.code_hash,
      expires_at = excluded.expires_at,
      attempts = 0,
      last_sent_at = excluded.last_sent_at;

  insert into private.email_otp_sends (user_id, sent_at) values (current_user_id, now_value);

  -- Housekeeping for this user only.
  delete from private.email_otp_sends
  where user_id = current_user_id and sent_at < now_value - interval '1 day';
  delete from private.email_otp_challenges
  where user_id = current_user_id and expires_at < now_value - interval '1 day';

  return jsonb_build_object(
    'issued', true,
    'expiresAt', now_value + make_interval(secs => ttl_seconds),
    'resendAvailableAt', now_value + make_interval(secs => cooldown_seconds),
    'attemptsRemaining', max_attempts
  );
end;
$$;

-- Check a submitted code (as its HMAC) against the caller's current session challenge.
create function public.verify_email_otp(p_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id text := auth.jwt() ->> 'sub';
  current_session_id text := auth.jwt() ->> 'sid';
  now_value timestamp with time zone := clock_timestamp();
  max_attempts constant integer := 5;
  challenge private.email_otp_challenges%rowtype;
  remaining integer;
begin
  if coalesce(current_user_id, '') = '' or coalesce(current_session_id, '') = '' then
    raise exception using errcode = '28000', message = 'authenticated session is required';
  end if;

  select * into challenge
  from private.email_otp_challenges
  where user_id = current_user_id and session_id = current_session_id
  for update;

  if not found then
    return jsonb_build_object('status', 'missing');
  end if;
  if challenge.expires_at <= now_value then
    return jsonb_build_object('status', 'expired');
  end if;
  if challenge.attempts >= max_attempts then
    return jsonb_build_object('status', 'locked', 'attemptsRemaining', 0);
  end if;

  if p_code_hash is not null and challenge.code_hash = p_code_hash then
    -- Single use: the challenge is consumed on success.
    delete from private.email_otp_challenges
    where user_id = current_user_id and session_id = current_session_id;
    return jsonb_build_object('status', 'verified');
  end if;

  update private.email_otp_challenges
  set attempts = attempts + 1
  where user_id = current_user_id and session_id = current_session_id
  returning max_attempts - attempts into remaining;

  return jsonb_build_object(
    'status', case when remaining <= 0 then 'locked' else 'invalid' end,
    'attemptsRemaining', greatest(remaining, 0)
  );
end;
$$;

-- Pending-challenge state for the verification page (never includes the code or hash).
create function public.email_otp_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id text := auth.jwt() ->> 'sub';
  current_session_id text := auth.jwt() ->> 'sid';
  now_value timestamp with time zone := clock_timestamp();
  max_attempts constant integer := 5;
  cooldown_seconds constant integer := 60;
  challenge private.email_otp_challenges%rowtype;
begin
  if coalesce(current_user_id, '') = '' or coalesce(current_session_id, '') = '' then
    raise exception using errcode = '28000', message = 'authenticated session is required';
  end if;

  select * into challenge
  from private.email_otp_challenges
  where user_id = current_user_id and session_id = current_session_id;

  if not found then
    return jsonb_build_object('pending', false);
  end if;

  return jsonb_build_object(
    'pending', true,
    'expired', challenge.expires_at <= now_value,
    'expiresAt', challenge.expires_at,
    'resendAvailableAt', challenge.last_sent_at + make_interval(secs => cooldown_seconds),
    'attemptsRemaining', greatest(max_attempts - challenge.attempts, 0)
  );
end;
$$;

revoke all on function public.issue_email_otp(text) from public, anon;
revoke all on function public.verify_email_otp(text) from public, anon;
revoke all on function public.email_otp_status() from public, anon;
grant execute on function public.issue_email_otp(text) to authenticated;
grant execute on function public.verify_email_otp(text) to authenticated;
grant execute on function public.email_otp_status() to authenticated;
