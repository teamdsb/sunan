FROM node:20-bookworm-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter api build
RUN pnpm --filter api deploy --legacy --prod /prod/api
RUN rm -f /prod/api/.env

FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=builder /prod/api ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
