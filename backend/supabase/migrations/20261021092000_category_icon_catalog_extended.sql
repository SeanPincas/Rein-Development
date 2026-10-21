-- Extend the category icon catalogue from 22 to 48 keys.
-- Keep in sync with frontend/src/lib/shared/icon-library.ts.

alter table public.categories
  drop constraint categories_icon_key_catalog;

alter table public.categories
  add constraint categories_icon_key_catalog check (
    icon_key = any (array[
      'general', 'icon-libraries', 'motion', 'deployment', 'databases',
      'courses', 'ui-reference', 'ai-agents', 'planning', 'developer-tools',
      'code', 'terminal', 'cloud', 'packages', 'experiments',
      'documentation', 'ideas', 'integrations', 'design', 'security',
      'analytics', 'performance', 'typography', 'apis', 'team',
      'communication', 'video', 'media', 'audio', 'web',
      'servers', 'mobile', 'desktop', 'productivity', 'favorites',
      'bookmarks', 'testing', 'auth', 'payments', 'ecommerce',
      'news', 'components', 'utilities', 'data-viz', 'maps',
      'email', 'careers', 'trending'
    ]::text[])
  );
