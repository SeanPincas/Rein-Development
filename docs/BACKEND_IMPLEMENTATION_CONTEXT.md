# Rein — backend implementation context

Last updated: October 22, 2026 (Asia/Manila).

**Status: Phases 0–6 complete. Phase 7 authentication/OTP integration is implemented; live two-account acceptance checks remain.**

This is the step-by-step execution reference for Codex's database and backend work. Read it with [README.md](../README.md) and the [project plan](PROJECT_PLAN.md). Checkboxes represent work to perform, not features already built. The user requested this context file before implementation.

## 1. Ownership and confirmed stack

- **Codex:** database schema, migrations, access policies, server-side session handling, endpoints, validation, business rules, data flows, transactions, metadata discovery, necessary calculations, and backend verification.
- **Claude Code:** frontend pages, components, forms, styling, themes, client interactions, and consumption of the API.
- **Shared boundary:** documented request/response types, authentication expectations, validation rules, error codes, and example payloads.
- **Confirmed backend:** Next.js Route Handlers with TypeScript on Node.js.
- **Confirmed database and accounts:** PostgreSQL hosted by Supabase, with Clerk authentication through `@clerk/nextjs` and Supabase's native Clerk third-party auth integration.
- Clerk development authentication, native Supabase trust, and Brevo signed email delivery are configured. Production hosting and sender/domain configuration are not finalized.

Do not create frontend screens as part of this backend track. Inspect the workspace before each phase; Claude Code may have added the Next.js foundation. Reuse existing configuration and coordinate changes to shared files rather than reinitializing or overwriting the project.

## 2. Backend responsibilities

The backend must let an authenticated user save, read, edit, and delete tools; create and manage categories; and persist a selected bundled Simple Icons brand for each tool. Website metadata remains optional enrichment. All records are private to their owner. A tool belongs to exactly one category in the first release.

The principal flows are:

```text
Read: session -> owned categories/tools -> library response
Save: session -> validate -> normalize -> transaction -> saved record
Edit: session -> owner/version check -> validate -> atomic update
Delete category: session -> owner/version check -> reassign -> delete atomically
Metadata: session -> rate limit -> safe public fetch -> suggestions or fallback
Favorite: session -> owner/version check -> update is_favorite -> library priority order
```

Website metadata is optional enrichment. A valid tool must remain saveable when the target site is unreachable or metadata lookup fails. Never trust a client-submitted owner ID, normalized URL, hostname, metadata status, arbitrary icon URL, or unvalidated icon slug as authoritative server data. The server accepts only the constrained lowercase slug format; the frontend catalogue is the source of available brand choices.

## 3. Phase tracker and dependencies

| Phase | Deliverable | Depends on | Status |
| --- | --- | --- | --- |
| 0 | Inspect workspace and define integration contract | Existing planning documents | Complete |
| 1 | Backend foundation and local configuration | Phase 0 | Complete |
| 2 | Schema, migrations, constraints, and ownership policies | Phase 1 | Complete |
| 3 | Verified sessions and common request/error handling | Phases 1–2 | Complete — live environment activation moves to integration |
| 4 | Category and tool operations with transactional rules | Phases 2–3 | Complete |
| 5 | Library read model and derived counts | Phase 4 | Complete |
| 6 | Safe metadata and icon discovery | Phases 3–4 | Complete |
| 7 | Backend integration and release readiness | Phases 0–6 | In progress — OTP complete; two-account and production checks remain |

Claude Code can work from the Phase 0 contract and fixtures while database work continues. Update a phase to complete only when its completion checks pass. Record a partial phase honestly if external configuration or another dependency is missing.

## 4. Phase 0 — establish the contract

### Steps

1. [x] Read current project documents, repository instructions, and any frontend code or dependency configuration added since this file was written.
2. [x] Inventory available runtimes, package manager, Supabase tooling, and local database options without modifying unrelated configuration.
3. [x] Resolve remaining contract-affecting choices. Clerk is the authentication provider, and a short description is required as specified in the original Add Tool flow.
4. [x] Write `docs/API_CONTRACT.md` with endpoint methods, payloads, field lengths, response envelopes, authentication/cookie behavior, errors, and example fixtures for Claude Code.
5. [x] Choose a consistent response field convention, date encoding, and version precondition. Prefer an integer `version` for concurrency; document it on categories and tools before implementation.
6. [x] Define deterministic category/tool ordering, duplicate URL normalization, and delete/reassignment behavior.
7. [x] Document the metadata-to-save handoff so the client cannot persist unvalidated remote image destinations.

### Proposed endpoint inventory

| Endpoint | Responsibility |
| --- | --- |
| GET /api/library | Read owned categories and tools, including category counts |
| POST /api/categories | Create a category |
| PATCH /api/categories/:id | Rename or change icon, using a version precondition |
| PATCH /api/categories/order | Persist the complete owner-scoped category order atomically |
| DELETE /api/categories/:id | Delete; require reassignment when populated |
| POST /api/tools | Create a tool; optionally create its category in the same transaction |
| PATCH /api/tools/:id | Edit fields or category, using a version precondition |
| DELETE /api/tools/:id | Delete an owned tool with documented concurrency behavior |
| POST /api/metadata | Retrieve best-effort title, description, and icon suggestions |

Category order is stored as owner-scoped `sort_order` and exposed as `sortOrder`. Reordering uses `PATCH /api/categories/order` with the complete ordered list and updates all rows in one transaction. Tool favorites are stored as the owner-scoped boolean `is_favorite` and exposed as `isFavorite`. A favorite update uses `PATCH /api/tools/:id` with `{ "isFavorite": true|false, "version": n }`; it is atomic and rejects stale versions. `GET /api/library` returns categories in saved order and favorites first within each category.

Document DELETE request encoding explicitly rather than assuming every client sends a JSON body. Clerk owns sign-in/sign-up/session routes; product API routes use Clerk's verified server-side session and do not implement a second auth flow.

**Completion check:** the contract has examples for normal, empty, invalid, unauthenticated, duplicate, not-found, stale-edit, throttled, and service-failure responses. Frontend work can use fixtures without a live backend. Backend implementation is not required to complete this phase.

## 5. Phase 1 — backend foundation

### Steps

1. [x] Inspect the current app foundation. If absent, establish only the minimum Next.js/TypeScript setup needed for backend routes; preserve Claude Code's frontend ownership.
2. [x] Select compatible dependency versions using current official documentation at implementation time. Reuse the workspace package manager and lockfile.
3. [x] Create server-only modules for environment validation, database clients, session verification, validation, and error mapping.
4. [x] Add `.env.example` with required variable names and safe placeholders; keep actual values in ignored local environment files.
5. [x] Set up a reproducible development database: local Supabase if supported, or a separate development Supabase project. Keep testing isolated from production.
6. [x] Add commands for backend type checks, relevant tests, migrations, and an application build when the shared app is available.
7. [x] Record setup instructions and any missing external configuration. Do not invent credentials or claim an unconnected database is working.

**Completion check:** the backend configuration loads, missing settings produce actionable errors, secrets are excluded from client imports, and the documented development workflow can reach its designated database. If provisioning is unavailable, distinguish completed local preparation from the pending connection check.

## 6. Phase 2 — database schema and ownership

### Steps

1. [x] Add versioned SQL migrations under `supabase/migrations/`.
2. [x] Define `categories`: UUID id, text Clerk user_id, name, normalized_name, icon_key, sort_order, version, created_at, updated_at.
3. [x] Define `tools`: UUID id, text Clerk user_id, category_id, name, original URL, normalized_url, hostname, description, icon_url, icon_status, icon_slug, version, created_at, updated_at.
4. [x] Use Clerk as the only application identity store. Do not create credentials or duplicate Clerk user records in PostgreSQL unless a later profile feature requires synchronized data.
5. [x] Add required fields, limits, allowed icon status values, and unique constraints for owner/category-name and owner/normalized-URL.
6. [x] Enforce category ownership in the database with `(category_id, user_id)` referencing the category's unique `(id, user_id)` key.
7. [x] Define UTC timestamps, automatic version increments, and immutable ids, ownership fields, and creation timestamps.
8. [x] Restrict direct deletion of categories that still contain tools. Account deletion will use a verified Clerk webhook and privileged idempotent cleanup in a later phase.
9. [x] Add owner-scoped indexes for the library and category queries.
10. [x] Enable row-level security with operation-specific policies and minimum grants for `authenticated`; `anon` receives no table grants.
11. [x] Add repeatable development seed data containing two isolated mock Clerk subjects and no credentials.

Proposed validation limits carried from the plan: tool name 100 characters, category name 50, description 280, URL 2048. Validate consistency between application and SQL limits, including Unicode length behavior.

**Completion check:** migrations replay successfully on a clean development database. Tests using anonymous and two authenticated identities prove isolation and reject cross-owner category references, duplicate keys, invalid values, and ownership transfers. Test through actual user-scoped access, not only a privileged service connection.

## 7. Phase 3 — authentication and common request handling

### Steps

1. [x] Added Clerk's Next.js 16 `src/proxy.ts`, `ClerkProvider`, visible auth controls, and the mandatory `/verify-email` flow.
2. [x] Verify identity for protected Route Handlers through the shared authenticated wrapper using Clerk's async server-side `auth()` flow; never trust a cookie or submitted user ID directly.
3. [x] Create user-scoped Supabase clients whose access token comes from the verified Clerk session. The hosted project uses Clerk's native third-party provider/domain integration.
4. [x] Centralize payload parsing, schema validation, content-type checks, request size limits, and safe errors.
5. [x] Protect cookie-authenticated mutations with an exact configured-origin check and reject unsafe redirect destinations.
6. [x] Apply `private, no-store` and request identifiers to all responses from the shared route wrapper.
7. [x] Add structured operational logging containing method, pathname, status, duration, and safe error classification without query strings, tokens, cookies, payloads, or raw error messages.

**Completion check:** invalid/expired sessions fail consistently; user-scoped requests work; cross-site mutations and unsafe auth redirects fail; errors do not leak secrets or other accounts' record existence. Coordinate browser sign-in UI requirements through the contract rather than implementing screens.

## 8. Phase 4 — category and tool operations

### Steps

1. [x] Implement shared normalization and validation, including canonical category whitespace.
2. [x] Parse HTTP/HTTPS tool URLs, preserve meaningful destination parts, normalize hostname/default ports, and reject credentials and unsupported schemes.
3. [x] Establish the shared Heroicons-backed stable icon catalogue, database allowlist, and category create/update behavior.
4. [x] Implement tool creation under an owned existing category.
5. [x] Implement optional inline category creation plus tool creation in one database transaction.
6. [x] Implement edits with atomic version predicates and automatic database version increments.
7. [x] Map duplicate constraints to recoverable API errors without leaking another account's records.
8. [x] Implement tool deletion with version/conflict behavior.
9. [x] Implement populated-category deletion as atomic tool reassignment plus deletion.
10. [x] Lock category records during reassignment so concurrent references cannot create orphans.
11. [x] Use restricted security-invoker RPC functions with empty search paths and authenticated-only execution grants.

**Completion check:** valid CRUD works; duplicate requests/concurrent saves preserve uniqueness; failed transactions roll back; stale edits are rejected; invalid category reassignment preserves all original records. An unrelated account receives no private data.

## 9. Phase 5 — library reads and necessary calculations

### Steps

1. [x] Implement the owned library response with stable category/tool ordering and ID tie-breakers.
2. [x] Include empty categories.
3. [x] Derive category and total counts from owned tools.
4. [x] Build the complete response in one stable PostgreSQL function snapshot.
5. [x] Check the local query plan and avoid per-category application queries.
6. [x] Document refresh behavior in the API contract; browser mechanics remain with Claude Code.
7. [x] Return the complete first-release library for frontend search/filtering without silent truncation.

No complex calculations are currently needed. Do not persist counters that can drift when a reliable query can derive them. Any later ranking, usage tracking, or analytics requires its own feature definition.

**Completion check:** zero-state, multi-category, deleted/reassigned-tool, and concurrent-change cases return correct records and counts. Library responses remain private and refresh reliably across sessions.

## 10. Phase 6 — safe metadata and icon discovery

### Steps

1. [x] Implement a separate authenticated metadata endpoint. It does not create or edit bookmarks.
2. [x] Add user/IP rate limiting backed by a private PostgreSQL table and atomic RPC; an in-memory limiter is not used.
3. [x] Validate schemes, ports, credentials, DNS answers, IPv4/IPv6 addresses, redirects, and icon destinations. Block private, loopback, link-local, and reserved addresses.
4. [x] Use a Node HTTP(S) transport whose custom lookup is pinned to validated addresses while retaining the original hostname for TLS verification. The implementation does not perform an unrestricted fetch after a DNS pre-check.
5. [x] Enforce a 5-second total budget, 3 redirects, 1 MB decompressed HTML, 512 KB per icon, 2 MB compressed body, 1-second DNS work, 8 icon candidates, and bounded text parsing.
6. [x] Parse HTML without running remote scripts. Extract title/description as plain text. Icon selection is handled by the bundled Simple Icons catalogue rather than remote favicon fetching.
7. [x] Validate image content type and destination. Open Graph images are not considered, and file extensions are not trusted.
8. [x] Finalize the Phase 0 save handoff: issue a signed, short-lived result bound to the authenticated user and exact source URL. Manually saving without metadata remains valid.
9. [x] On tool URL edits, clear or replace stale icon data. Ignore untrusted client claims that metadata was verified.
10. [x] Return explicit ready/fallback/unavailable states and bounded suggestions. The server never overwrites user-entered name or description fields from a suggestion.
11. [x] Keep metadata discovery bounded and avoid caching or logging private page responses. No target cookies or credentials are used; brand SVGs are served from the local catalogue.
12. [x] Document frontend expectations: URL-response correlation, editable suggestions, image error fallback, and no-referrer icon loading. Claude Code implements that behavior.

Simple Icons handoff: the Add Tool flow may submit `iconSlug` with a lowercase kebab-case brand slug. The database stores this in `tools.icon_slug`, forces `icon_status` to `ready`, and clears legacy `icon_url`. The library response returns `iconSlug`; the frontend renders the matching local SVG and falls back to hostname matching or a letter tile when the field is null.

**Completion check:** deterministic fixtures cover successful icons, relative links, redirects, missing metadata, timeouts, oversized/decompression responses, unsafe addresses, DNS rebinding attempts, and stale source URLs. Lookup failure never blocks valid manual saves. Limit real public-network smoke checks to what is needed after fixture tests pass.

## 11. Phase 7 — integration and release readiness

### Steps

1. [x] Compare implemented routes against `docs/API_CONTRACT.md` and update examples to match verified behavior.
2. [x] Run focused backend tests, type checks, migrations on a clean database, and the shared application build when available.
3. [ ] Verify the complete backend journey: sign in, pass the email OTP, create category/tool, read library, edit, reassign, delete, and sign out.
4. [ ] Verify two-account isolation and cross-browser/session persistence using a development environment.
5. [ ] Exercise duplicate saves, stale updates, database outages, metadata outages, OTP expiry/lockout, and session expiry without silent data loss.
6. [x] Prepare an integration handoff for Claude Code: endpoint examples, types, errors, auth flow, icon fallback behavior, and known limitations.
7. [x] Document required environment names, callback origins, migration order, rollback/forward-fix strategy, logging, and database backup/restore expectations for the selected host.
8. [x] Review production configuration separately when hosting is selected. Record deployment status accurately; preparing instructions does not mean the app is deployed.

**Completion check:** all required backend acceptance checks have evidence, the frontend contract matches the implementation, and remaining external dependencies are explicitly recorded. Frontend visual/accessibility acceptance belongs to Claude Code's track.

### Email OTP integration (October 21, 2026)

- Migration `20261021090000_email_otp.sql` is applied locally and to the hosted Supabase project. It creates private `email_otp_challenges` and `email_otp_sends` tables plus security-definer RPCs `issue_email_otp`, `verify_email_otp`, and `email_otp_status` bound to JWT `sub` + `sid`. pgTAP file `007_email_otp.test.sql` passes; the full local suite is 7 files and 82 assertions.
- Server: `src/lib/server/email-verification.ts` (code generation, HMAC hashing, signed cookie), `src/lib/server/email-otp.ts` (Clerk email lookup, Brevo send, RPC calls), routes under `src/app/api/verification/email/`.
- `handleAuthenticatedApiRequest` now refuses unverified sessions with `EMAIL_UNVERIFIED` unless `requireVerifiedEmail: false`. `AuthenticatedSession`/`DatabaseContext` gained `sessionId`.
- The Clerk-to-Brevo webhook remains responsible for Clerk's own emails; Rein's post-authentication OTP is sent directly through Brevo by `email-otp.ts`.
- Required runtime values: keep Brevo sender variables set and optionally set a separate `EMAIL_OTP_SECRET`; otherwise the HMAC derives from `CLERK_SECRET_KEY`.

## 12. Session handoff record

Update this section after each implementation session:

- **Current phase:** Phase 7 integration and release readiness.
- **Completed:** Phases 4–6, the owner-scoped `/api/library` endpoint, metadata/icon discovery, Clerk/Supabase integration, Brevo delivery, and mandatory post-authentication email OTP.
- **Tests/checks:** frontend tests pass (65 tests), frontend typecheck passes, local Supabase tests pass (7 pgTAP files and 82 assertions), hosted migration `20261021090000` is applied, and the production build passes.
- **Pending external integration:** two-account authenticated journey, complete failure matrix, permanent public deployment, production Clerk/Brevo configuration, and backup/restore drill.
- **Immediate next action:** run the complete authenticated journey and failure matrix from `docs/PHASE_7_RELEASE_READINESS.md`, then record evidence before production deployment.

For each later phase, record actual commands/check outcomes, unresolved failures, migration identifiers, contract changes, and the next concrete task. Never place secrets or real user data in this log.
