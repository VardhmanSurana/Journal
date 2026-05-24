.PHONY: dev

dev:
	@trap 'kill 0 2>/dev/null; echo ""; echo "Stopped."; exit' INT TERM; \
	echo "Starting Delta Journal..."; \
	echo "  Backend  → http://localhost:8000"; \
	echo "  Frontend → http://localhost:5173"; \
	echo ""; \
	(cd app/backend && uv run python main.py) & \
	(cd app/frontend && bun run dev) & \
	wait
