insert into public.categories (id, user_id, name, icon_key)
values
  ('10000000-0000-4000-8000-000000000001', 'user_seed_alice', 'Icon Libraries', 'icon-libraries'),
  ('10000000-0000-4000-8000-000000000002', 'user_seed_alice', 'Deployment', 'deployment'),
  ('20000000-0000-4000-8000-000000000001', 'user_seed_bob', 'Courses', 'courses')
on conflict do nothing;

insert into public.tools (
  id,
  user_id,
  category_id,
  name,
  url,
  normalized_url,
  hostname,
  description,
  icon_status
)
values
  (
    '11000000-0000-4000-8000-000000000001',
    'user_seed_alice',
    '10000000-0000-4000-8000-000000000001',
    'Example Icons',
    'https://example.com/icons',
    'https://example.com/icons',
    'example.com',
    'A seeded icon-library example.',
    'fallback'
  ),
  (
    '21000000-0000-4000-8000-000000000001',
    'user_seed_bob',
    '20000000-0000-4000-8000-000000000001',
    'Example Course',
    'https://example.org/course',
    'https://example.org/course',
    'example.org',
    'A seeded course example.',
    'unavailable'
  )
on conflict do nothing;
