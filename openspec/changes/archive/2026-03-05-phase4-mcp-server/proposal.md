## Why

The memory service exists but nothing can talk to it. MCP (Model Context Protocol) is how AI agents like Claude Code, Cursor, and others discover and call tools. Without an MCP server, Nenya is a library with no interface. This is the piece that makes it an actual product: any MCP-compatible agent can remember, recall, and search memories.

## What changes

- New MCP server using `@modelcontextprotocol/sdk` with stdio transport
- Eight MCP tools mapping 1:1 to MemoryService methods: remember, recall, forget, update, list_recent, search_by_entity, stats, get_context
- Capture templates exposed as MCP resources (decision, person, insight, meeting)
- Entry point (`index.ts`) that wires up config, providers, services, and starts the server

## Capabilities

### New capabilities

- `mcp-server`: MCP server with stdio transport, tool definitions for all memory operations, and resource definitions for capture templates

### Modified capabilities

None. The memory-service and extraction-pipeline specs are consumed as-is.

## Impact

- New dependency: `@modelcontextprotocol/sdk`
- New files: `packages/core/src/mcp/server.ts`, `packages/core/src/templates/capture.ts`, `packages/core/src/index.ts`
- Config already has `server.mcp_port` defined
- Users will add Nenya to their MCP client config (Claude Code, Cursor, etc.)
