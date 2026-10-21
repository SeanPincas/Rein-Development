# Docker development and production container

The root Dockerfile builds the Next.js application from `frontend/` using Next.js standalone output. Runtime secrets are supplied through `frontend/.env.local` by Docker Compose; they are never copied into the image.

## Build and run

Ensure `frontend/.env.local` contains the required runtime values, then run from the repository root:

The Clerk publishable key is needed while Next.js builds the browser bundle. Load the existing frontend environment file for Compose interpolation:

```powershell
docker compose --env-file frontend/.env.local up --build
```

Open `http://localhost:3000`. Stop the service with:

```powershell
docker compose down
```

## Supabase

The Compose file runs the Rein web application only. Supabase local development remains managed by the Supabase CLI and its Docker services under `backend/supabase/`. The hosted Supabase project is configured separately and receives migrations with `npx supabase db push` from `backend/`.

## Secrets

Do not add `.env.local`, Clerk secret keys, Supabase passwords, Brevo keys, or webhook signing secrets to the image or repository. Provide them at runtime through an ignored environment file or the deployment platform's secret store.
