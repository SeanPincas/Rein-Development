# Rein — Phase 3 authentication and request handling

Started: October 21, 2026 (Asia/Manila).

Status: backend implementation complete and verified. Live Clerk application and Supabase trust activation are retained as environment integration work.

## Implemented backend behavior

- `frontend/src/proxy.ts` installs Clerk middleware for Next.js 16 and covers application, API, and Clerk frontend API routes while excluding static assets.
- `requireAuthenticatedSession()` awaits Clerk's server `auth()` result, rejects missing users, and also rejects sessions that cannot provide a token.
- The server Supabase client injects the current Clerk session token through `accessToken`, disables browser session persistence, and exposes the verified Clerk user ID as request context.
- `handleAuthenticatedApiRequest()` is the protected Route Handler entry point for later product routes. It applies origin protection before resolving authentication/database context.
- POST, PUT, PATCH, and DELETE require an `Origin` header matching `APP_ORIGIN`. Reads do not require an Origin header.
- Redirect validation accepts relative or same-origin destinations and rejects external, protocol-relative, credential-bearing, backslash-based, and malformed destinations.
- Every wrapped response receives `Cache-Control: private, no-store` and `X-Request-Id`.
- Structured logs contain request ID, method, pathname, status, rounded duration, and a safe error code/type. Query strings, tokens, cookies, bodies, descriptions, and raw unexpected error messages are excluded.
- JSON content type, byte limits, parsing, strict Zod validation, and safe error envelopes remain centralized from Phase 1.

The proxy supplies Clerk request state but is not treated as the authorization boundary. Each protected API route must use the authenticated route wrapper, which verifies the session close to the data access.

## Environment contract

`frontend/.env.example` now includes:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
APP_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`APP_ORIGIN` must be one HTTP(S) origin with no path, query, fragment, or credentials. Secrets belong only in ignored `.env.local` files or the deployment secret store.

## Verification evidence

- Vitest: 6 files, 30 tests, all passed.
- TypeScript: passed.
- ESLint: passed.
- Next.js Webpack production build: passed and emitted `ƒ Proxy (Middleware)`.

The tests cover missing Clerk users, unavailable tokens, Clerk token injection into Supabase, same-origin and cross-origin requests, unsafe redirects, private headers, request IDs, unauthenticated error mapping, and removal of query/private error content from logs.

## External configuration required to finish Phase 3

1. Choose an existing Clerk application or initialize a new development application.
2. Store its publishable and secret keys in ignored local environment configuration.
3. Activate Clerk's native Supabase integration and obtain the Clerk instance domain.
4. Add Clerk as a third-party provider in the hosted Supabase dashboard. For local Supabase, set `[auth.third_party.clerk] enabled = true` and its real domain in `backend/supabase/config.toml` only after the domain is known.
5. Have Claude Code place `ClerkProvider` inside the root layout body and add visible sign-in/sign-up/user controls, preserving frontend ownership.
6. Run signed-in integration checks with two Clerk accounts to prove token acceptance and RLS isolation through the real HTTP/API path.

The legacy Clerk Supabase JWT template is not part of this design. Rein uses the native third-party integration and the ordinary Clerk session token.
