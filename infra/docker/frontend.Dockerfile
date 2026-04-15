# syntax=docker/dockerfile:1.6
# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY zkdashboard/frontend/package.json ./
RUN npm install --no-audit --no-fund

COPY zkdashboard/frontend/tsconfig.json ./
COPY zkdashboard/frontend/next.config.mjs ./
COPY zkdashboard/frontend/postcss.config.mjs ./
COPY zkdashboard/frontend/tailwind.config.ts ./
COPY zkdashboard/frontend/next-env.d.ts ./
COPY zkdashboard/frontend/src ./src
COPY zkdashboard/frontend/public ./public

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4200
ENV HOSTNAME=0.0.0.0

# Usuario no-root
RUN addgroup -S app && adduser -S -G app app

# Copiamos el output standalone + assets estáticos
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static

USER app

EXPOSE 4200

CMD ["node", "server.js"]
