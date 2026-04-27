FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY nest-cli.json tsconfig.json ./
COPY src ./src

RUN npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4370
ENV LOG_DIR=/home/reloj/log

RUN mkdir -p /home/reloj/log

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 4370

CMD ["npm", "run", "start:prod"]
