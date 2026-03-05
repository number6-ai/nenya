## Context

Nenya has a complete memory service (remember, recall, forget, update, listRecent, searchByEntity, stats, getContext) with embedding and LLM providers. The MCP server needs to expose these operations as MCP tools so any compatible AI agent can use them. The MCP SDK (`@modelcontextprotocol/sdk`) provides the server framework.

The config already defines `server.mcp_port`. The MemoryService takes db, embedding provider, and extraction service as constructor args.

## Goals / Non-goals

**Goals:**

- Expose all 8 memory operations as MCP tools with proper input schemas
- Expose capture templates as MCP resources
- Create an entry point that boots the full stack (config, db, providers, services, MCP server)
- Use stdio transport (the standard for local MCP servers)

**Non-goals:**

- SSE/HTTP transport (can add later)
- REST API (Phase 5)
- Authentication for MCP (stdio is local, auth not needed)
- Import tools (Phase 5)

## Decisions

### Stdio transport only (for now)

MCP servers communicate over stdio when run as a local process. This is how Claude Code, Cursor, and other MCP clients expect to launch them. The user adds Nenya to their MCP client config with a command like `npx tsx packages/core/src/index.ts` or the compiled equivalent.

SSE transport can be added later for remote access, but stdio covers the primary use case.

### Tool definitions with Zod schemas

Each MCP tool gets a JSON Schema for its input parameters. Since we already use Zod everywhere, we'll use `zod-to-json-schema` or manually define the JSON schemas for the MCP tool inputs. The MCP SDK expects plain JSON Schema objects, not Zod schemas.

### Capture templates as static resources

Templates are static strings exposed as MCP resources at URIs like `nenya://templates/decision`. Agents can read these to get pre-structured prompts for capturing specific memory types. No dynamic data, just plain text templates.

### Entry point wiring

`index.ts` creates the full dependency chain:
1. Load config
2. Create db client
3. Create embedding provider via factory
4. Create LLM provider via factory
5. Create ExtractionService with LLM provider
6. Create MemoryService with db, embedding, extraction
7. Create and start MCP server with memory service

### Error handling in tools

MCP tools should return errors as content (not throw), since the MCP protocol expects tool results, not exceptions. Wrap each tool handler in try/catch, returning error messages as text content on failure.

## Risks / Trade-offs

**Stdio means one server per client process**: Each MCP client spawns its own Nenya process. For a single-user tool this is fine. For multi-user setups, the REST API (Phase 5) or SSE transport would be needed.

**No streaming for long operations**: The remember tool calls LLM + embedding which can take a few seconds. MCP tools don't stream partial results, so the client waits. Acceptable for the expected latency.

**Template content is hardcoded**: Templates live in source code. Could be moved to the database later if users want to customize them, but starting simple.
