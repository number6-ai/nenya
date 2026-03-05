## Context

Nenya currently exposes memory operations only via MCP over stdio. The existing `MemoryService` handles all business logic. The config already defines `server.rest_port` (default 3101) and `server.api_key` (optional). This phase adds an HTTP layer on top of the same `MemoryService`.

## Goals / Non-goals

**Goals:**
- HTTP API that mirrors all 8 MCP tools as REST endpoints
- Optional API key authentication for deployments that need it
- Import endpoints for Claude (plain text) and ChatGPT (JSON) memory exports
- Both MCP and REST servers running from the same process

**Non-goals:**
- User management, sessions, or OAuth
- Rate limiting (can be handled by a reverse proxy)
- WebSocket or streaming endpoints
- CLI commands for import (REST-only for now)

## Decisions

### Hono as the HTTP framework
Hono is already in the tech stack from PLAN.md. It's lightweight, runs on Node via `@hono/node-server`, and has built-in middleware patterns. Alternative: Express (heavier, more legacy). Hono fits the minimal approach better.

### Route structure mirrors MCP tool names
Each MCP tool maps to a REST endpoint. This keeps the mental model simple: same operations, different transport.

```
POST   /api/v1/memories          → remember
GET    /api/v1/memories/search   → recall
GET    /api/v1/memories/recent   → list_recent
GET    /api/v1/memories/:id      → get single memory (new, not in MCP)
PUT    /api/v1/memories/:id      → update
DELETE /api/v1/memories/:id      → forget
GET    /api/v1/entities/:name    → search_by_entity
GET    /api/v1/stats             → stats
POST   /api/v1/context           → get_context
POST   /api/v1/import/claude     → import Claude memories
POST   /api/v1/import/chatgpt    → import ChatGPT memories
GET    /api/v1/health            → health check
```

### API key auth as middleware
When `server.api_key` is set in config, all `/api/v1/*` routes require `Authorization: Bearer <key>`. When not set, auth is disabled (local/dev mode). The health endpoint is always public.

### Import architecture
Importers are plain functions that parse export formats and call `memoryService.remember()` for each extracted memory. They live in `src/import/` and are called by the REST handlers.

- Claude export: plain text, one memory per line (split on newlines, skip empty lines)
- ChatGPT export: JSON array of objects with a `content` field, filter out system/generic entries

### Single process, dual server
The entry point starts both the MCP stdio server and the Hono HTTP server. They share the same `MemoryService` instance.

## Risks / Trade-offs

- [Import processing time] Large exports could take a while since each memory goes through the full pipeline (embedding + LLM extraction). → Accept for now; batch optimization is a future concern.
- [No request validation beyond Zod] Hono doesn't validate request bodies automatically. → Use Zod schemas in route handlers to validate input, return 400 on invalid input.
- [Stdio + HTTP in same process] If one crashes, both go down. → Acceptable for a self-hosted tool. Process supervision (Docker restart policy) handles recovery.
