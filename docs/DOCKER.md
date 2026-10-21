# Docker development and production container

The root Dockerfile builds the Next.js application from `frontend/` using Next.js standalone output. Runtime secrets are supplied through `frontend/.env.local` by Docker Compose; they are never copied into the image.

## Build and run

Ensure `frontend/.env.local` contains the required runtime values, then run from the repository root:

The Clerk publishable key is needed while Next.js builds the browser bundle. Load the existing frontend environment file for Compose interpolation:

```powershell
docker compose --env-file frontend/.env.local up --build
```

`--env-file` passes the Clerk publishable key into the image build; `NEXT_PUBLIC_*` values are compiled into the browser bundle, so rebuild with `--build` after code or key changes.

Open `http://localhost:3000`. Stop the service with:

```powershell
docker compose down
```

## Live local development

Use the development Compose file while changing the frontend. It mounts `frontend/` into the container and runs Next.js with Fast Refresh, so saved code and CSS changes appear in the browser without rebuilding or restarting Docker:

```powershell
docker compose -f docker-compose.dev.yml up
```

Leave that terminal running and open `http://localhost:3000`. Stop it with:

```powershell
docker compose -f docker-compose.dev.yml down
```

Use the regular `docker-compose.yml` for production-style image checks; use `docker-compose.dev.yml` for day-to-day development.

## Supabase

The Compose file runs the Rein web application only. Supabase local development remains managed by the Supabase CLI and its Docker services under `backend/supabase/`. The hosted Supabase project is configured separately and receives migrations with `npx supabase db push` from `backend/`.

## Secrets

Do not add `.env.local`, Clerk secret keys, Supabase passwords, Brevo keys, or webhook signing secrets to the image or repository. Provide them at runtime through an ignored environment file or the deployment platform's secret store.
