## Why

The MCP server only works with MCP-compatible clients (Claude Code, Cursor). A REST API lets any HTTP client (web dashboards, mobile apps, scripts, non-MCP agents) interact with the memory store. It also enables memory import from Claude and ChatGPT exports.

## What changes

- Add a Hono REST server that mirrors all MCP tools as HTTP endpoints at `/api/v1/*`
- Add optional API key auth middleware using the existing `server.api_key` config
- Add Claude memory import endpoint (plain text splitting)
- Add ChatGPT memory import endpoint (JSON parsing and filtering)
- Update the entry point to start both MCP and REST servers

## Capabilities

### New capabilities
- `rest-api`: Hono HTTP server with routes mirroring MCP tools, API key auth middleware, health check
- `memory-import`: Claude and ChatGPT memory export importers with REST endpoints

### Modified capabilities
- `mcp-server`: Entry point changes to start both MCP and REST servers (spec update needed for dual-server boot)

## Impact

- New dependency: `hono` and `@hono/node-server`
- New files: `src/rest/server.ts`, `src/import/claude.ts`, `src/import/chatgpt.ts`
- Modified: `src/index.ts` (starts REST server alongside MCP)
- Config: Uses existing `server.rest_port` and `server.api_key` from config
