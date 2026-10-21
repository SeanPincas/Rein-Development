# Rein — project context

Last updated: October 21, 2026 (Asia/Manila).

This README is the main context file for continuing the project in future work sessions. Keep confirmed decisions, implementation status, and next steps current here. The [detailed project plan](docs/PROJECT_PLAN.md) contains the fuller product, design, and backend specifications.

## Purpose

Rein is a personal library for saving and organizing developer tools, technology websites, design resources, courses, and planning references.

It solves the problem of forgetting a useful website's name or where its link was saved, and switching between browsers to search different bookmark collections. Users should be able to save a resource once, find it by name or purpose, and access the same library across browsers and devices.

**Rein is the working name**, taken from the project folder. Final branding is still open.

## Current status

- Planning documents are saved.
- The user confirmed personal accounts with cloud sync.
- The user confirmed that each bento box contains a category and its saved tools.
- The Next.js application, backend foundation, local Supabase stack, and initial PostgreSQL schema are operational. Phase 3's local authentication/request layer is verified; live Clerk/Supabase trust configuration, product endpoints, and deployment remain pending.
- The technology stack is confirmed: Next.js, React, TypeScript, Tailwind CSS, Clerk authentication, and PostgreSQL hosted by Supabase.
- Brevo is the selected transactional email delivery provider for Clerk verification-code messages. Clerk remains the source of truth for code generation, expiry, resend throttling, and validation.
- Heroicons is the confirmed interface/category icon source. PostgreSQL stores stable catalogue keys while Claude Code owns visual React rendering.
- Application hosting remains undecided.
- Work ownership is confirmed: Codex handles database/backend work; Claude Code handles the frontend.
- The [backend implementation context](docs/BACKEND_IMPLEMENTATION_CONTEXT.md) defines Codex's step-by-step phases. Phases 0–2 are complete.
- The [Phase 0 audit](docs/PHASE_0_AUDIT.md) records the generated structure, installed dependencies, checks, and remaining decisions.
- The [draft API contract](docs/API_CONTRACT.md) defines the frontend/backend integration boundary.
- [Phase 1](docs/PHASE_1_BACKEND_FOUNDATION.md) is complete with tested server/environment/database foundations.
- [Phase 2](docs/PHASE_2_DATABASE.md) is complete with a replayable schema migration, Clerk-subject ownership, RLS, seed data, and 40 passing database tests.
- [Phase 3](docs/PHASE_3_AUTH_REQUESTS.md) backend implementation is complete: session/token handling, Clerk proxy, request protections, private caching, request IDs, and safe logging are verified. Live application/domain activation remains integration work.
- [Phase 4](docs/PHASE_4_CRUD.md) is complete with shared validation, four mutation routes, optimistic concurrency, and transactional category/tool operations.
- [Phase 5](docs/PHASE_5_LIBRARY.md) is complete with an owner-scoped single-snapshot library endpoint, stable ordering, empty categories, and derived counts.
- Phase 6 backend metadata and site-icon discovery is complete and verified locally. Phase 7 release-readiness checks are documented; live Clerk/Supabase journey and two-account checks await development credentials. Claude Code owns Heroicons rendering, `ClerkProvider`, visible auth controls, and the rest of the frontend.
- Final queued backend phase: Phase 7 integration, full journey verification, deployment preparation, and Claude Code handoff after Phase 6 is complete.

## Frontend progress (Claude Code)

Goal: ship the visible Rein experience on top of the verified backend contract, one stage at a time.

| Stage | Deliverable | Status |
| --- | --- | --- |
| F0 | Brand: Stepped R mark, black/purple blueprint direction, logo and landing mockups | Complete |
| F1 | Landing page: tokens, blueprint grid, drifting purple glows, navbar, hero, features, categories, CTA, footer | Built — awaiting browser review |
| F2 | Auth: `ClerkProvider`, `/sign-up` and `/sign-in` pages using Clerk's card restyled to the blueprint theme, navbar account controls | Built — awaiting live sign-up test |
| F2b | Mandatory email code after every sign-in/sign-up: `/verify-email`, Brevo delivery, session-bound verified cookie, `/library` and private APIs gated | Built — awaiting migration push and live test |
| F3 | Library: staggered three-column bento grid from `GET /api/library`, six starter categories for new accounts, empty/loading/error states, search (⌘K) and category filter, refresh on refocus | Built — awaiting live test; Add Tool button disabled until F4 |
| F4 | Add/Edit Tool: form with metadata lookup, category create/rename/delete with reassignment, Sonner toasts | Not started |
| F5 | Polish and verification: light theme, keyboard and screen-reader pass, responsive review, two-account journey | Not started |

Design tokens live in `frontend/src/app/globals.css`; the Clerk theme in `frontend/src/components/auth/clerk-appearance.ts`; landing copy in `frontend/src/components/landing/content.ts`.

## Work ownership

The user assigned the following responsibilities on October 21, 2026:

| Owner | Scope |
| --- | --- |
| Codex | PostgreSQL schema and migrations, Supabase database policies, server-side authentication/session validation, backend endpoints, business rules, data flows, metadata/icon retrieval, transactions, and any necessary calculations or derived counts |
| Claude Code | Frontend components, pages, layouts, styling, blueprint background, responsive staggered cards, themes, forms, client interactions, and frontend API integration |

Codex should focus only on database and backend work unless the user explicitly changes this assignment. Frontend specifications in these documents remain product context for Claude Code.

The integration boundary is a documented API contract: request and response shapes, validation limits, authentication expectations, error codes, and example payloads. Codex maintains backend behavior and communicates contract changes through project documentation; Claude Code builds the consuming interface. Coordinate changes to shared types, dependencies, and project configuration to avoid overwriting each other's work.

No complex calculations are currently required. Add derived values such as category tool counts only when a feature needs them, with consistent definitions in the API contract.

## Confirmed design requirements

- Light and dark themes with a blueprint-style grid background.
- A navbar with a prominent **+ Add Tool** action.
- Rounded bento boxes arranged in **three staggered columns on desktop**.
- Each box represents a category and contains its saved tools.
- The user's staircase reference conveys alternating vertical offsets. The UI pattern is a **staggered bento grid**; variable-height packing can also create a masonry effect.

Proposed responsive behavior: two columns on tablet and one on mobile, with reduced or removed offsets on smaller screens. Colors, fonts, spacing, and precise offsets still need visual review.

## Core user flow

1. Sign in and open the personal library.
2. Select **+ Add Tool**.
3. Complete the form:
   - Website URL.
   - Site or tool name.
   - Category: select an existing one or create a category with a name and icon.
   - Short description.
4. The backend automatically attempts to discover the site's logo or favicon.
5. Save the tool into its category card.
6. Find and open saved resources; edit or delete them as needed.

Category examples: Icon Libraries, Motions, Animations, Deployment Sites, Database Techs, Courses, UI References, AI Agents, and Planning Tools.

## Proposed first-release behavior

These are planning recommendations, not additional user-confirmed requirements:

- Private libraries with one category per tool.
- Search by name, description, domain, or category; filter by category.
- Category renaming and icon editing.
- Reassign tools before deleting a populated category.
- Detect duplicate normalized URLs per account while allowing different paths from the same website.
- Require a short description in the first release.
- Suggest a name and description from website metadata when available; keep them editable.
- Use a fallback initial/icon if a site icon cannot be found. Metadata failure must not block saving.
- Persist changes in the cloud and refresh data on loading or refocusing the library. Instant push updates are deferred.
- Show clear empty, loading, success, validation, and error states.
- Support keyboard navigation, accessible forms, and reduced-motion preferences.

## Confirmed technology stack

The user approved this initial stack on October 21, 2026:

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React through Next.js, using TypeScript | Navbar, category cards, search, and forms |
| Styling | Tailwind CSS and CSS variables | Blueprint grid, staggered responsive layout, and light/dark themes |
| Icons | Heroicons through `@heroicons/react` | Category and interface icons selected through a shared stable-key catalogue |
| Notifications | Sonner through `sonner` | Accessible frontend toast feedback for completed actions and recoverable failures |
| Backend | Next.js Route Handlers using the Node.js runtime | Validate submissions, manage tools/categories, and retrieve site metadata and icons |
| Database | PostgreSQL hosted by Supabase | Persist each user's categories and saved tools |
| Authentication | Clerk through `@clerk/nextjs` | Sign-in, session verification, and account access across browsers and devices |
| Verification email delivery | Brevo through `@getbrevo/brevo` | Server-side transactional delivery after a verified Clerk `email.created` webhook |

The frontend and backend will live in the same project. Clerk will provide authentication and session management. Supabase will provide managed PostgreSQL, with Clerk configured as its native third-party auth provider so Clerk user IDs can be enforced through row-level security. Application hosting remains open.

## Proposed implementation details

- **Sign-in:** Clerk; enabled sign-in methods will be configured in the Clerk application rather than implemented as a custom credential system.
- **Main records:** categories and tools, each owned by an authenticated user.
- **Access control:** verified Clerk sessions plus Supabase PostgreSQL row-level security based on the Clerk token subject (`sub`) so users can access only their own records.
- **Site icons:** bounded server-side metadata discovery, with validation of destinations and redirects to prevent requests into private networks.
- **Consistency:** database constraints for duplicates and category ownership, transactional category reassignment, and stale-edit conflict handling.

The detailed plan includes data fields, endpoint responsibilities, metadata limits, and official documentation references. Consult it before implementing these systems.

## Scope boundaries

The initial focus is saving, organizing, finding, opening, editing, and deleting personal tool bookmarks.

Browser extensions, bookmark imports, public sharing, AI recommendations, nested categories, favorites, offline editing, and live collaboration are deferred. Export/import can follow the core release.

## Delivery sequence

1. Planning and context gathering — initial documents complete.
2. Visual prototype — desktop and mobile library, both themes, and Add Tool form.
3. Application foundation — chosen stack, authentication, schema, and ownership policies.
4. Core library — categories, tool CRUD, search, and cloud persistence.
5. Metadata integration — icon retrieval, editable suggestions, and reliable fallbacks.
6. Verification and deployment preparation — account isolation, cross-browser persistence, accessibility, responsive behavior, and failure recovery.

## Open decisions

- Final product name and branding.
- Application hosting and which sign-in methods to enable inside Clerk.
- Final visual tokens, card density, and stagger amount after reviewing the prototype.

## Project files

| File | Purpose |
| --- | --- |
| `README.md` | Main project context, confirmed decisions, status, and next steps |
| `docs/PROJECT_PLAN.md` | Detailed flows, design direction, architecture, data rules, milestones, and acceptance checks |
| `docs/BACKEND_IMPLEMENTATION_CONTEXT.md` | Codex's ordered backend/database phases, task checklists, dependencies, verification gates, and session handoff |
| `docs/PHASE_0_AUDIT.md` | Workspace/runtime audit, generated structure, dependency health, and setup limitations |
| `docs/API_CONTRACT.md` | Draft endpoint payloads, resource types, validation rules, errors, and examples shared with Claude Code |
| `docs/PHASE_1_BACKEND_FOUNDATION.md` | Implemented backend modules, commands, verification evidence, and deferred external configuration |
| `docs/PHASE_2_DATABASE.md` | Implemented schema, ownership constraints, RLS model, database tests, and deferred Clerk configuration |
| `docs/PHASE_3_AUTH_REQUESTS.md` | Phase 3 authentication/request infrastructure, verification evidence, and external configuration handoff |
| `docs/PHASE_4_CRUD.md` | Implemented category/tool validation, CRUD routes, concurrency rules, transactions, and verification evidence |
| `docs/PHASE_5_LIBRARY.md` | Implemented library read model, ordering/count definitions, query evidence, and frontend refresh handoff |
| `docs/PHASE_6_METADATA.md` | Implemented safe metadata/icon discovery, rate limiting, signed save handoff, cache rules, migrations, tests, and frontend handoff |
| `docs/PHASE_7_RELEASE_READINESS.md` | Phase 7 verification evidence, external Clerk/Supabase activation, operations checklist, and Claude Code handoff |
| `docs/CLAUDE_CODE_FRONTEND_CONTEXT.md` | Frontend ownership, Clerk/Supabase setup, API integration, UI behavior, metadata flow, and verification handoff for Claude Code |
| `frontend/` | Shared Next.js application: Claude Code owns frontend code; Codex owns Route Handlers and server-only backend modules |
| `backend/` | Supabase configuration, migrations, seed data, pgTAP tests, and database tooling |

## Continuity notes

- Read this file and the detailed plan before resuming work.
- For database/backend work, also read `docs/BACKEND_IMPLEMENTATION_CONTEXT.md` and update its phase tracker and session handoff as work progresses.
- Respect the work ownership above: Codex handles the database/backend; Claude Code handles the frontend.
- Keep user-confirmed requirements separate from recommendations and unresolved choices.
- Update the current status and next steps after meaningful work; mark a feature complete only when implemented and verified.
- Record material decisions here and reflect specification changes in the detailed plan.
- Add setup commands and environment-variable names once the application exists. Never store credentials or secrets in these documents.

## Decision log

| Date | Decision or event |
| --- | --- |
| October 21, 2026 | User described the developer-resource bookmarking concept and blueprint visual direction. |
| October 21, 2026 | User confirmed personal accounts with cloud sync across browsers and devices. |
| October 21, 2026 | User confirmed category cards containing saved tools in the staggered layout. |
| October 21, 2026 | Initial project plan saved; README expanded into the persistent project context file at the user's request. |
| October 21, 2026 | User approved React through Next.js with TypeScript, Tailwind CSS and CSS variables, Next.js Route Handlers on Node.js, and PostgreSQL hosted by Supabase. |
| October 21, 2026 | User assigned database, backend logic, data flows, and necessary calculations to Codex; frontend work belongs to Claude Code. |
| October 21, 2026 | Created the backend implementation context file at the user's request, before starting backend implementation. |
| October 21, 2026 | Began Phase 0: audited the workspace, created `frontend/` and `backend/`, installed baseline dependencies, initialized Supabase tooling, and drafted the API contract. |
| October 21, 2026 | User selected Clerk for authentication. Installed `@clerk/nextjs`, removed `@supabase/ssr`, and changed database ownership to Clerk user IDs with Supabase third-party auth/RLS. |
| October 21, 2026 | User selected Brevo for verification-code email delivery. Installed the official `@getbrevo/brevo` SDK; dashboard sender verification, Clerk webhook setup, and secret configuration remain manual activation steps. |
| October 21, 2026 | Began Phase 6: added authenticated metadata discovery with bounded DNS/redirect/body handling, validated icon candidates, signed user-bound handoff tokens, PostgreSQL-backed user/IP rate limiting, origin-scoped icon caching, and 63 passing pgTAP assertions after migration replay. |
| October 21, 2026 | Completed Phase 1: tested server modules and commands, started the isolated local Supabase stack, and verified the baseline database. |
| October 21, 2026 | Completed Phase 2: added and replayed the initial library schema, enforced Clerk-subject ownership and RLS, added isolated seed data, and passed all 40 pgTAP assertions. |
| October 21, 2026 | Began Phase 3: added Clerk's Next.js proxy and verified the shared authentication, user-scoped database, same-origin request, private response, request ID, and redacted logging infrastructure. Live Clerk/Supabase trust setup remains pending application selection. |
| October 21, 2026 | Began Phase 4 and selected Heroicons. Installed `@heroicons/react`, created a tested shared icon catalogue, and added a PostgreSQL allowlist migration for its stable keys. |
| October 21, 2026 | Completed Phase 4: implemented category/tool mutation routes, normalization, duplicate and stale-version handling, and authenticated atomic database transactions. |
| October 21, 2026 | Selected Sonner for frontend toast notifications. Toast rendering belongs to Claude Code; backend response codes and request IDs provide the notification inputs. |
| October 21, 2026 | Completed Phase 5: added the private single-snapshot library endpoint with empty categories, nested tools, stable ordering, and derived counts. |
| October 21, 2026 | Approved the Stepped R logo and black/purple blueprint direction. Claude Code built the landing page and Clerk-themed `/sign-up` and `/sign-in` pages (stages F0–F2). |
| October 21, 2026 | User requested a mandatory post-authentication email OTP and asked Claude Code to implement it end to end, including the backend (migration `20261021090000_email_otp`, `/api/verification/email/*`, route-handler and proxy gating). Codex should review it as part of the backend track. |
