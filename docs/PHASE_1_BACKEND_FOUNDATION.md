# Rein — Phase 1 backend foundation

Completed: October 21, 2026 (Asia/Manila).

## Outcome

The shared Next.js application now has a tested server-side foundation for future Route Handlers. The local Supabase development stack is initialized, running, reachable, and clean according to the baseline database linter. No product endpoints or application schema tables were added in this phase.

## Backend-owned modules

| Module | Responsibility |
| --- | --- |
| `frontend/src/lib/validation/env.ts` | Pure Zod schema for required Clerk and Supabase environment values, with actionable configuration errors |
| `frontend/src/lib/server/env.ts` | Lazy, cached, server-only access to validated environment values |
| `frontend/src/lib/server/auth.ts` | Requires a verified Clerk server session and exposes its user ID/token getter |
| `frontend/src/lib/server/database.ts` | Creates a non-persistent Supabase client using the Clerk session token |
| `frontend/src/lib/server/request.ts` | Enforces JSON content type, byte limits, parsing, strict schema validation, and field errors |
| `frontend/src/lib/server/api-error.ts` | Defines contract error codes and prevents unexpected error details from leaking |
| `frontend/src/lib/server/response.ts` | Creates private, non-cacheable API success and no-content responses |

`server-only` import guards protect these modules from accidental Client Component imports. Vitest replaces that guard only inside its Node test environment.

## Environment contract

`frontend/.env.example` lists the required variable names:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Real values belong in ignored `.env.local` files or the deployment platform's secret store. The environment is validated only when backend code needs it, allowing static tooling to run before external projects are configured. Missing or invalid values identify the affected keys without printing their contents.

## Development commands

From `frontend/`:

```text
npm run lint
npm run typecheck
npm test
npm run build:webpack
```

From `backend/`:

```text
npm run db:start
npm run db:status
npm run db:lint
npm run db:test
npm run db:diff
npm run migration:new -- <name>
npm run db:reset
npm run db:stop
```

The local stack is intentionally unlinked from a hosted Supabase project. Its API is on port 54321, PostgreSQL is on 54322, and Studio is on 54323 according to `backend/supabase/config.toml`. Use `npm run db:status` to obtain current local development values; do not copy secret/service-role output into tracked files.

## Verification evidence

- 9 focused unit tests passed across environment parsing, safe error responses, and bounded JSON request validation.
- TypeScript completed with no errors.
- ESLint completed with no errors.
- `next build --webpack` completed and generated the scaffolded routes.
- The production dependency audit previously reported zero known vulnerabilities after Clerk installation.
- The local Supabase stack started successfully.
- `supabase db lint` reported no errors in the baseline `public` and `extensions` schemas.

The ordinary Turbopack build remains affected by the previously recorded Windows worker issue; the Webpack verification build is the documented fallback.

## Deferred external configuration

Clerk application keys and its domain have not been created or inserted. Consequently, the Clerk CLI integration, Next.js `proxy.ts`, `ClerkProvider`, and Supabase Clerk third-party provider remain Phase 3 work coordinated with Claude Code. The database client foundation already uses Clerk's token-access pattern and will become operational once that trust configuration exists.

## Next phase

Phase 2 adds versioned PostgreSQL migrations, ownership-aware constraints, versioning triggers, indexes, row-level policies based on the Clerk token subject, and repeatable development seed/test data.
