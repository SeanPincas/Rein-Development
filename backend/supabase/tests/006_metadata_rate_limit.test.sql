begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

set local role authenticated;
set local request.jwt.claims = '{"sub":"user_metadata_limit","role":"authenticated"}';

select is(
  (public.consume_metadata_rate_limit('198.51.100.10')->>'allowed')::boolean,
  true,
  'an authenticated subject may start a metadata window'
);
select is(
  (select count(*)::integer
   from generate_series(1, 19) as n
   where (public.consume_metadata_rate_limit('198.51.100.10')->>'allowed')::boolean),
  19,
  'the user limit permits twenty requests in a window'
);
select is(
  (public.consume_metadata_rate_limit('198.51.100.10')->>'allowed')::boolean,
  false,
  'the user limit rejects the next request'
);
select is(
  (public.consume_metadata_rate_limit('198.51.100.11')->>'allowed')::boolean,
  false,
  'a different IP does not bypass the authenticated user limit'
);

reset role;
set local role anon;
set local request.jwt.claims = '{}';
select throws_ok(
  $$select public.consume_metadata_rate_limit('198.51.100.12')$$,
  '42501',
  null,
  'anonymous callers cannot execute the rate-limit function'
);

select ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'private'
      and table_name = 'metadata_rate_limits'
      and grantee in ('anon', 'authenticated')
  ),
  'rate-limit counters are not directly granted to API roles'
);

reset role;
select * from finish();
rollback;
