## ADDED Requirements

### Requirement: MCP server with stdio transport
The system SHALL implement an MCP server using `@modelcontextprotocol/sdk` that communicates over stdio. It SHALL register all memory tools and capture template resources on startup.

#### Scenario: Server starts successfully
- **WHEN** the MCP server is started
- **THEN** it connects via stdio and exposes all registered tools and resources

### Requirement: Remember tool
The system SHALL expose a `remember` MCP tool with parameters `content` (string, required) and `type` (string, optional). It SHALL call `MemoryService.remember()` and return the memory ID, extracted type, entities, action items, and summary.

#### Scenario: Remember with content only
- **WHEN** an agent calls the `remember` tool with `{ content: "Met with Sarah about the roadmap" }`
- **THEN** the tool returns the memory ID and extracted metadata as text content

#### Scenario: Remember with explicit type
- **WHEN** an agent calls the `remember` tool with `{ content: "Use pnpm", type: "preference" }`
- **THEN** the tool returns the memory with type "preference"

#### Scenario: Remember with invalid type
- **WHEN** an agent calls the `remember` tool with an invalid type
- **THEN** the tool returns an error message (not an exception)

### Requirement: Recall tool
The system SHALL expose a `recall` MCP tool with parameters `query` (string, required) and `limit` (number, optional, default 10). It SHALL call `MemoryService.recall()` and return memories with similarity scores.

#### Scenario: Recall with query
- **WHEN** an agent calls the `recall` tool with `{ query: "mobile roadmap" }`
- **THEN** the tool returns up to 10 memories with content, type, and similarity scores

#### Scenario: Recall with custom limit
- **WHEN** an agent calls the `recall` tool with `{ query: "mobile", limit: 5 }`
- **THEN** the tool returns at most 5 memories

### Requirement: Forget tool
The system SHALL expose a `forget` MCP tool with parameter `id` (string, required). It SHALL call `MemoryService.forget()` and return a confirmation message.

#### Scenario: Forget existing memory
- **WHEN** an agent calls the `forget` tool with a valid memory ID
- **THEN** the tool returns a confirmation that the memory was deleted

#### Scenario: Forget non-existent memory
- **WHEN** an agent calls the `forget` tool with an invalid ID
- **THEN** the tool returns an error message

### Requirement: Update tool
The system SHALL expose an `update` MCP tool with parameters `id` (string, required) and `content` (string, required). It SHALL call `MemoryService.update()` and return the updated metadata.

#### Scenario: Update existing memory
- **WHEN** an agent calls the `update` tool with a valid ID and new content
- **THEN** the tool returns the updated type, entities, and summary

#### Scenario: Update non-existent memory
- **WHEN** an agent calls the `update` tool with an invalid ID
- **THEN** the tool returns an error message

### Requirement: List recent tool
The system SHALL expose a `list_recent` MCP tool with optional parameters `days` (number), `limit` (number), and `type` (string). It SHALL call `MemoryService.listRecent()` and return formatted memories.

#### Scenario: List recent with defaults
- **WHEN** an agent calls the `list_recent` tool with no parameters
- **THEN** the tool returns up to 20 memories from the last 7 days

#### Scenario: List recent with filters
- **WHEN** an agent calls the `list_recent` tool with `{ type: "decision", days: 30 }`
- **THEN** the tool returns only decision memories from the last 30 days

### Requirement: Search by entity tool
The system SHALL expose a `search_by_entity` MCP tool with parameters `entity` (string, required) and `type` (string, optional). It SHALL call `MemoryService.searchByEntity()` and return matching memories.

#### Scenario: Search by entity name
- **WHEN** an agent calls the `search_by_entity` tool with `{ entity: "Sarah" }`
- **THEN** the tool returns all memories linked to entity "Sarah"

#### Scenario: Search by entity with type filter
- **WHEN** an agent calls the `search_by_entity` tool with `{ entity: "Nenya", type: "project" }`
- **THEN** the tool returns only memories linked to entity "Nenya" with type "project"

### Requirement: Stats tool
The system SHALL expose a `stats` MCP tool with optional parameter `days` (number, default 30). It SHALL call `MemoryService.stats()` and return formatted statistics.

#### Scenario: Stats with defaults
- **WHEN** an agent calls the `stats` tool with no parameters
- **THEN** the tool returns total count, type distribution, top entities, and daily counts for the last 30 days

### Requirement: Get context tool
The system SHALL expose a `get_context` MCP tool with parameters `topic` (string, required) and `limit` (number, optional, default 20). It SHALL call `MemoryService.getContext()` and return combined context.

#### Scenario: Get context for topic
- **WHEN** an agent calls the `get_context` tool with `{ topic: "Q4 roadmap" }`
- **THEN** the tool returns up to 20 memories combining semantic and entity search results

### Requirement: Capture template resources
The system SHALL expose capture templates as MCP resources at URIs `nenya://templates/decision`, `nenya://templates/person`, `nenya://templates/insight`, and `nenya://templates/meeting`. Each resource SHALL return a pre-structured prompt template.

#### Scenario: Read decision template
- **WHEN** an agent reads the resource `nenya://templates/decision`
- **THEN** it receives a template with placeholders for what was decided, why, alternatives, and who decided

#### Scenario: List template resources
- **WHEN** an agent lists available resources
- **THEN** it sees all four capture template resources with descriptions

### Requirement: Error handling in tools
All MCP tools SHALL catch errors from the memory service and return them as text content with `isError: true`, rather than throwing exceptions that crash the server.

#### Scenario: Service error handled gracefully
- **WHEN** a tool call results in a MemoryService error (e.g., "Memory not found")
- **THEN** the tool returns the error message as content with isError flag set

### Requirement: Entry point
The system SHALL provide an entry point at `packages/core/src/index.ts` that loads config, creates the database client, instantiates providers and services, and starts the MCP server.

#### Scenario: Full stack boot
- **WHEN** the entry point is executed
- **THEN** config is loaded, database connected, providers instantiated, memory service created, and MCP server started on stdio
