## 1. Dependencies

- [x] 1.1 Add `@modelcontextprotocol/sdk` dependency to packages/core

## 2. Capture templates

- [x] 2.1 Create `packages/core/src/templates/capture.ts` with decision, person, insight, and meeting templates

## 3. MCP server

- [x] 3.1 Create `packages/core/src/mcp/server.ts` with MCP server class that accepts MemoryService and starts on stdio
- [x] 3.2 Register the `remember` tool with content and optional type parameters
- [x] 3.3 Register the `recall` tool with query and optional limit parameters
- [x] 3.4 Register the `forget` tool with id parameter
- [x] 3.5 Register the `update` tool with id and content parameters
- [x] 3.6 Register the `list_recent` tool with optional days, limit, and type parameters
- [x] 3.7 Register the `search_by_entity` tool with entity and optional type parameters
- [x] 3.8 Register the `stats` tool with optional days parameter
- [x] 3.9 Register the `get_context` tool with topic and optional limit parameters
- [x] 3.10 Register capture template resources at nenya://templates/* URIs
- [x] 3.11 Add error handling wrapper for all tools (catch errors, return as isError content)

## 4. Entry point

- [x] 4.1 Create `packages/core/src/index.ts` that wires config, db, providers, services, and starts the MCP server

## 5. Tests

- [x] 5.1 Write unit tests for MCP tool handlers with mocked MemoryService
- [x] 5.2 Write tests for capture template resources
