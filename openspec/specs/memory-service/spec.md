### Requirement: MemoryService class with dependency injection
The system SHALL implement a `MemoryService` class that accepts a Drizzle database client, an `EmbeddingProvider`, and an `ExtractionService` as constructor arguments.

#### Scenario: Service instantiation
- **WHEN** creating a new `MemoryService` with db, embedding provider, and extraction service
- **THEN** the service is ready to perform memory operations using the injected dependencies

### Requirement: Remember a memory
The system SHALL provide a `remember(content: string, type?: string)` method that stores a new memory with its embedding and extracted metadata. It SHALL run embedding generation and LLM extraction in parallel. It SHALL upsert extracted entities and create memory-entity relationships.

#### Scenario: Remember with automatic type classification
- **WHEN** calling `remember("Met with Sarah about the Q4 roadmap. She wants to prioritize mobile.")`
- **THEN** the system generates an embedding, extracts metadata via LLM (type, entities, action items, summary), inserts the memory, upserts entities, creates relationships, and returns the memory ID with extracted metadata

#### Scenario: Remember with explicit type
- **WHEN** calling `remember("Always use pnpm for this project", "preference")`
- **THEN** the system uses "preference" as the type instead of LLM classification

#### Scenario: Remember with invalid explicit type
- **WHEN** calling `remember("some content", "nonexistent_type")`
- **THEN** the system SHALL validate the type against type_definitions and throw an error if invalid

### Requirement: Recall memories by semantic search
The system SHALL provide a `recall(query: string, limit?: number)` method that generates an embedding for the query and returns the closest memories ranked by cosine similarity.

#### Scenario: Recall with default limit
- **WHEN** calling `recall("what did we decide about mobile?")`
- **THEN** the system returns up to 10 memories ranked by similarity, each including a similarity score

#### Scenario: Recall with custom limit
- **WHEN** calling `recall("mobile roadmap", 5)`
- **THEN** the system returns at most 5 memories

#### Scenario: Recall with no matching memories
- **WHEN** calling `recall("quantum computing")` and no memories exist
- **THEN** the system returns an empty array

### Requirement: Forget a memory
The system SHALL provide a `forget(id: string)` method that deletes a memory and its associated memory_entity relationships.

#### Scenario: Forget existing memory
- **WHEN** calling `forget(memoryId)` with a valid memory ID
- **THEN** the memory and all its memory_entity rows are deleted (cascade)

#### Scenario: Forget non-existent memory
- **WHEN** calling `forget("non-existent-uuid")`
- **THEN** the system throws an error indicating the memory was not found

### Requirement: Update a memory
The system SHALL provide an `update(id: string, content: string)` method that replaces the memory content, regenerates the embedding, re-runs extraction, and updates entity relationships.

#### Scenario: Update existing memory
- **WHEN** calling `update(memoryId, "new content about the Q4 roadmap")`
- **THEN** the memory content, embedding, metadata, and entity relationships are all updated

#### Scenario: Update non-existent memory
- **WHEN** calling `update("non-existent-uuid", "content")`
- **THEN** the system throws an error indicating the memory was not found

### Requirement: List recent memories
The system SHALL provide a `listRecent(options?: { days?: number, limit?: number, type?: string })` method that returns memories ordered by creation date descending.

#### Scenario: List recent with defaults
- **WHEN** calling `listRecent()`
- **THEN** the system returns up to 20 memories from the last 7 days, newest first

#### Scenario: List recent with type filter
- **WHEN** calling `listRecent({ type: "decision" })`
- **THEN** only memories with type "decision" are returned

#### Scenario: List recent with custom days and limit
- **WHEN** calling `listRecent({ days: 30, limit: 50 })`
- **THEN** the system returns up to 50 memories from the last 30 days

### Requirement: Search memories by entity
The system SHALL provide a `searchByEntity(entity: string, type?: string)` method that finds all memories linked to a named entity.

#### Scenario: Search by entity name
- **WHEN** calling `searchByEntity("Sarah")`
- **THEN** the system returns all memories linked to any entity named "Sarah"

#### Scenario: Search by entity name and type
- **WHEN** calling `searchByEntity("Nenya", "project")`
- **THEN** the system returns only memories linked to the entity "Nenya" with type "project"

#### Scenario: Search for unknown entity
- **WHEN** calling `searchByEntity("Unknown Person")`
- **THEN** the system returns an empty array

### Requirement: Memory statistics
The system SHALL provide a `stats(days?: number)` method that returns an overview of the memory store.

#### Scenario: Stats with default timeframe
- **WHEN** calling `stats()`
- **THEN** the system returns total memory count, type distribution (count per type), top entities (by number of linked memories), and memories created per day for the last 30 days

#### Scenario: Stats with custom timeframe
- **WHEN** calling `stats(7)`
- **THEN** the statistics cover only the last 7 days

### Requirement: Get context for a topic
The system SHALL provide a `getContext(topic: string, limit?: number)` method that combines semantic search and entity search to build rich context. It SHALL run both searches in parallel, merge results by memory ID (deduplicating), and return a combined set.

#### Scenario: Get context combines search methods
- **WHEN** calling `getContext("Q4 mobile roadmap")`
- **THEN** the system runs semantic search for "Q4 mobile roadmap" AND entity search for entities mentioned in the topic, merges results removing duplicates, and returns up to 20 combined memories

#### Scenario: Get context with custom limit
- **WHEN** calling `getContext("Q4 roadmap", 10)`
- **THEN** the system returns at most 10 combined memories
