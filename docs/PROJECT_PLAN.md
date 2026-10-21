# Rein — product and implementation plan

Planning date: October 21, 2026. This document describes proposed behavior, not an implemented application.

## 1. Purpose

Give developers one private, searchable place to save useful technology websites. A developer should be able to remember a purpose or category, find the right tool, and open it without checking bookmarks in multiple browsers.

Examples include icon libraries, motion and animation tools, deployment services, databases, courses, UI references, and AI agents.

Success means a user can save a tool quickly, find it later by name or description, and see the same library after signing in on another browser or device.

## 2. Decisions and assumptions

### Confirmed by the user

- Plan and gather context before implementing the application.
- Provide personal accounts and cloud sync.
- Use a navbar and rounded bento cards on a blueprint grid background, in light and dark themes.
- Each bento card represents a category and contains its tools.
- Use three staggered columns on desktop.
- Add Tool includes URL, site/tool name, category selection or creation with an icon, and a short description.
- Attempt automatic site logo/icon retrieval.
- Tools can be edited and deleted.
- Technology stack: React through Next.js with TypeScript, Tailwind CSS and CSS variables, Next.js Route Handlers on Node.js, Clerk authentication, and PostgreSQL hosted by Supabase (approved October 21, 2026; Clerk selected later that day).
- Work ownership: Codex handles the database, backend logic, data flows, and necessary calculations. Claude Code handles the frontend. The API contract connects their work; Codex does not implement frontend features unless the user changes this assignment.

### Proposed defaults, still adjustable

- Working name: Rein.
- Private libraries; no public profiles or shared collections in the first release.
- One category per tool initially; tags and multiple categories can follow later.
- Clerk provides authentication; the exact sign-in methods enabled in Clerk can be selected later.
- Require a name, valid URL, category, and short description when saving.
- Use curated category icons, rather than icon uploads, in the first release.
- Remember theme preference per device; use system theme on the first visit.
- Starter categories are optional suggestions, not permanent empty cards.
- Default category order is alphabetical; default tool order is newest first.

## 3. First release scope

| Capability | Expected behavior |
| --- | --- |
| Account | Sign in, sign out, and isolate each person's library |
| Library | Fetch the signed-in user's saved tools and categories |
| Add tool | Save required fields and attempt automatic icon discovery |
| Edit tool | Update URL, name, description, and category |
| Delete tool | Confirm deletion, then remove the saved entry |
| Categories | Create, rename, change icon, and delete with reassignment |
| Search | Match tool name, description, domain, and category name |
| Filter | Show all categories or one selected category |
| Open tool | Open its saved URL in a new tab |
| Themes | Light, dark, and system preference |
| Feedback | Clear loading, empty, validation, error, and retry states |

Defer browser extensions, browser bookmark import, public sharing, AI recommendations, automatic category assignment, nested categories, favorites, custom ordering, offline editing, and real-time collaboration. Export and import can be an early follow-up to improve portability.

Cloud sync in the first release means database persistence and fresh data on page load, window refocus, and successful mutation. Instant push updates between open devices are a later enhancement. Show a refreshing indicator without replacing the whole library with a loading screen.

## 4. Main user flows

### First visit

1. Sign in through the Clerk authentication flow.
2. Open the private library. If empty, show a brief explanation and **Add your first tool**.
3. Optionally select from starter category suggestions or create a category while saving.

### Add a tool

1. Select **+ Add Tool** from the navbar or empty state.
2. Open a desktop dialog, or a full-height sheet on a small screen.
3. Paste a URL. Validate it and start an authenticated, debounced metadata lookup.
4. Show a favicon/logo preview and suggest a name and description if the website supplies them.
5. The user can edit suggestions. Late lookup results must never overwrite fields the user has already edited.
6. Select an existing category, or choose **Create category**, enter its name, and select an icon.
7. Submit. If a new category is included, create it and the tool atomically so a failed save leaves no accidental empty category.
8. Close the form only after persistence succeeds, update the category card, and announce success.

Metadata lookup failure must not block saving valid manually entered fields. Disable repeated submissions while saving. Cancel closes the form; if fields changed, ask before discarding them.

### Find and open a tool

1. Type a partial name, purpose, domain, or category in search.
2. Filter matching tools within category cards, and hide cards with no matches.
3. Show matching counts and a clear-search action.
4. Select a tool's name or open action to visit its URL in a new tab, keeping Rein available.

Search should be case-insensitive. A category-name match includes all tools in that category. Search and the category filter combine, rather than silently resetting one another.

### Edit or delete a tool

- A tool row has a labeled actions menu with Edit and Delete.
- Edit opens the populated form. Changing the URL starts a new icon lookup; ignore responses for an older URL.
- Delete asks for confirmation naming the tool. Remove it after the server confirms success.
- Failed mutations retain the current entry and explain how to retry.

### Manage categories

- Each category card has an actions menu for renaming, changing its icon, or deleting it.
- Renaming preserves all tools and updates the displayed category name everywhere.
- Deleting an empty category needs confirmation only.
- Deleting a populated category requires choosing another category. Reassign tools and delete the category in one transaction.
- Do not silently delete tools when removing a category. If no alternative exists, create one first.

## 5. Design direction

### Pattern and composition

The reference image communicates alternating steps and vertical offsets. For this interface, the useful term is **a staggered, three-column bento layout**. Variable-height cards can also create a masonry effect.

Each category card contains a category icon, name, tool count, actions menu, and a vertical list of tools. Each tool row contains a site icon, name, domain, short description, and an actions menu. Keep the card hierarchy clear; avoid adding a heavy nested card around every tool.

Desktop arrangement, shown schematically:

```text
Rein             Search your tools...       Theme   + Add Tool   Account
Your toolkit     All categories / category filter

Column 1             Column 2             Column 3
+----------------+                       +----------------+
| Icon Libraries |   +----------------+  | Deployment     |
| tool           |   | Animation      |  | tool           |
| tool           |   | tool           |  | tool           |
+----------------+   | tool           |  | tool           |
                     +----------------+  +----------------+
+----------------+                       +----------------+
| Databases      |   +----------------+  | Courses        |
| tool           |   | UI References  |  | tool           |
+----------------+   | tool           |  +----------------+
                     +----------------+
```

This is a layout sketch, not a final screen. Start with a roughly 32px downward offset for the middle column and tune it in a visual prototype. All three columns stay within the same content container.

### Responsive and accessible behavior

- Large screens: exactly three columns; do not grow to four on ultrawide screens.
- Medium screens: two columns with a smaller or no offset.
- Small screens: one column without offsets; search gets its own full-width row.
- Proposed breakpoints: three columns at 1200px and above, two at 768–1199px, one below 768px. Validate actual card widths before fixing these values.
- Prefer semantic row-major DOM order with CSS Grid and measured row spans for variable heights. Validate that visual order and keyboard traversal remain understandable; avoid independent column buckets that scramble traversal.
- Keep search results in predictable order as cards change height. Avoid animated shuffling.
- Long descriptions clamp visually to two lines, with the full text available in Edit or an accessible details affordance.
- Start with naturally sized cards. For very large categories, add a clear **Show more** control instead of a small nested scrollbar.
- Use visible focus states, labeled icon buttons, dialog focus management, Escape handling, and accessible status announcements.
- Honor reduced-motion preferences and verify text contrast in both themes.

### Visual language

| Element | Proposed direction |
| --- | --- |
| Dark canvas | Deep navy, with muted blue grid lines |
| Light canvas | Pale blue-white, with restrained blue-gray grid lines |
| Grid | Fine lines around every 24px, stronger guides every four cells |
| Card surface | Mostly opaque to protect text readability from the background grid |
| Card corners | Approximately 20px radius |
| Spacing | 24px desktop gaps; 16px on compact layouts |
| Accent | Blueprint blue for primary actions and active states |
| Typography | Clear sans-serif UI; optional monospace for small technical labels |
| Decoration | Sparse drafting ticks or coordinates in noninteractive margins |
| Motion | Brief opacity/color changes; avoid decorative movement of the grid |

Treat these as initial design tokens, not final approved colors or font choices. The blueprint character should come from the background and precise spacing; everyday controls should remain familiar.

## 6. Confirmed stack and proposed architecture

The user approved TypeScript and React through Next.js for the web interface, Tailwind CSS and CSS variables for styling, Next.js Route Handlers on Node.js for backend endpoints, Clerk for authentication, and PostgreSQL hosted by Supabase for persistent data. The frontend and backend will live in the same project. This keeps the initial system compact while supporting browser-independent libraries.

Next.js provides server Route Handlers; Clerk provides verified application sessions; Supabase provides PostgreSQL and row-level security and accepts Clerk as a native third-party identity provider. The stack is confirmed; the implementation details below remain the proposed architecture. See the official [Next.js Route Handlers documentation](https://nextjs.org/docs/app/getting-started/route-handlers), [Clerk Next.js quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart), [Supabase Clerk integration](https://supabase.com/docs/guides/auth/third-party/clerk), and [Supabase row-level security documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

```text
Browser UI
  -> authenticated application endpoints
     -> Clerk session verification
     -> Supabase PostgreSQL with Clerk-backed RLS
     -> restricted server-side metadata fetcher
```

- Keep normal data operations scoped to the verified Clerk user ID, with database row-level policies checking the Clerk token subject as a second boundary.
- Server endpoints derive user identity from the verified session; never trust a submitted owner ID.
- Keep privileged service credentials server-only. Normal CRUD should use the user's scoped database session.
- Hosting selection, pricing, deployment credentials, and framework versions are implementation-stage decisions. No paid service or deployment is authorized or needed for this planning artifact.

## 7. Data model and consistency

| Entity | Fields |
| --- | --- |
| Auth user | Managed by Clerk; PostgreSQL stores only the Clerk user ID needed for ownership unless a later feature requires a profile record |
| Category | id, user_id, name, normalized_name, icon_key, version, created_at, updated_at |
| Tool | id, user_id, category_id, name, url, normalized_url, hostname, description, icon_url, icon_status, version, created_at, updated_at |

- Category and tool IDs are UUIDs. `user_id` stores Clerk's text user identifier and has no foreign key to Supabase `auth.users`. Timestamps are stored in UTC.
- Category names are unique per user after trimming, collapsing whitespace, and case normalization.
- Implemented limits: tool name 100 characters, category name 50, required description 280, URL 2048.
- category_id must reference a category belonging to the same user. Enforce this with an ownership-aware database constraint as well as application checks.
- Require authentication and owner checks on reads, inserts, updates, and deletes for both tables.
- Unique `(user_id, normalized_url)` prevents saving the exact same normalized link twice. On conflict, offer to open the existing entry for editing.
- Tools on different paths of one domain are allowed: a course page and the site's homepage can both be useful.
- Preserve the user's original URL for opening. For duplicate comparison, normalize hostname casing and default ports, and treat an empty root path as `/`. Preserve path case, query parameters, fragments, and non-root trailing slashes because they can change destinations.
- A database unique constraint resolves duplicate saves from concurrent tabs; client validation alone is insufficient.
- Reject stale edits using an updated_at/version precondition and ask the user to reload the latest entry. Do not silently overwrite changes from another device.
- Add owner/category and owner/created_at indexes. Begin with debounced in-memory search over the loaded personal library; add database search and pagination if measured library sizes justify it.

## 8. Logo and metadata retrieval

Automatic capture means **best-effort site icon discovery**, not a promise to obtain the official full-size brand logo.

1. Parse and validate the submitted URL, then request permitted public website HTML on the server.
2. Inspect declared website icons, preferring a suitable high-resolution icon or apple-touch-icon, then a standard favicon.
3. Resolve relative icon URLs against the final document URL and applicable base URL, subject to the same fetch restrictions.
4. Try the origin's `/favicon.ico` if declared icons are missing or unusable.
5. Use a local generated initial/monogram if discovery fails or the image cannot display.

Page title and meta description are optional suggestions. An Open Graph image is usually a preview/banner and should not automatically become the logo.

Proposed limits: 5-second total lookup budget, at most 3 redirects, 1 MB decompressed HTML, and 512 KB per icon. Bound icon candidate count and response processing. Rate-limit lookup by user and IP. Debounce requests and cancel obsolete ones. Cache successful public icon discoveries by origin for a short period; do not cache personalized page descriptions globally.

User-provided URLs cause the backend to contact other servers, so the fetcher needs SSRF protections: accept HTTP/HTTPS only, reject embedded credentials and unsupported ports, block loopback/private/link-local/reserved IPv4 and IPv6 destinations, and validate all resolved addresses and every redirect. The transport must connect only to validated destinations so DNS changes cannot bypass checks. Apply equivalent restrictions to icon URLs. See the [OWASP SSRF prevention guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

Do not send session cookies or credentials to target sites, execute their JavaScript, or insert fetched HTML into the app. An unreachable site, missing icon, or anti-bot page does not invalidate an otherwise valid bookmark. Treat titles and descriptions as untrusted plain text. Saving must remain possible when lookup is unavailable.

For the first version, store the discovered public icon URL and handle image errors with a local fallback. Direct icon loading contacts that host from the user's browser; use no-referrer image requests. If stronger privacy or durable cached icons are required, add a bounded image proxy/storage pipeline with validated image decoding. Avoid introducing a third-party favicon service by default.

## 9. Endpoint responsibilities

| Operation | Proposed endpoint | Important behavior |
| --- | --- | --- |
| Read library | GET /api/library | Return only owned categories/tools |
| Suggest metadata | POST /api/metadata | Authenticated, bounded lookup; no bookmark mutation |
| Create tool | POST /api/tools | Validate, check duplicates, optionally create category transactionally |
| Edit tool | PATCH /api/tools/:id | Owner and version check; revalidate category and URL |
| Delete tool | DELETE /api/tools/:id | Owner check; confirm result before updating UI |
| Create category | POST /api/categories | Validate name/icon and handle duplicate names |
| Edit category | PATCH /api/categories/:id | Owner/version checks and consistent naming |
| Delete category | DELETE /api/categories/:id | Atomic reassignment required when populated |

Validate server-side even when the form already validates. For cookie-authenticated writes, use same-origin request protections. Use consistent field errors and distinguish unauthenticated, validation, duplicate, stale-edit, and service failures. Avoid exposing whether another user's entry exists. API writes should be safe from accidental repeated clicks; database constraints and transaction boundaries determine correctness.

## 10. Delivery milestones

1. **Confirm the brief:** settle account method, working name, and remaining proposed defaults. Deliver this plan as the initial reference.
2. **Design prototype:** produce the desktop library and mobile layout with sample data, both themes, and the Add Tool form. Validate card density, stagger, and reading order.
3. **Application foundation:** initialize the chosen stack, auth, schema migrations, owner policies, and environment configuration.
4. **Core library:** implement categories, tool CRUD, duplicate handling, search, and persistence.
5. **Automatic icons:** implement the bounded metadata fetcher, editable suggestions, timeouts, and fallback rendering.
6. **Release verification:** check account isolation, cross-browser persistence, responsive layouts, keyboard interactions, and failure handling; prepare deployment instructions.

Claude Code owns the design prototype and frontend implementation. Codex owns database/backend design, implementation, and verification. Backend Phases 0–2 are complete: the API contract, server foundation, and initial PostgreSQL schema with ownership isolation are implemented and verified. Integration follows the agreed contract.

## 11. Acceptance checks

- A new user signs in and creates their first tool and category from an empty library.
- A second browser signed in to the same account retrieves that tool after loading/refreshing.
- Another account cannot read, edit, delete, or attach tools to the first account's categories.
- Adding a duplicate URL reports the existing item; different meaningful paths remain saveable.
- Invalid input is rejected without losing entered form values.
- Icon lookup succeeds for a normal public site and falls back cleanly for missing icons, network failures, blocked sites, or invalid image responses.
- Metadata endpoints reject private-network destinations and unsafe redirects, including icon requests.
- Editing a URL cannot display metadata returned for an earlier URL or overwrite manually edited text.
- Category reassignment and deletion either both succeed or both roll back.
- A stale edit from a second browser produces a recoverable conflict.
- Search and filtering return the expected tool rows and handle no results clearly.
- Desktop uses three columns; tablet and mobile remain readable with no horizontal overflow.
- Light/dark themes keep readable text, clear focus, and a subdued background grid.
- The form and actions work by keyboard, with sensible focus restoration.

Use focused integration tests for authorization, database constraints/transactions, and URL-fetch restrictions, plus end-to-end checks for the core save/find/edit/delete journey. Review visual behavior at representative desktop and mobile widths.

## 12. Remaining project decisions

- Keep Rein as the product name, or choose another name.
- Select which sign-in methods to enable in the Clerk application.
- Review the initial visual prototype before fixing typography, colors, stagger amount, and card density.
These choices do not block Phase 3 backend work.
