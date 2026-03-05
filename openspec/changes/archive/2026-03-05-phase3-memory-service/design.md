## Context

Nenya has a Postgres+pgvector database with four tables (memories, entities, memory_entities, type_definitions), embedding providers (OpenAI-compatible, Ollama), and LLM providers (OpenAI-compatible, Anthropic, Ollama) with structured output via `generateStructured()`. The core memory service needs to wire these together into a coherent remember/recall/search pipeline.

All providers are instantiated via factory functions that read from `nenya.yaml`. The database is accessed through Drizzle ORM with a shared `db` client.

## Goals / Non-goals

**Goals:**

- Implement all eight memory operations: remember, recall, forget, update, list_recent, search_by_entity, stats, get_context
- Build an extraction pipeline that classifies type, extracts entities, pulls action items, and generates a summary from raw content
- Deduplicate entities by name+type using upsert
- Support semantic search via pgvector cosine similarity
- Make the service testable with dependency injection (pass providers and db as constructor args)

**Non-goals:**

- MCP server or REST API (Phase 4 and 5)
- Import tools (Phase 5)
- Capture templates
- Background/async processing or job queues
- Caching or rate limiting

## Decisions

### Service architecture: class with injected dependencies

The memory service takes `db`, `embeddingProvider`, and `llmProvider` as constructor arguments. This makes unit testing straightforward (mock the providers) and integration testing clean (pass real instances).

```typescript
class MemoryService {
  constructor(
    private db: DrizzleClient,
    private embedding: EmbeddingProvider,
    private llm: LlmProvider,
  ) {}
}
```

Alternative considered: module-level functions with global singletons. Rejected because it makes testing harder and couples everything to config loading.

### Extraction as a separate service

`ExtractionService` wraps the LLM provider and defines the Zod schemas for structured output. It exposes a single `extract(content: string)` method that returns type, entities, action items, and summary. The memory service calls it during `remember` and `update`.

Keeping extraction separate means it can be tested independently, and the extraction logic can evolve without touching memory CRUD.

### Remember flow

1. Call `extractionService.extract(content)` to get metadata
2. Call `embeddingProvider.generate(content)` to get vector
3. Insert memory row with content, type, embedding, metadata (action_items, summary in jsonb)
4. For each extracted entity: upsert into entities table (ON CONFLICT name+type DO NOTHING), then insert memory_entity relationship
5. Return memory ID + extracted metadata

Steps 1 and 2 run in parallel (Promise.all) since they're independent.

### Recall: pure semantic search

`recall(query, limit)` generates an embedding for the query, then uses pgvector's cosine distance operator (`<=>`) to find the closest memories. Returns memories ranked by similarity with scores.

SQL via Drizzle:
```sql
SELECT *, 1 - (embedding <=> $queryVector) as similarity
FROM memories
ORDER BY embedding <=> $queryVector
LIMIT $limit
```

### get_context: hybrid search

Combines semantic search results with entity-based results. Runs both in parallel, merges by memory ID (union, deduplicate), and returns a combined set. This gives richer context than either approach alone.

### Entity deduplication

Use Postgres `ON CONFLICT (name, type) DO NOTHING` for entity upsert. After upsert, select the entity by name+type to get the ID for the relationship insert. This handles the race condition where two concurrent memories mention the same new entity.

### User-provided vs extracted type

If the caller passes a `type` to `remember`, use it directly. If not, the extraction pipeline classifies it. The extracted type must match a value in `type_definitions`, falling back to "thought" if the LLM returns something invalid.

## Risks / Trade-offs

**LLM extraction adds latency to every remember call** : Acceptable for now since memories are written infrequently. If it becomes a problem, extraction can be made async in a future phase.

**Embedding dimension mismatch** : If the user switches embedding providers, existing vectors become incompatible. Out of scope for now. Document that changing providers requires re-embedding.

**No pagination on list_recent** : Using limit+offset for now. Cursor-based pagination can be added when the REST API needs it.

**Cosine similarity threshold** : Not filtering by minimum similarity score initially. Return the top N results and let the caller decide relevance. Can add a threshold parameter later.
