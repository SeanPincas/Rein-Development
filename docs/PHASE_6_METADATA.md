# Phase 6 — metadata and site-icon discovery

Status: backend implementation complete and verified locally; live Clerk/Supabase configuration and public-network smoke checks remain deployment work.

The authenticated `POST /api/metadata` Route Handler discovers optional title, description, and icon suggestions without creating a saved tool. It uses a Node HTTP(S) transport with a custom DNS lookup pinned to validated public addresses, preserves the requested hostname for TLS verification, follows at most three redirects, and revalidates every destination.

The fetch budget is five seconds total, one second for DNS, 2 MB compressed response bytes, 1 MB decompressed HTML, and 512 KB per icon. HTML is treated as text only: scripts, styles, comments, and noscript blocks are removed before bounded title/description extraction. Only declared icon links and `/favicon.ico` are considered. Raster image content types are checked from the response; SVG and Open Graph images are excluded.

The endpoint calls the database-backed `consume_metadata_rate_limit` RPC. Each authenticated Clerk subject receives 20 requests per five-minute window, and each request-address key receives 60. Counters are private, atomically updated, and never directly exposed to API roles. The route remains authenticated and same-origin, returns private no-store responses, and emits `Retry-After` for 429 responses.

Successful discovery issues a ten-minute HMAC-signed handoff token bound to the authenticated Clerk subject and exact submitted URL. Tool create and URL-changing update routes verify that token before accepting only the validated icon result. Missing, expired, mismatched, or tampered tokens cannot block a valid manual save and cannot supply an arbitrary client icon URL. Tool URL changes clear stale icon data when no valid handoff exists.

Only validated public icon URLs are cached in a bounded in-process cache keyed by source origin for one hour. Page HTML, titles, descriptions, target cookies, credentials, and private discovery results are never cached or logged.

## Verification

- `npm test`: 49 frontend unit tests passed, including private-address blocking, HTML fixture parsing, relative icons, redirects, fallback states, decompression limits, and token tampering/expiry.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build:webpack`: passed with network access; the generated route list includes `/api/metadata`.
- `npm run db:lint`: passed with no schema errors.
- `npm run db:reset -- --no-seed`: replayed all migrations, including the Phase 6 rate-limit and icon handoff migrations.
- `npm run db:test`: 6 pgTAP files and 63 assertions passed.

## External activation

Copy `frontend/.env.example` to an ignored `.env.local`. Existing Clerk and Supabase values are required for the authenticated route. `METADATA_TOKEN_SECRET` is optional; when absent, the server derives the handoff signing key from `CLERK_SECRET_KEY`. Do not place secrets in this document or commit `.env.local`.

Claude Code should correlate metadata responses with the initiating URL, keep suggestions editable, show fallback/unavailable icon states, use `referrerPolicy="no-referrer"` for remote icon images, and allow manual saving when discovery fails.
