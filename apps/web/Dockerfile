FROM node:20-bookworm-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

ARG VITE_API_BASE_URL
ARG VITE_WECOM_CORP_ID
ARG VITE_WECOM_AGENT_ID
ARG VITE_WECOM_REDIRECT_URI
ARG VITE_LOCAL_BYPASS_AUTH=false
ARG VITE_MOCK_MODE=false

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WECOM_CORP_ID=$VITE_WECOM_CORP_ID
ENV VITE_WECOM_AGENT_ID=$VITE_WECOM_AGENT_ID
ENV VITE_WECOM_REDIRECT_URI=$VITE_WECOM_REDIRECT_URI
ENV VITE_LOCAL_BYPASS_AUTH=$VITE_LOCAL_BYPASS_AUTH
ENV VITE_MOCK_MODE=$VITE_MOCK_MODE

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter web build

FROM nginx:stable-alpine

COPY docker/web/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
