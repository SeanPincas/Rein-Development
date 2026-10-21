begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select has_column('public', 'tools', 'is_favorite', 'tools have a favorite flag');
select col_type_is('public', 'tools', 'is_favorite', 'boolean', 'favorite flag is boolean');

insert into public.categories (id, user_id, name, icon_key)
values ('52000000-0000-4000-8000-000000000001', 'user_favorites', 'Tools', 'general');

insert into public.tools (id, user_id, category_id, name, url, normalized_url, hostname, description, is_favorite, created_at)
values
  ('53000000-0000-4000-8000-000000000001', 'user_favorites', '52000000-0000-4000-8000-000000000001', 'Regular', 'https://example.com/regular', 'https://example.com/regular', 'example.com', 'Regular tool.', false, '2026-01-02'),
  ('53000000-0000-4000-8000-000000000002', 'user_favorites', '52000000-0000-4000-8000-000000000001', 'Favorite', 'https://example.com/favorite', 'https://example.com/favorite', 'example.com', 'Favorite tool.', true, '2026-01-01');

set local role authenticated;
set local request.jwt.claims = '{"sub":"user_favorites","role":"authenticated"}';

select is(public.get_library() #>> '{categories,0,tools,0,name}', 'Favorite', 'favorites sort before regular tools');
select is(public.get_library() #>> '{categories,0,tools,0,isFavorite}', 'true', 'favorite state is returned');

update public.tools set is_favorite = true where id = '53000000-0000-4000-8000-000000000001';
select is((select version::integer from public.tools where id = '53000000-0000-4000-8000-000000000001'), 2, 'favorite update uses the version trigger');
select is((select is_favorite from public.tools where id = '53000000-0000-4000-8000-000000000001'), true, 'favorite update persists for the owner');

select * from finish();
rollback;
