.PHONY: help dev build preview

HOST ?= 127.0.0.1

help:
	@printf "Available targets:\n"
	@printf "  make dev      Start the web Vite dev server on http://%s:5173\n" "$(HOST)"
	@printf "  make build    Build the web app\n"
	@printf "  make preview  Preview the built web app on http://%s:4173\n" "$(HOST)"

dev:
	pnpm --filter web dev -- --host $(HOST)

build:
	pnpm --filter web build

preview:
	pnpm --filter web preview -- --host $(HOST)
