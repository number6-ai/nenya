## ADDED Requirements

### Requirement: Hono HTTP server
The system SHALL start a Hono HTTP server on the port specified by `server.rest_port` (default 3101). The server SHALL expose all memory operations as REST endpoints under `/api/v1/`.

#### Scenario: Server starts on configured port
- **WHEN** the REST server is started with `server.rest_port: 3101`
- **THEN** it listens for HTTP requests on port 3101

### Requirement: Remember endpoint
The system SHALL expose `POST /api/v1/memories` accepting a JSON body with `content` (string, required) and `type` (string, optional). It SHALL call `MemoryService.remember()` and return the result as JSON with status 201.

#### Scenario: Create a memory
- **WHEN** a client sends `POST /api/v1/memories` with `{ "content": "Met with Sarah about roadmap" }`
- **THEN** the server returns 201 with the memory ID, type, entities, action items, and summary

#### Scenario: Create a memory with explicit type
- **WHEN** a client sends `POST /api/v1/memories` with `{ "content": "Use pnpm", "type": "preference" }`
- **THEN** the server returns 201 with type "preference"

#### Scenario: Missing content field
- **WHEN** a client sends `POST /api/v1/memories` with `{}`
- **THEN** the server returns 400 with a validation error

### Requirement: Recall endpoint
The system SHALL expose `GET /api/v1/memories/search` accepting query parameters `query` (string, required) and `limit` (number, optional). It SHALL call `MemoryService.recall()` and return results as JSON.

#### Scenario: Search memories
- **WHEN** a client sends `GET /api/v1/memories/search?query=roadmap`
- **THEN** the server returns 200 with an array of memories including similarity scores

#### Scenario: Search with limit
- **WHEN** a client sends `GET /api/v1/memories/search?query=roadmap&limit=5`
- **THEN** the server returns at most 5 results

#### Scenario: Missing query parameter
- **WHEN** a client sends `GET /api/v1/memories/search` without a query parameter
- **THEN** the server returns 400 with a validation error

### Requirement: List recent endpoint
The system SHALL expose `GET /api/v1/memories/recent` accepting optional query parameters `days` (number), `limit` (number), and `type` (string). It SHALL call `MemoryService.listRecent()` and return results as JSON.

#### Scenario: List recent with defaults
- **WHEN** a client sends `GET /api/v1/memories/recent`
- **THEN** the server returns 200 with up to 20 memories from the last 7 days

#### Scenario: List recent with filters
- **WHEN** a client sends `GET /api/v1/memories/recent?type=decision&days=30`
- **THEN** the server returns only decision memories from the last 30 days

### Requirement: Get memory endpoint
The system SHALL expose `GET /api/v1/memories/:id` to retrieve a single memory by ID. It SHALL query the database for the memory and return it as JSON.

#### Scenario: Get existing memory
- **WHEN** a client sends `GET /api/v1/memories/some-uuid`
- **THEN** the server returns 200 with the memory object

#### Scenario: Get non-existent memory
- **WHEN** a client sends `GET /api/v1/memories/invalid-id`
- **THEN** the server returns 404

### Requirement: Update endpoint
The system SHALL expose `PUT /api/v1/memories/:id` accepting a JSON body with `content` (string, required). It SHALL call `MemoryService.update()` and return the updated metadata as JSON.

#### Scenario: Update existing memory
- **WHEN** a client sends `PUT /api/v1/memories/some-uuid` with `{ "content": "Updated content" }`
- **THEN** the server returns 200 with the updated type, entities, and summary

#### Scenario: Update non-existent memory
- **WHEN** a client sends `PUT /api/v1/memories/invalid-id` with valid content
- **THEN** the server returns 404

### Requirement: Forget endpoint
The system SHALL expose `DELETE /api/v1/memories/:id`. It SHALL call `MemoryService.forget()` and return 204 on success.

#### Scenario: Delete existing memory
- **WHEN** a client sends `DELETE /api/v1/memories/some-uuid`
- **THEN** the server returns 204 with no body

#### Scenario: Delete non-existent memory
- **WHEN** a client sends `DELETE /api/v1/memories/invalid-id`
- **THEN** the server returns 404

### Requirement: Search by entity endpoint
The system SHALL expose `GET /api/v1/entities/:name` accepting an optional query parameter `type` (string). It SHALL call `MemoryService.searchByEntity()` and return results as JSON.

#### Scenario: Search by entity name
- **WHEN** a client sends `GET /api/v1/entities/Sarah`
- **THEN** the server returns 200 with all memories linked to "Sarah"

#### Scenario: Search by entity with type filter
- **WHEN** a client sends `GET /api/v1/entities/Nenya?type=project`
- **THEN** the server returns only memories linked to entity "Nenya" with type "project"

### Requirement: Stats endpoint
The system SHALL expose `GET /api/v1/stats` accepting an optional query parameter `days` (number). It SHALL call `MemoryService.stats()` and return the statistics as JSON.

#### Scenario: Get stats with defaults
- **WHEN** a client sends `GET /api/v1/stats`
- **THEN** the server returns 200 with total count, type distribution, top entities, and daily counts

### Requirement: Get context endpoint
The system SHALL expose `POST /api/v1/context` accepting a JSON body with `topic` (string, required) and `limit` (number, optional). It SHALL call `MemoryService.getContext()` and return results as JSON.

#### Scenario: Get context for topic
- **WHEN** a client sends `POST /api/v1/context` with `{ "topic": "Q4 roadmap" }`
- **THEN** the server returns 200 with up to 20 memories combining semantic and entity search

### Requirement: Health check endpoint
The system SHALL expose `GET /api/v1/health` that returns 200 with `{ "status": "ok" }`. This endpoint SHALL NOT require authentication.

#### Scenario: Health check
- **WHEN** a client sends `GET /api/v1/health`
- **THEN** the server returns 200 with `{ "status": "ok" }` regardless of auth configuration

### Requirement: API key authentication
When `server.api_key` is configured, all `/api/v1/*` endpoints (except `/api/v1/health`) SHALL require an `Authorization: Bearer <key>` header matching the configured key. Requests without a valid key SHALL receive a 401 response.

#### Scenario: Auth enabled with valid key
- **WHEN** `server.api_key` is set and a request includes a matching `Authorization: Bearer` header
- **THEN** the request proceeds normally

#### Scenario: Auth enabled with missing key
- **WHEN** `server.api_key` is set and a request has no `Authorization` header
- **THEN** the server returns 401 with `{ "error": "Unauthorized" }`

#### Scenario: Auth enabled with wrong key
- **WHEN** `server.api_key` is set and a request includes an incorrect bearer token
- **THEN** the server returns 401 with `{ "error": "Unauthorized" }`

#### Scenario: Auth disabled
- **WHEN** `server.api_key` is not configured
- **THEN** all requests proceed without authentication

### Requirement: Error handling
All REST endpoints SHALL catch errors from `MemoryService` and return appropriate HTTP status codes with JSON error bodies `{ "error": "<message>" }`. Service errors SHALL return 500 unless a more specific status code applies (404 for not found, 400 for validation).

#### Scenario: Service error
- **WHEN** a route handler encounters a MemoryService error
- **THEN** the server returns an appropriate HTTP error status with a JSON error body
