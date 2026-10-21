# Claude Code Frontend Context — Rein

## Project purpose

Rein is a personal developer-tool library. Users save technical websites, design resources, courses, deployment services, databases, AI tools, and similar references. Saved tools belong to categories and are displayed in a three-column staggered bento layout with blueprint-style grid lines and dark/light themes.

## Ownership boundary

Claude Code owns the visible frontend and interaction experience:

- Next.js App Router pages and components
- Clerk provider and authentication controls
- Dark/light blueprint theme and responsive three-column staggered bento layout
- Category and tool cards, forms, dialogs, loading states, empty states, and optimistic refreshes
- Heroicons through the shared icon library
- Sonner toast presentation

Codex owns the backend boundary:

- Next.js Route Handlers under `frontend/src/app/api/`
- Server-only authentication, Supabase access, validation, error mapping, metadata discovery, and rate limiting
- Supabase migrations, RLS policies, transactions, and pgTAP tests

Do not replace server authentication with client-supplied user IDs. Do not call Supabase directly from browser components for library mutations; use the API routes.

## Current authentication and database setup

The Clerk development application is **Rein Development**. Email sign-up and email verification codes are enabled; email links, phone, username, and social providers are disabled for the initial flow.

The Clerk native Supabase integration is active, and the hosted Rein Supabase project accepts Clerk as a third-party auth provider. The tested migrations have been pushed to the hosted project.

Local credentials live only in the ignored file `frontend/.env.local`. Never commit or display its values. The required variable names are documented in `frontend/.env.example`:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `APP_ORIGIN`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The root layout still needs the visible Clerk integration. Add `ClerkProvider` inside `<body>` and add the chosen sign-in, sign-up, and signed-in user controls without replacing the existing metadata or global theme setup.

## API integration

The authoritative contract is `docs/API_CONTRACT.md`. Implement the frontend against these routes:

- `GET/POST /api/categories`
- `PATCH/DELETE /api/categories/:id`
- `GET /api/library`
- `POST /api/metadata`
- `GET/POST /api/tools`
- `PATCH/DELETE /api/tools/:id`

Every mutation must include the current same-origin request behavior. The API derives the Clerk user from the server session. Handle stable response codes rather than raw exception text:

- `UNAUTHENTICATED`: prompt sign-in or redirect to the auth UI
- `VALIDATION_ERROR`: show field-level messages
- `DUPLICATE_CATEGORY`, `DUPLICATE_TOOL_URL`, `STALE_VERSION`, `CATEGORY_NOT_EMPTY`: show a clear Sonner toast and refresh the affected data
- `UNSAFE_URL`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`: show a safe retry/action toast
- `ORIGIN_FORBIDDEN`, `INTERNAL_ERROR`: show a generic failure toast

## Add Tool flow

The Add Tool form must collect:

- URL
- Tool/site name
- Category
- Short description

After a valid URL is entered, call `POST /api/metadata` and correlate the response to the exact URL that produced it. Metadata is an editable suggestion, never an authoritative overwrite. Display the suggested title, description, icon URL, and status when available.

When saving, submit `metadataToken` only if it belongs to the exact unchanged URL. If metadata discovery fails, allow manual save. Remote icons must use `referrerPolicy="no-referrer"`, have a visual fallback, and never block saving.

## Library behavior

Use `GET /api/library` for the owner-scoped nested read model. Render empty categories and derived tool counts. Preserve each record's `version` in edit/delete requests for optimistic concurrency. After a mutation, refresh the library snapshot or update it consistently with the returned record.

Categories can be created, edited, and deleted. A populated category deletion requires reassignment according to the API contract. Keep category icon selection within the shared Heroicons catalogue.

## UI requirements

- Blueprint grid background with accessible contrast in both themes
- Rounded bento cards arranged in a three-column staggered/stair-step pattern
- Responsive layout that collapses cleanly on smaller screens
- Clear keyboard focus states and usable labels
- Authenticated and unauthenticated states must be obvious
- Loading, empty, validation, conflict, rate-limit, and service-failure states must be intentional
- Do not expose server keys, raw database errors, session tokens, metadata fetch contents, or verification codes

## Verification

From `frontend/` run:

```powershell
npm test -- --run
npm run typecheck
npm run lint
npm run build:webpack
```

Then run `npm run dev`, create a Clerk development user with an email verification code, and verify:

1. Signed-out users see the auth entry point.
2. A signed-in user can load the empty library.
3. A user can create a category and tool, edit them, reassign a tool, and delete them.
4. Duplicate, stale-version, invalid, metadata, and rate-limit responses become safe field messages or Sonner toasts.
5. A second Clerk user cannot see or mutate the first user’s categories or tools.
6. Signing out clears private library content from the visible UI.

Do not commit `frontend/.env.local`, Supabase passwords, Clerk secret keys, Brevo keys, webhook secrets, or generated build/dependency folders.
