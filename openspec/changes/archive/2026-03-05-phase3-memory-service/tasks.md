## 1. Extraction service

- [x] 1.1 Create `packages/core/src/services/extraction.service.ts` with ExtractionService class, Zod output schema, and `extract(content)` method
- [x] 1.2 Add type validation against type_definitions table (fallback to "thought" for memory types, "topic" for entity types)
- [x] 1.3 Write unit tests for ExtractionService with mocked LLM provider

## 2. Memory service core

- [x] 2.1 Create `packages/core/src/services/memory.service.ts` with MemoryService class accepting db, embedding provider, and extraction service
- [x] 2.2 Implement `remember(content, type?)` with parallel embedding + extraction, entity upsert, and relationship creation
- [x] 2.3 Implement `recall(query, limit?)` with pgvector cosine similarity search
- [x] 2.4 Implement `forget(id)` with cascade delete of memory_entity rows
- [x] 2.5 Implement `update(id, content)` with re-embedding, re-extraction, and relationship refresh

## 3. Memory service queries

- [x] 3.1 Implement `listRecent(options?)` with days/limit/type filtering
- [x] 3.2 Implement `searchByEntity(entity, type?)` via join on memory_entities and entities
- [x] 3.3 Implement `stats(days?)` returning total count, type distribution, top entities, daily counts
- [x] 3.4 Implement `getContext(topic, limit?)` combining semantic and entity search with deduplication

## 4. Service barrel exports

- [x] 4.1 Create `packages/core/src/services/index.ts` barrel export for both services

## 5. Integration tests

- [x] 5.1 Write integration tests for remember + recall round-trip against real Postgres
- [x] 5.2 Write integration tests for forget, update, listRecent, searchByEntity, stats, getContext
