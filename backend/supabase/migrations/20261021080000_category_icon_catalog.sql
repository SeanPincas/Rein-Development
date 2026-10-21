alter table public.categories
  drop constraint categories_icon_key_format;

alter table public.categories
  add constraint categories_icon_key_catalog check (
    icon_key = any (array[
      'general', 'icon-libraries', 'motion', 'deployment', 'databases',
      'courses', 'ui-reference', 'ai-agents', 'planning', 'developer-tools',
      'code', 'terminal', 'cloud', 'packages', 'experiments',
      'documentation', 'ideas', 'integrations', 'design', 'security',
      'analytics', 'performance'
    ]::text[])
  );

comment on column public.categories.icon_key is
  'Stable application key from the shared Heroicons-backed category icon catalogue.';
