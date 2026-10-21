# Rein — API contract (Phase 0 draft)

Contract version: `2026-10-21-draft.7`.

This document is the integration boundary between the backend owned by Codex and the frontend owned by Claude Code. Category, tool, library, metadata, and post-authentication email OTP route contracts are implemented. Development Clerk/Supabase/Brevo integration is active; production hosting remains an integration task.

## Conventions

- Base path: `/api` on the same origin as the Next.js application.
- Content type: JSON request and response bodies unless stated otherwise.
- Authentication: Clerk session cookies verified with `@clerk/nextjs/server`. API routes call Clerk's server-side auth helper, require a valid `userId`, and never accept `userId` from the client.
- Dates: UTC ISO 8601 strings, for example `2026-10-21T08:30:00.000Z`.
- Category and tool IDs: UUID strings. Internal owner IDs are Clerk user ID strings and are never exposed as editable API fields.
- Concurrency: mutable records expose an integer `version`, beginning at 1. PATCH and DELETE operations require the last version observed by the client.
- Unknown request properties are rejected. Server-side validation remains authoritative.
- Private responses use `Cache-Control: private, no-store`.
- Mutations require an `Origin` header exactly matching the configured application origin, in addition to the authenticated session. Missing, malformed, and cross-origin values return `ORIGIN_FORBIDDEN`.
- Every API response includes `X-Request-Id`; successful and failed private responses use `Cache-Control: private, no-store`.
- Authentication return destinations may be relative or same-origin URLs. External, protocol-relative, credential-bearing, and malformed destinations are rejected.

### Success envelope

```json
{
  "data": {},
  "requestId": "01J..."
}
```

Collection responses may include a `meta` object. A successful DELETE returns HTTP 204 with no body.

### Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields need attention.",
    "fields": {
      "name": ["Name is required."]
    }
  },
  "requestId": "01J..."
}
```

Messages are safe for display but frontend copy may map from `code`. `fields` is present only for field-specific validation. Do not infer whether another account owns a requested record.

### Toast and feedback policy

The frontend uses Sonner for transient notifications. Toasts are derived from API outcomes; there is no toast endpoint, database table, or backend toast state.

- Show a success toast after confirmed create, update, reassignment, or deletion.
- Keep field validation beside the affected form control. Do not replace actionable field errors with a toast.
- Use warning/error toasts for duplicates, stale versions, category reassignment requirements, network failures, and service failures.
- Do not show a success toast for ordinary library loading or background refresh.
- A request ID may appear in expandable error details or a copy action for support, but should not dominate the message.
- Deduplicate repeated failures and keep important recovery actions available after the toast disappears.
- Toast copy maps from stable `error.code` values. Never display raw database, authentication, or exception messages.

## Shared resource shapes

```ts
type Category = {
  id: string;
  name: string;
  iconKey: CategoryIconKey;
  toolCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type Tool = {
  id: string;
  categoryId: string;
  name: string;
  url: string;
  hostname: string;
  description: string;
  iconUrl: string | null;
  iconStatus: "ready" | "fallback" | "unavailable";
  version: number;
  createdAt: string;
  updatedAt: string;
};
```

Internal fields such as `user_id`, normalized names/URLs, signing data, and database policy details are never returned.

## Field rules

| Field | Rules |
| --- | --- |
| Category name | Trimmed; internal whitespace collapsed; 1–50 characters; case-insensitively unique per user |
| Category icon key | One of the stable keys exported by `src/lib/shared/icon-library.ts`; rendered with Heroicons |
| Tool name | Trimmed; 1–100 characters |
| Tool URL | Absolute HTTP/HTTPS URL; at most 2048 characters; no embedded credentials |
| Description | Required and trimmed; 1–280 characters |
| Version | Positive integer matching the record most recently read by the client |

Duplicate detection normalizes hostname casing, removes default ports, and treats an empty root path as `/`. It preserves path case, meaningful trailing slashes, query strings, and fragments. Different meaningful paths on one domain remain saveable.

The initial `CategoryIconKey` catalogue is: `general`, `icon-libraries`, `motion`, `deployment`, `databases`, `courses`, `ui-reference`, `ai-agents`, `planning`, `developer-tools`, `code`, `terminal`, `cloud`, `packages`, `experiments`, `documentation`, `ideas`, `integrations`, `design`, `security`, `analytics`, and `performance`. API clients submit the stable key, never a Heroicons component name.

## Library

### `GET /api/library`

Returns every owned category, including empty categories, with nested tools. Categories sort by normalized name then ID. Tools sort newest first then ID. First-release search/filtering happens over this complete response in the frontend; the backend must not silently truncate it.

```json
{
  "data": {
    "categories": [
      {
        "id": "d6f93d61-7b02-4bb0-858c-901f7075a5e7",
        "name": "Icon Libraries",
        "iconKey": "icon-libraries",
        "toolCount": 1,
        "version": 1,
        "createdAt": "2026-10-21T08:00:00.000Z",
        "updatedAt": "2026-10-21T08:00:00.000Z",
        "tools": [
          {
            "id": "fe0a02e4-2616-4736-8b03-77794c56f94a",
            "categoryId": "d6f93d61-7b02-4bb0-858c-901f7075a5e7",
            "name": "Example Icons",
            "url": "https://example.com/icons",
            "hostname": "example.com",
            "description": "A searchable icon library.",
            "iconUrl": null,
            "iconStatus": "fallback",
            "version": 1,
            "createdAt": "2026-10-21T08:10:00.000Z",
            "updatedAt": "2026-10-21T08:10:00.000Z"
          }
        ]
      }
    ]
  },
  "meta": { "categoryCount": 1, "toolCount": 1 },
  "requestId": "01J..."
}
```

The empty state returns `categories: []` and zero counts with HTTP 200.

## Metadata discovery

### `POST /api/metadata`

This authenticated, same-origin endpoint discovers optional suggestions for the Add Tool form. It never creates or edits a saved tool.

Request:

```json
{ "url": "https://example.com/docs" }
```

Success returns HTTP 200 with a short-lived, opaque handoff token:

```json
{
  "data": {
    "metadata": {
      "sourceUrl": "https://example.com/docs",
      "finalUrl": "https://example.com/docs/",
      "title": "Example Documentation",
      "description": "Documentation for the example service.",
      "iconUrl": "https://example.com/favicon.ico",
      "iconStatus": "ready",
      "metadataToken": "opaque.signed.value"
    }
  },
  "requestId": "01J..."
}
```

`title` and `description` are editable suggestions. `iconStatus` is `ready` when a validated raster image was found, `fallback` when the lookup succeeded but no usable icon was found, and `unavailable` when the page response was not usable. The frontend must correlate the response with the URL that initiated it and discard a response after the URL changes. Icon `<img>` elements should use `referrerPolicy="no-referrer"` and always provide an initial/fallback visual when the remote image fails to load.

The server validates every redirect and DNS answer, blocks private/loopback/link-local/reserved destinations, permits only HTTP(S) on the matching default port, sends no target cookies or credentials, and bounds the total request budget, redirects, HTML bytes, decompressed bytes, icon candidates, and icon bytes. The endpoint is rate-limited by authenticated user and request address through the database-backed `consume_metadata_rate_limit` function. It returns `UNSAFE_URL`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, or a safe generic error when discovery cannot proceed.

The frontend may submit `metadataToken` with `POST /api/tools` or a URL-changing `PATCH /api/tools/:id`. The backend verifies the token signature, expiry, authenticated user, and exact source URL before accepting its icon result. Missing, expired, mismatched, or tampered tokens do not block a valid manual save; the tool is stored with `iconStatus: "fallback"` and no client-supplied icon URL is trusted.

## Categories

### `POST /api/categories`

```json
{ "name": "Deployment Sites", "iconKey": "deployment" }
```

Returns HTTP 201 with `{ "data": { "category": Category }, "requestId": "..." }`.

### `PATCH /api/categories/:id`

At least one mutable field is required.

```json
{ "name": "Deployment", "iconKey": "cloud", "version": 1 }
```

Returns HTTP 200 with the updated category. A version mismatch returns `STALE_VERSION` (409) and no update.

### `DELETE /api/categories/:id?version=1&reassignTo=<uuid>`

- `version` is required.
- `reassignTo` is omitted only when the category is empty.
- For a populated category it must identify another category owned by the user.
- Tool reassignment and source deletion occur atomically.

Returns HTTP 204. Invalid/missing reassignment returns `CATEGORY_NOT_EMPTY` (409); a stale source returns `STALE_VERSION` (409).

## Tools

### `POST /api/tools`

Use exactly one category form.

```json
{
  "name": "Example Icons",
  "url": "https://example.com/icons",
  "description": "A searchable icon library.",
  "category": { "id": "d6f93d61-7b02-4bb0-858c-901f7075a5e7" },
  "metadataToken": "optional-opaque-token"
}
```

Inline category creation is transactional:

```json
{
  "name": "Example Icons",
  "url": "https://example.com/icons",
  "description": "A searchable icon library.",
  "category": {
    "create": { "name": "Icon Libraries", "iconKey": "icon-libraries" }
  },
  "metadataToken": "optional-opaque-token"
}
```

Returns HTTP 201 with both resources:

```json
{
  "data": {
    "tool": {},
    "category": {},
    "categoryCreated": true
  },
  "requestId": "01J..."
}
```

When `metadataToken` is absent or invalid/expired, valid manual fields remain saveable and the icon falls back. The server does not accept an arbitrary `iconUrl` from this request.

### `PATCH /api/tools/:id`

At least one mutable field is required. Omitted fields remain unchanged.

```json
{
  "name": "Example Icons Pro",
  "categoryId": "b091dbab-f8de-4e4b-b52a-28c3d149a891",
  "version": 1
}
```

Changing `url` without a valid metadata token clears stale discovered icon data to fallback. Returns HTTP 200 with the updated tool. Version conflicts return `STALE_VERSION` (409).

### `DELETE /api/tools/:id?version=1`

Returns HTTP 204. A stale record returns `STALE_VERSION` (409).

## Email verification (post-sign-in code)

Every Clerk sign-in and sign-up is followed by a mandatory email code. Clerk redirects to `/verify-email`; `proxy.ts` sends signed-out users to `/sign-in`, keeps unverified users out of `/library`, and sends already-verified users from `/verify-email` to `/library`.

**Private API routes** (`/api/library`, `/api/categories*`, `/api/tools*`, `/api/metadata`) return `EMAIL_UNVERIFIED` (403) until the current Clerk session is verified. Only the three routes below run before verification.

Rules: six random digits generated on the server; only an HMAC (keyed with a server secret, bound to the Clerk user ID and session ID) is stored; codes expire after 10 minutes, allow 5 attempts, are single use; resend at most once per 60 seconds per session and 5 times per hour per user. The code is never returned by any endpoint. Success sets the `rein_email_verified` cookie (HttpOnly, SameSite=Lax, Secure on HTTPS, 7 days) signed and bound to the same user and session. A new sign-in is a new Clerk session and must verify again.

### `GET /api/verification/email/status`

```json
{
  "data": {
    "verified": false,
    "verification": {
      "sentTo": "se••@example.com",
      "pending": true,
      "expired": false,
      "expiresAt": "2026-10-21T15:10:00.000Z",
      "resendAvailableAt": "2026-10-21T15:01:00.000Z",
      "attemptsRemaining": 5
    }
  },
  "requestId": "01J..."
}
```

`pending: false` means no code has been issued for this session yet.

### `POST /api/verification/email/send`

No body. Issues a new code (replacing any previous one for this session) and emails it through Brevo. Returns `{ "data": { "verification": … } }` with the same shape as above. `RATE_LIMITED` (429, `details.retryAfterSeconds`, `Retry-After`) for the cooldown or hourly cap; `SERVICE_UNAVAILABLE` (503) if the database or Brevo fails.

### `POST /api/verification/email/verify`

```json
{ "code": "123456" }
```

Success: HTTP 200 `{ "data": { "verified": true, "redirectTo": "/library" } }` plus `Set-Cookie`. Failures: `VALIDATION_ERROR` (422) for a malformed code; `INVALID_CODE` (422, `details.attemptsRemaining`); `CODE_EXPIRED` (422) when expired, missing or already used; `TOO_MANY_ATTEMPTS` (429) after five wrong codes. Request a new code after the last two.

## Error catalogue

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | INVALID_JSON | Request body is not valid JSON |
| 400 | INVALID_REQUEST | Wrong content type, unknown properties, or malformed request |
| 401 | UNAUTHENTICATED | No valid session |
| 403 | ORIGIN_FORBIDDEN | Mutation did not come from an allowed origin |
| 404 | NOT_FOUND | Owned resource not found; also used for foreign-owned IDs |
| 409 | DUPLICATE_CATEGORY | The user already has the normalized category name |
| 409 | DUPLICATE_TOOL_URL | The user already saved the normalized URL |
| 409 | STALE_VERSION | Another request changed or deleted the resource |
| 403 | EMAIL_UNVERIFIED | Signed in, but this session has not passed the email code |
| 409 | CATEGORY_NOT_EMPTY | Reassignment is required before category deletion |
| 422 | VALIDATION_ERROR | One or more fields violate the contract |
| 422 | UNSAFE_URL | URL is syntactically valid but prohibited for server fetching |
| 422 | INVALID_CODE | Email code is wrong; `details.attemptsRemaining` |
| 422 | CODE_EXPIRED | Email code expired, missing or already used |
| 429 | RATE_LIMITED | Too many metadata requests or email code sends |
| 429 | TOO_MANY_ATTEMPTS | Five wrong email codes; request a new one |
| 500 | INTERNAL_ERROR | Unexpected server failure with no sensitive details |
| 503 | SERVICE_UNAVAILABLE | Required database/auth service is temporarily unavailable |

## Representative failures

Unauthenticated:

```json
{
  "error": { "code": "UNAUTHENTICATED", "message": "Sign in to continue." },
  "requestId": "01J..."
}
```

Duplicate owned URL:

```json
{
  "error": {
    "code": "DUPLICATE_TOOL_URL",
    "message": "This URL is already in your library."
  },
  "requestId": "01J..."
}
```

Stale edit:

```json
{
  "error": {
    "code": "STALE_VERSION",
    "message": "This item changed elsewhere. Refresh it and try again."
  },
  "requestId": "01J..."
}
```

Service failure:

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "The library is temporarily unavailable. Try again."
  },
  "requestId": "01J..."
}
```

## Contract change process

Codex updates this file before or with backend behavior changes. Breaking changes require coordination with Claude Code and a new contract version. Shared TypeScript schemas/types may later be generated from the server validation schemas, but this document remains the human-readable contract.
