begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

set local role authenticated;
set local request.jwt.claims = '{"sub":"user_order_a","role":"authenticated"}';

insert into public.categories (name, icon_key) values ('Alpha', 'general'), ('Bravo', 'code'), ('Charlie', 'design');

select is(
  (select array_agg(name order by sort_order) from public.categories),
  array['Alpha', 'Bravo', 'Charlie'],
  'new categories get sequential sort orders'
);

select is(
  public.reorder_categories((
    select jsonb_agg(jsonb_build_object('id', id, 'sort_order', pos))
    from (
      select id, row_number() over (order by case name when 'Charlie' then 1 when 'Alpha' then 2 else 3 end) as pos
      from public.categories
    ) ordered
  )),
  3,
  'a complete reorder updates every category'
);

select is(
  (select array_agg(c->>'name' order by ord)
   from jsonb_array_elements(public.get_library()->'categories') with ordinality as t(c, ord)),
  array['Charlie', 'Alpha', 'Bravo'],
  'the library read model returns the new order'
);

select throws_ok(
  format(
    $$select public.reorder_categories('[{"id":"%s","sort_order":1}]'::jsonb)$$,
    (select id from public.categories where name = 'Alpha')
  ),
  '22023',
  null,
  'a partial order is rejected'
);

select throws_ok(
  $$select public.reorder_categories('{"not":"an array"}'::jsonb)$$,
  '22023',
  null,
  'a non-array payload is rejected'
);

-- Another user cannot reorder (or see) the first user's categories.
set local request.jwt.claims = '{"sub":"user_order_b","role":"authenticated"}';
select throws_ok(
  format(
    $$select public.reorder_categories('[{"id":"%s","sort_order":1}]'::jsonb)$$,
    (select id from public.categories limit 1)
  ),
  '22023',
  null,
  'a user with no categories cannot submit another user''s ids'
);

reset role;
set local role anon;
set local request.jwt.claims = '{}';
select throws_ok(
  $$select public.reorder_categories('[]'::jsonb)$$,
  '42501',
  null,
  'anonymous callers cannot reorder categories'
);

reset role;
select * from finish();
rollback;
