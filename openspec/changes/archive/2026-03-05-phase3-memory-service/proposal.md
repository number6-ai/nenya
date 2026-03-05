## Why

Phases 1 and 2 built the foundation: database schema, embedding providers, and LLM providers. But there's no way to actually store or retrieve memories yet. The core memory service is the central piece that ties everything together: accepting content, running it through the LLM extraction pipeline, generating embeddings, and persisting the result with entity relationships. Without it, Nenya is just infrastructure with no product.

## What changes

- New `memory.service.ts` with full CRUD and search: remember, recall, forget, update, list_recent, search_by_entity, stats, get_context
- New `extraction.service.ts` that uses the LLM provider to classify memory type, extract entities, pull action items, and generate a summary
- Entity deduplication: upsert entities by name+type, link them to memories via the join table
- Semantic search using pgvector cosine similarity on embeddings
- Combined context retrieval (semantic + entity search merged and ranked)
- Integration tests against real Postgres via Docker

## Capabilities

### New capabilities

- `memory-service`: Core memory CRUD operations (remember, recall, forget, update, list_recent, search_by_entity, stats, get_context) with embedding generation and entity linking
- `extraction-pipeline`: LLM-powered metadata extraction from raw content (type classification, entity extraction, action items, summary generation)

### Modified capabilities

None. Existing specs (database-schema, embedding-providers, llm-providers) are consumed as-is.

## Impact

- New files in `packages/core/src/services/`
- Depends on `db/client.ts`, `db/schema.ts`, `embeddings/index.ts`, `llm/index.ts`
- No external API changes yet (MCP/REST come in later phases)
- Requires running Postgres with pgvector for integration tests
