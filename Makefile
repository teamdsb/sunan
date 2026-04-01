.PHONY: help ensure-api-env ensure-web-env db-up db-down db-reset migration-run seed start-api dev mock build preview test-api test-web

HOST ?= 127.0.0.1
API_ENV_FILE := apps/api/.env
API_ENV_EXAMPLE := apps/api/.env.example
WEB_ENV_FILE := apps/web/.env
WEB_ENV_EXAMPLE := apps/web/.env.example

help:
	@printf "Available targets:\n"
	@printf "  make ensure-api-env  Create apps/api/.env from .env.example if missing\n"
	@printf "  make ensure-web-env  Create apps/web/.env from .env.example if missing\n"
	@printf "  make db-up           Start postgres and redis via docker compose\n"
	@printf "  make db-down         Stop docker compose services\n"
	@printf "  make db-reset        Recreate postgres and redis volumes\n"
	@printf "  make migration-run   Run backend migrations\n"
	@printf "  make seed            Seed backend reference data\n"
	@printf "  make start-api       Start backend in watch mode\n"
	@printf "  make dev             Start web Vite dev server on http://%s:5173\n" "$(HOST)"
	@printf "  make mock            Start web Vite dev server in mock mode on http://%s:5173\n" "$(HOST)"
	@printf "  make build           Build the web app\n"
	@printf "  make preview         Preview the built web app on http://%s:4173\n" "$(HOST)"
	@printf "  make test-api        Run backend tests\n"
	@printf "  make test-web        Run frontend tests\n"

ensure-api-env:
	@if [ ! -f "$(API_ENV_FILE)" ]; then \
		cp "$(API_ENV_EXAMPLE)" "$(API_ENV_FILE)"; \
		printf "Created %s from %s\n" "$(API_ENV_FILE)" "$(API_ENV_EXAMPLE)"; \
	fi

ensure-web-env:
	@if [ ! -f "$(WEB_ENV_FILE)" ]; then \
		cp "$(WEB_ENV_EXAMPLE)" "$(WEB_ENV_FILE)"; \
		printf "Created %s from %s\n" "$(WEB_ENV_FILE)" "$(WEB_ENV_EXAMPLE)"; \
	fi
	@if ! grep -q '^VITE_LOCAL_BYPASS_AUTH=' "$(WEB_ENV_FILE)"; then \
		printf "\nVITE_LOCAL_BYPASS_AUTH=true\n" >> "$(WEB_ENV_FILE)"; \
		printf "Updated %s with VITE_LOCAL_BYPASS_AUTH=true\n" "$(WEB_ENV_FILE)"; \
	fi

db-up:
	docker compose up -d postgres redis
	@printf "Waiting for postgres to become healthy...\n"
	@until [ "$$(docker inspect -f '{{.State.Health.Status}}' $$(docker compose ps -q postgres))" = "healthy" ]; do sleep 1; done
	@printf "Waiting for redis to become healthy...\n"
	@until [ "$$(docker inspect -f '{{.State.Health.Status}}' $$(docker compose ps -q redis))" = "healthy" ]; do sleep 1; done

db-down:
	docker compose down

db-reset:
	docker compose down -v
	docker compose up -d postgres redis

migration-run: ensure-api-env
	pnpm --filter api migration:run

seed: ensure-api-env
	pnpm --filter api seed

start-api: ensure-api-env db-up
	pnpm --filter api start:dev

dev: ensure-web-env
	pnpm --filter web dev -- --host $(HOST)

mock: ensure-web-env
	pnpm --filter web dev --mode mock -- --host $(HOST)

build: ensure-web-env
	pnpm --filter web build

preview: build
	pnpm --filter web preview -- --host $(HOST)

test-api:
	pnpm --filter api test

test-web:
	pnpm --filter web test
