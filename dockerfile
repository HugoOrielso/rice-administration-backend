# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:22-alpine AS deps

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# --ignore-scripts evita que postinstall (prisma generate) corra aquí
# El schema aún no existe en este stage, correría en el builder
RUN pnpm install --frozen-lockfile --ignore-scripts


# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ahora sí existe prisma/schema.prisma — generamos el client y compilamos
RUN pnpm prisma:generate
RUN pnpm build


# ─── Stage 3: Runner (producción) ────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 expressjs

COPY --from=builder --chown=expressjs:nodejs /app/dist ./dist
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/package.json ./
COPY --from=builder --chown=expressjs:nodejs /app/prisma ./prisma

USER expressjs

EXPOSE 3000

# Al arrancar el contenedor: aplica migraciones pendientes y levanta el servidor
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/index.mjs"]