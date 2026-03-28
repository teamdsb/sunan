.PHONY: help ensure-web-env dev build preview

HOST ?= 127.0.0.1
WEB_ENV_FILE := apps/web/.env
WEB_ENV_EXAMPLE := apps/web/.env.example

help:
	@printf "Available targets:\n"
	@printf "  make ensure-web-env  Create apps/web/.env from .env.example if missing\n"
	@printf "  make dev      Start the web Vite dev server on http://%s:5173\n" "$(HOST)"
	@printf "  make build    Build the web app\n"
	@printf "  make preview  Preview the built web app on http://%s:4173\n" "$(HOST)"

ensure-web-env:
	@if [ ! -f "$(WEB_ENV_FILE)" ]; then \
		cp "$(WEB_ENV_EXAMPLE)" "$(WEB_ENV_FILE)"; \
		printf "Created %s from %s\n" "$(WEB_ENV_FILE)" "$(WEB_ENV_EXAMPLE)"; \
	fi
	@if ! grep -q '^VITE_LOCAL_BYPASS_AUTH=' "$(WEB_ENV_FILE)"; then \
		printf "\nVITE_LOCAL_BYPASS_AUTH=true\n" >> "$(WEB_ENV_FILE)"; \
		printf "Updated %s with VITE_LOCAL_BYPASS_AUTH=true\n" "$(WEB_ENV_FILE)"; \
	fi

dev: ensure-web-env
	pnpm --filter web dev -- --host $(HOST)

build: ensure-web-env
	pnpm --filter web build

preview: build
	pnpm --filter web preview -- --host $(HOST)
