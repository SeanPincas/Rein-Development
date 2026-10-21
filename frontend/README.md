This is Rein's shared [Next.js](https://nextjs.org) application. Claude Code owns frontend pages/components and Codex owns Route Handlers and server-only backend modules.

## Backend foundation

Copy `.env.example` to `.env.local` and supply the application origin plus development Clerk and Supabase values. Never commit real keys.

Backend-owned modules live under `src/lib/server/`:

- `env.ts` validates required server configuration lazily.
- `auth.ts` requires a verified Clerk session.
- `database.ts` creates a Supabase client using the Clerk session token.
- `request.ts` bounds and validates JSON requests, same-origin mutations, and redirect destinations.
- `api-error.ts` and `response.ts` implement the API response contract.
- `route-handler.ts` applies authentication context, private caching, request IDs, and safe logging consistently.
- `logger.ts` records method/path/status metadata without query strings or private payloads.

`src/proxy.ts` installs Clerk's Next.js 16 request proxy. Protected API routes still verify their session inside each Route Handler; the proxy is not the authorization boundary.

## Email verification delivery

Clerk remains responsible for generating, expiring, rate-limiting, and validating email verification codes. Brevo is an optional delivery transport: it receives a signed Clerk `email.created` webhook and sends the message through its transactional email API. Keep Clerk's “Delivered by Clerk” setting enabled until the webhook route and a real delivery test have passed.

The Brevo SDK is installed, but activation requires a verified Brevo sender and these server-only values in `.env.local`: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, and `CLERK_WEBHOOK_SIGNING_SECRET`. Never expose or commit the API key or webhook signing secret.

Useful checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build:webpack
```

The default Turbopack build has failed in this Windows execution environment while spawning its CSS worker. The documented Webpack fallback is retained as a verification command until that toolchain issue is resolved.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
