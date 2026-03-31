# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --ignore-scripts


# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma generate durante build
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN pnpm prisma:generate
RUN pnpm build


# ─── Stage 3: Runner ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 expressjs

COPY --from=builder --chown=expressjs:nodejs /app/dist ./dist
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/package.json ./
COPY --from=builder --chown=expressjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=expressjs:nodejs /app/prisma.config.ts ./

USER expressjs

EXPOSE 3000

CMD ["sh", "-c", "npm run deploy:prod && node dist/index.mjs"]