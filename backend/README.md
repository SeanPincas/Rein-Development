# Rein backend

This folder owns the Supabase database project, SQL migrations, seed data, and backend verification support.

The HTTP API remains inside the shared Next.js application under `../frontend/src/app/api/` because the confirmed architecture uses Next.js Route Handlers. Backend-owned server modules will live under `../frontend/src/lib/server/` or another documented server-only location.

## Planned commands

- `npm run db:start` — start the local Supabase stack after Docker Desktop is running.
- `npm run db:status` — inspect the local stack.
- `npm run db:reset` — rebuild the local database from migrations and seed data.
- `npm run db:stop` — stop the local stack.
- `npm run db:lint` — lint the local database schema.
- `npm run db:test` — run database tests once they exist.
- `npm run db:diff` — inspect schema changes relative to migrations.
- `npm run migration:new -- <name>` — create a timestamped migration file.

No schema migration has been implemented yet. Phase 1 establishes server-side infrastructure; schema work begins in Phase 2.

Docker Desktop must be running before commands that use the local Supabase stack. The CLI also writes its local cache/telemetry under the current user's `.supabase` directory.
