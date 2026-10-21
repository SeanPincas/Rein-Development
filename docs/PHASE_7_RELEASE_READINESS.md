# Phase 7 — integration and release readiness

Status: authentication and custom email OTP delivery are integrated and verified. Two-account browser isolation, full failure-case exercise, and production operations remain.

## Verified locally

- The implemented route set is `/api/categories`, `/api/categories/:id`, `/api/library`, `/api/metadata`, `/api/tools`, and `/api/tools/:id`.
- All mutations require the configured same-origin `Origin` header and all protected handlers obtain the authenticated Clerk subject server-side.
- `npm test` passes 50 frontend unit fixtures, including the public `429` response and `Retry-After` contract.
- `npm run typecheck` and `npm run lint` pass.
- `npm run build:webpack` passes and emits all six dynamic API routes.
- `npm run db:lint` reports no schema errors.
- `npm run db:reset -- --no-seed` replays migrations in timestamp order.
- `npm run db:test` passes 6 pgTAP files and 63 assertions, including RLS isolation, transactional reassignment, library reads, and metadata rate limiting.
- The email OTP migration (`20261021090000_email_otp.sql`) is applied to the hosted Supabase project.
- Local database tests pass 7 pgTAP files and 82 assertions, including OTP expiry, single-use, attempt limits, resend cooldown, and session binding.
- Clerk email OTP delivery through the signed webhook and Brevo has been exercised successfully with the development application.

## External activation checklist

1. ~~Create or select the Clerk development application and configure its keys.~~ Complete.
2. ~~Enable the intended Clerk sign-in methods and configure development origins and redirects.~~ Complete.
3. ~~Activate Clerk's native Supabase third-party integration.~~ Complete.
4. ~~Verify sign-up/sign-in/sign-out and the mandatory Rein email OTP flow.~~ Complete.
5. Using two separate Clerk accounts, create categories and tools, read the library, edit and reassign records, delete records, and confirm neither account can observe the other's rows.
6. Exercise duplicate URL, duplicate category, stale version, invalid category reassignment, malformed JSON, cross-origin mutation, expired session, metadata timeout, unsafe URL, and rate-limit responses. Confirm the frontend maps stable error codes to field errors or Sonner toasts without displaying raw exceptions.
7. ~~Configure Brevo sender delivery and the signed Clerk `email.created` webhook.~~ Complete for development. A public production endpoint and production sender/domain remain required before release.

## Environment and operations

Required application values are listed in `frontend/.env.example`: Clerk keys, `APP_ORIGIN`, and Supabase URL/publishable key. `METADATA_TOKEN_SECRET` is optional and should be set to a separate random secret in production. Brevo and Clerk webhook secrets are required only when custom verification-email delivery is activated.

Apply Supabase migrations in filename order. Forward fixes should use a new timestamped migration; do not edit an applied migration. Roll back by restoring a known database backup or applying a compensating forward migration after reviewing dependent data. The Phase 6 migration adds the private `metadata_rate_limits` table and the `consume_metadata_rate_limit` RPC; the icon-handoff migration replaces the old seven-argument transactional function with the backward-call-compatible nine-argument function.

Application logs contain request ID, method, pathname, status, duration, and safe error code/type only. They must not contain URLs with credentials, request bodies, verification codes, target HTML, private metadata, API keys, webhook secrets, or session tokens. Keep database backups encrypted, access-controlled, and tested with a restore drill before production use. Retain migration files and record the deployed migration version.

Hosting, domain, TLS, Clerk production instance, Supabase production project, Brevo sender/domain, and backup retention are intentionally not marked deployed. Preparing this checklist is not a deployment claim.

## Claude Code handoff

Claude Code owns the provider and visible auth controls, Add Tool form, optimistic UI, and responsive presentation. The backend contract is in `docs/API_CONTRACT.md`. The metadata response is URL-correlated and editable; `metadataToken` is submitted only with the matching tool URL. Remote icons use `referrerPolicy="no-referrer"` and must have a fallback visual. Manual save remains available when metadata discovery fails. Toasts are derived from stable response codes; no backend toast state exists.
