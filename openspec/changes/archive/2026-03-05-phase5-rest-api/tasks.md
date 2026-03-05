## 1. Dependencies and setup

- [x] 1.1 Add `hono` and `@hono/node-server` dependencies to `packages/core/package.json`

## 2. Import parsers

- [x] 2.1 Create `packages/core/src/import/claude.ts` with `parseClaudeExport(text: string): string[]` function
- [x] 2.2 Create `packages/core/src/import/chatgpt.ts` with `parseChatGptExport(json: string): string[]` function
- [x] 2.3 Write unit tests for both parsers in `packages/core/tests/import/`

## 3. REST server

- [x] 3.1 Create `packages/core/src/rest/server.ts` with `createRestApp(memoryService, config)` returning a Hono app
- [x] 3.2 Add API key auth middleware (conditional on `config.server.api_key`)
- [x] 3.3 Add `GET /api/v1/health` endpoint
- [x] 3.4 Add `POST /api/v1/memories` (remember) endpoint
- [x] 3.5 Add `GET /api/v1/memories/search` (recall) endpoint
- [x] 3.6 Add `GET /api/v1/memories/recent` (list_recent) endpoint
- [x] 3.7 Add `GET /api/v1/memories/:id` (get single memory) endpoint
- [x] 3.8 Add `PUT /api/v1/memories/:id` (update) endpoint
- [x] 3.9 Add `DELETE /api/v1/memories/:id` (forget) endpoint
- [x] 3.10 Add `GET /api/v1/entities/:name` (search_by_entity) endpoint
- [x] 3.11 Add `GET /api/v1/stats` (stats) endpoint
- [x] 3.12 Add `POST /api/v1/context` (get_context) endpoint
- [x] 3.13 Add `POST /api/v1/import/claude` endpoint using the Claude parser
- [x] 3.14 Add `POST /api/v1/import/chatgpt` endpoint using the ChatGPT parser

## 4. Entry point update

- [x] 4.1 Update `packages/core/src/index.ts` to start both MCP and REST servers

## 5. Tests

- [x] 5.1 Write REST server tests in `packages/core/tests/rest/server.test.ts` covering all endpoints, auth, and error handling
