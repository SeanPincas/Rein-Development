begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

-- Hashes are opaque 64-char hex strings to the database ('a…' = right code, 'b…' = wrong code).

set local role authenticated;
set local request.jwt.claims = '{"sub":"user_otp","sid":"sess_one","role":"authenticated"}';

select is((public.issue_email_otp('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')->>'issued')::boolean, true, 'a session can be issued a code');
select is(public.issue_email_otp('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')->>'reason', 'cooldown', 'an immediate resend hits the cooldown');
select is((public.email_otp_status()->>'attemptsRemaining')::integer, 5, 'status reports five attempts');
select ok(not (public.email_otp_status() ? 'codeHash'), 'status never exposes the code hash');

select is(public.verify_email_otp('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')->>'status', 'invalid', 'a wrong code is rejected');
select is((public.verify_email_otp('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')->>'attemptsRemaining')::integer, 3, 'each wrong code consumes an attempt');

-- Another session of the same user cannot use this challenge.
set local request.jwt.claims = '{"sub":"user_otp","sid":"sess_two","role":"authenticated"}';
select is(public.verify_email_otp('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')->>'status', 'missing', 'a code is bound to its session');

set local request.jwt.claims = '{"sub":"user_otp","sid":"sess_one","role":"authenticated"}';
select is(public.verify_email_otp('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')->>'status', 'verified', 'the right code verifies');
select is(public.verify_email_otp('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')->>'status', 'missing', 'a verified code cannot be reused');

-- Lockout after five failures.
set local request.jwt.claims = '{"sub":"user_otp","sid":"sess_three","role":"authenticated"}';
select is((public.issue_email_otp('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')->>'issued')::boolean, true, 'a new session gets its own code');
select is(
  (select count(*)::integer from generate_series(1, 5) where public.verify_email_otp('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')->>'status' in ('invalid', 'locked')),
  5,
  'five wrong attempts are counted'
);
select is(public.verify_email_otp('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')->>'status', 'locked', 'the right code is refused after lockout');

-- Expiry.
reset role;
update private.email_otp_challenges set expires_at = clock_timestamp() - interval '1 second'
where user_id = 'user_otp' and session_id = 'sess_three';
set local role authenticated;
set local request.jwt.claims = '{"sub":"user_otp","sid":"sess_three","role":"authenticated"}';
select is(public.verify_email_otp('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')->>'status', 'expired', 'an expired code is refused');

-- Hourly cap: two sends so far for this user; three more sessions reach five, the sixth is refused.
set local request.jwt.claims = '{"sub":"user_otp","sid":"sess_four","role":"authenticated"}';
select is((public.issue_email_otp('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')->>'issued')::boolean, true, 'send within the hourly cap (sess_four)');
set local request.jwt.claims = '{"sub":"user_otp","sid":"sess_five","role":"authenticated"}';
select is((public.issue_email_otp('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')->>'issued')::boolean, true, 'send within the hourly cap (sess_five)');
set local request.jwt.claims = '{"sub":"user_otp","sid":"sess_six","role":"authenticated"}';
select is((public.issue_email_otp('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')->>'issued')::boolean, true, 'send within the hourly cap (sess_six)');
set local request.jwt.claims = '{"sub":"user_otp","sid":"sess_seven","role":"authenticated"}';
select is(public.issue_email_otp('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')->>'reason', 'rate_limited', 'the hourly send cap holds across sessions');

reset role;
set local role anon;
set local request.jwt.claims = '{}';
select throws_ok($$select public.issue_email_otp('aaaa')$$, '42501', null, 'anonymous callers cannot issue codes');

reset role;
select ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'private'
      and table_name in ('email_otp_challenges', 'email_otp_sends')
      and grantee in ('anon', 'authenticated')
  ),
  'OTP tables are not directly granted to API roles'
);

select * from finish();
rollback;
