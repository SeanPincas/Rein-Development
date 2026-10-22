# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS deps

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder

WORKDIR /app/frontend
COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend/ ./
# Turbopack build: Tailwind runs through the @tailwindcss/turbopack loader in next.config.ts.
RUN --mount=type=secret,id=frontend_env \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$(sed -n 's/^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=//p' /run/secrets/frontend_env | head -n 1)" \
    sh -c 'test -n "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" || (echo "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in frontend/.env.local" >&2; exit 1); npm run build'

FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
