# syntax=docker/dockerfile:1.6
# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instalamos todas las deps (incluye dev para poder compilar con nest)
COPY zkdashboard/backend/package.json ./
RUN npm install --no-audit --no-fund

COPY zkdashboard/backend/tsconfig.json ./
COPY zkdashboard/backend/nest-cli.json ./
COPY zkdashboard/backend/src ./src

RUN npm run build

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Solo prod deps
COPY zkdashboard/backend/package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Usuario no-root
RUN addgroup -S app && adduser -S -G app app
USER app

EXPOSE 4201

CMD ["node", "dist/main.js"]
