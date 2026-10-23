# Deployment Context — Rein

Prepared October 23, 2026 for the deployment session. This file is the single starting point for taking Rein from local development to a live production site. Read it together with `README.md` (status and decision log), `docs/API_CONTRACT.md`, `docs/DOCKER.md`, and `docs/PHASE_7_RELEASE_READINESS.md`.

**Staging is live (Oct 24, 2026): https://rein-development.vercel.app** — Vercel project `rein-development` (Hobby), deploys `main` from `frontend/`, Clerk development keys, Supabase "Rein Development". Verified live: landing page, sign-in + Rein email code (Brevo), add/edit tool with logo matching, new category. Production (own domain, Clerk production instance, separate database) is not done yet. Checkboxes record progress; tick them as each step is verified, and add a line to the README decision log for every decision.

## Where things stand

| Area | State |
| --- | --- |
| App | Next.js 16.4 (App Router, `cacheComponents`, `output: "standalone"`), React 19, Tailwind v4, one app in `frontend/` that serves both pages and API routes |
| Auth | Clerk 7, **development** instance "Rein Development"; email sign-up with Clerk codes, plus Rein's own post-sign-in email OTP (`/verify-email`, `rein_email_verified` cookie) |
| Database | Supabase Postgres with RLS and Clerk as third-party auth. The current hosted project is used for development. All migrations through `20261022110000_tool_icon_slug` are pushed |
| Email | Clerk `email.created` webhook → `/api/webhooks/clerk/email` → Brevo. Working in development only |
| Icons | Simple Icons, generated into `public/brand-icons/` by `scripts/build-brand-icons.mjs` on `predev` / `prebuild`. No favicon fetching |
| Containers | Root `Dockerfile` (standalone build, Node 22 Alpine). `docker-compose.yml` and `docker-compose.dev.yml` are the **development** setup (hot reload); `docker-compose.prod.yml` builds and runs the production image on port 3001 |
| Repo | `github.com/SeanPincas/Rein-Development`; a large set of frontend changes is still **uncommitted** |

Ownership stays as before: Codex owns database, migrations and API routes; Claude Code owns the frontend; the account owner (Sean) does every dashboard, DNS, billing and secret step, because those need account access.

## Phase 0 — Decisions to make first

| Decision | Options | Recommendation |
| --- | --- | --- |
| Hosting | **A. Vercel** (native Next.js, Git-push deploys, previews, instant rollback) · **B. Docker host** (Render, Railway, Fly.io, or a VPS + Caddy) using the existing `Dockerfile` | **A. Vercel** for the first release: least setup, and `cacheComponents` / API routes work without extra config. Keep the Docker path working for self-hosting later. Note: Vercel's free Hobby plan is for non-commercial use; check current plan terms and limits |
| Domain | Any registrar (Cloudflare, Namecheap, Porkbun, …) | **Required.** A Clerk production instance only runs on a domain you own (it needs DNS records on it), and Brevo needs it for a trusted sender. Example: `rein.dev`-style apex for the app |
| Supabase | Reuse the current hosted project · create a separate production project | **Separate production project**, so development data and experiments never touch real users. Note: free-tier projects pause after a period of inactivity and have limited backups; check the current plan before go-live |
| Brevo sender | Shared/free sender address · authenticated domain sender | **Domain sender** (e.g. `no-reply@<domain>`) with SPF/DKIM/DMARC, so verification codes don't land in spam |
| Sign-in methods | Email + code only (current) · add Google | Keep what development uses (email + code; Google was connected in the account UI). Decide before configuring the production instance |
| Password minimum | Clerk dashboard setting | 8 characters (requested Oct 23; confirm it's set in the development instance) and mirror it in production |

Record the choices here:

- [x] Hosting: **Vercel** (decided Oct 24, 2026)
- [ ] Domain: **staging first, domain later** — go live on the `*.vercel.app` URL with the Clerk **development** instance (shows the "Development mode" banner), then buy a domain and do Phase 3 for the production Clerk instance (app URL `https://__________`)
- [x] Supabase for staging: **reuse "Rein Development"** (`jpqrudfcnaoxwskchprf`), decided Oct 24, 2026 — the free plan's two project slots are taken (MMPoultryFarm is a client's live project: never pause or touch it). Create a separate production database when going fully live (Pro plan, or a freed slot)
- [ ] Brevo sender: decide with the domain (staging keeps the development sender)
- [x] Branch: merge `dev` into `main`; Vercel deploys `main`

## Phase 1 — Code freeze and local verification

Goal: a clean, committed `main` that builds the same way the host will build it.

- [ ] On Windows in `frontend/`: `npm install` (adds `simple-icons` to `package-lock.json`; production builds use `npm ci`, which fails without it).
- [ ] `npm run typecheck`, `npm test -- --run`, `npm run lint` all pass on Windows (Vitest cannot start in the Linux agent shell; Windows is the source of truth for tests).
- [ ] `npm run build` passes (Turbopack). This also runs `prebuild`, so `public/brand-icons/` (3,466 SVGs + `index.json` + `catalog.json`) must be generated without errors.
- [ ] Production image check: `docker compose -f docker-compose.prod.yml up --build`, open `http://localhost:3001`, sign in, add a tool.
- [ ] Database tests: start local Supabase (`npm run db:start` in `backend/`), then `npm run db:test`, including the not-yet-run `009_category_order.test.sql` and `010_tool_icon_slug.test.sql`.
- [ ] Finish Phase 7 checks 5–6 (`docs/PHASE_7_RELEASE_READINESS.md`): two-account isolation and the failure cases (duplicate URL/category, stale version, cross-origin write, expired session, rate limit).
- [ ] Review and commit all pending work in small, labelled commits; push to GitHub. Confirm `.env.local` and `public/brand-icons/` are **not** committed (both are git-ignored).
- [ ] Update `docs/DOCKER.md`: it still calls `docker-compose.yml` the production-style file; it is now the development setup and `docker-compose.prod.yml` is production.
- [ ] Optional cleanup: `frontend/src/components/landing/library-sketch.tsx` is no longer used (the hero is now a screenshot).

- [x] Clerk `createRouteMatcher` deprecation resolved (Oct 24, 2026): page access checks moved into the pages (`src/lib/server/page-guards.ts`); `proxy.ts` is plain `clerkMiddleware()`.

## Phase 2 — Production database (Supabase)

- [ ] Create the production project (region close to the expected users and to the host region; e.g. Singapore for the Philippines).
- [ ] Save the database password in a password manager.
- [ ] From `backend/`: `npx supabase link --project-ref <prod-ref>` then `npx supabase db push`. Confirm with `npx supabase migration list` that Local and Remote match, through `20261022110000`.
- [ ] Enable Clerk as the third-party auth provider for this project, using the **production** Clerk instance domain (done after Phase 3 creates it; come back to this step).
- [ ] Note the project URL and publishable key for `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Check the backup plan and do one restore drill before real users arrive (Phase 7 requires a tested restore).
- [ ] Re-link the CLI to the development project afterwards (`npx supabase link --project-ref <dev-ref>`) so later pushes don't go to production by accident.

## Phase 3 — Authentication (Clerk production instance)

- [ ] In the Clerk dashboard, create the **Production** instance for the Rein application and enter the app domain.
- [ ] Add the DNS records Clerk lists (frontend API and account portal CNAMEs, and email records) at the registrar; wait for Clerk to show them verified.
- [ ] Mirror development settings: email address + verification code sign-up, the same social providers (if any), password minimum 8, and sign-in/up paths `/sign-in` and `/sign-up` with the app's existing redirects (sign-in → `/verify-email` → `/library`).
- [ ] For each social provider, create production OAuth credentials (Clerk's shared dev credentials don't work in production).
- [ ] Copy the production keys (`pk_live_…`, `sk_live_…`) for the host's environment variables.
- [ ] Return to Phase 2 and connect the Supabase third-party auth to this instance.

## Phase 4 — Email delivery (Brevo + Clerk webhook)

- [ ] In Brevo, add and authenticate the sending domain (SPF, DKIM, DMARC records at the registrar); create the sender `no-reply@<domain>` named "Rein".
- [ ] Create a production Brevo API key (separate from development).
- [ ] In the Clerk production instance, add a webhook endpoint `https://<domain>/api/webhooks/clerk/email` subscribed to `email.created`; copy its signing secret for `CLERK_WEBHOOK_SIGNING_SECRET`.
- [ ] Set the email templates Rein delivers itself to not be delivered by Clerk, matching the development configuration, so users don't get two emails.
- [ ] The endpoint must be reachable publicly, so finish this right after the first deploy (Phase 5) and send a test event from the Clerk dashboard.

## Phase 5 — Hosting and first deploy

Production environment variables (set in the host's secret store, never in Git; names from `frontend/.env.example`):

| Variable | Production value |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk production `pk_live_…` (also needed at **build** time) |
| `CLERK_SECRET_KEY` | Clerk production `sk_live_…` |
| `APP_ORIGIN` | `https://<domain>`, exact origin, no trailing slash; mutations from any other origin are rejected |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production Supabase project |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | Production Brevo key and authenticated sender |
| `CLERK_WEBHOOK_SIGNING_SECRET` | From the production webhook endpoint |
| `EMAIL_OTP_SECRET` | New random secret, e.g. `openssl rand -base64 32` (don't derive from the Clerk key in production) |
| `METADATA_TOKEN_SECRET` | New random secret, generated the same way |

### Option A — Vercel

- [ ] Import `SeanPincas/Rein-Development`; set **Root Directory** to `frontend`; framework Next.js; build command `npm run build` (runs `prebuild`, which generates brand icons); Node 22.
- [ ] Add all variables above to Production (and separate development values to Preview if previews are used).
- [ ] Deploy, then add the custom domain and its DNS records; confirm HTTPS.
- [ ] Set the function region near the Supabase region.
- [ ] `output: "standalone"` stays for Docker; Vercel ignores it.

### Option B — Docker host

- [ ] Build with the root `Dockerfile`; pass `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` at build time (the Dockerfile reads it from the `frontend_env` build secret, see `docker-compose.prod.yml`).
- [ ] Provide runtime variables through the platform's secret store; container listens on `PORT=3000`, `HOSTNAME=0.0.0.0`.
- [ ] Terminate TLS in front of it (platform-managed, or Caddy on a VPS) and point the domain at it.
- [ ] Tag each image (e.g. by Git commit) so rollback is "run the previous tag".

## Phase 6 — Production verification (smoke test)

Run on the live domain, desktop and phone:

- [ ] Landing page loads; hero image, wordmark animation, footer links (GitHub, Facebook) work.
- [ ] Sign up with a new email → Clerk code → Rein email OTP arrives via Brevo (check spam placement) → `/library` opens.
- [ ] Sign out / sign in again; the verified-email cookie is respected.
- [ ] Starter categories appear once; create, edit, delete a category (with tool reassignment).
- [ ] Add a tool (logo matched from the domain, picker search, "Use fallback"), edit it, change its icon, delete it; favorite ordering (favorites first, A→Z).
- [ ] Rearrange categories on desktop (drag + keyboard) and on a phone (rearrange dialog); order persists after reload.
- [ ] Search by tool name and URL; ⌘K; phone full-width search.
- [ ] Account settings modal (profile, security, delete-account zone) on desktop and phone.
- [ ] Two separate accounts cannot see each other's data.
- [ ] Brand icons load from `/brand-icons/` (network tab: no 404s).
- [ ] Server logs show request IDs and safe error codes only; no secrets, emails, codes or tokens.

## Phase 7 — Go-live and operations

- [ ] Rollback plan: Vercel "Instant Rollback" to the previous deployment, or the previous Docker image tag. Database changes are forward-only: fix with a new timestamped migration, never edit an applied one; restore from backup only for data loss.
- [ ] Migration routine for future changes: run against local Supabase and `npm run db:test` → push to development → verify → `npx supabase link` to production → `npx supabase db push` → re-link to development.
- [ ] Record the deployed commit and migration version in the README decision log for every release.
- [ ] Basic monitoring: host error alerts and uptime checks on `/` and `/sign-in`; watch the Brevo sending dashboard for bounces.
- [ ] Keep secrets rotated if anyone else ever gets access; regenerate `EMAIL_OTP_SECRET` / `METADATA_TOKEN_SECRET` only with a planned sign-out of active sessions.

## Starting tomorrow's session

1. Fill in the Phase 0 decision lines above (hosting, domain, Supabase project, sender).
2. Run Phase 1 on Windows and commit; paste any failing command output into the session.
3. Work through Phases 2 → 3 → 5 → 4 (the webhook needs a live URL) → 6, ticking boxes here as each step is verified.
