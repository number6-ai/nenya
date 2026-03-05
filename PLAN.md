# Nenya — Implementation Plan

## Context

Nenya is a new number6.ai product: a self-hosted memory layer for AI agents. The gap it fills is that every AI platform (Claude, ChatGPT, Cursor, etc.) traps your context in walled gardens. Nenya gives you one Postgres+pgvector brain exposed via MCP, so any agent can read/write to a shared knowledge store you own. Inspired by the "Open Brain" concept, productized and polished.

**Repo**: github: number6-ai/nenya
**State**: Empty repo — LICENSE + README only.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (ESM) |
| Package manager | pnpm |
| Database | Postgres 17 + pgvector |
| ORM | Drizzle ORM |
| MCP SDK | @modelcontextprotocol/sdk |
| REST framework | Hono |
| Embeddings | Pluggable (OpenAI, Ollama, Cohere) |
| LLM extraction | Pluggable (OpenAI, Anthropic, Ollama) |
| Testing | Vitest |
| Linting | Biome |
| Deployment | Docker Compose |

---

## Project Structure

```
nenya/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
├── biome.json
├── drizzle.config.ts
├── .env.example
├── src/
│   ├── index.ts                    # Entry point — starts MCP + REST
│   ├── config.ts                   # Env-based configuration
│   ├── db/
│   │   ├── client.ts               # Drizzle client setup
│   │   ├── schema.ts               # All table definitions
│   │   └── migrations/             # Drizzle migrations
│   ├── services/
│   │   ├── memory.service.ts       # Core business logic (CRUD + search)
│   │   ├── extraction.service.ts   # LLM metadata extraction
│   │   └── embedding.service.ts    # Vector embedding generation
│   ├── embeddings/
│   │   ├── provider.ts             # Abstract interface
│   │   ├── openai.ts               # OpenAI implementation
│   │   ├── ollama.ts               # Ollama implementation
│   │   └── index.ts                # Factory (picks from config)
│   ├── llm/
│   │   ├── provider.ts             # Abstract interface for LLM calls
│   │   ├── openai.ts               # OpenAI implementation
│   │   ├── anthropic.ts            # Anthropic implementation
│   │   ├── ollama.ts               # Ollama implementation
│   │   └── index.ts                # Factory
│   ├── mcp/
│   │   └── server.ts               # MCP server with all tool definitions
│   ├── rest/
│   │   └── server.ts               # Hono REST API
│   ├── import/
│   │   ├── claude.ts               # Claude memory importer
│   │   └── chatgpt.ts              # ChatGPT memory importer
│   └── templates/
│       └── capture.ts              # Capture templates (decision, person, insight, meeting)
├── tests/
│   ├── services/
│   │   ├── memory.service.test.ts
│   │   ├── extraction.service.test.ts
│   │   └── embedding.service.test.ts
│   ├── mcp/
│   │   └── server.test.ts
│   └── rest/
│       └── server.test.ts
└── README.md
```

---

## Database Schema

### `memories` — Core table
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default gen |
| content | text | Raw captured text |
| type | enum | thought, decision, person, insight, meeting, fact, preference |
| embedding | vector(1536) | pgvector, dimension depends on provider |
| metadata | jsonb | Extracted structured data (action_items, source, etc.) |
| created_at | timestamp | |
| updated_at | timestamp | |

### `entities` — People, projects, topics
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | Entity name |
| type | enum | person, project, topic, tool, organization |
| metadata | jsonb | Additional attributes |
| created_at | timestamp | |

### `memory_entities` — Join table
| Column | Type | Notes |
|---|---|---|
| memory_id | uuid | FK → memories |
| entity_id | uuid | FK → entities |
| relationship | text | e.g. "mentioned_in", "decided_by", "about" |

### Indexes
- `memories.embedding` — ivfflat or hnsw index for vector search
- `entities.name` — btree, unique per type
- `memories.type` — btree for filtered queries
- `memories.created_at` — btree for recency queries

---

## MCP Tools

| Tool | Params | Description |
|---|---|---|
| `remember` | `content: string, type?: string` | Capture a thought. LLM extracts metadata + entities, generates embedding, stores everything. Returns memory ID + extracted metadata. |
| `recall` | `query: string, limit?: number` | Semantic search by meaning. Returns ranked memories with similarity scores. |
| `forget` | `id: string` | Delete a memory and its entity relationships. |
| `update` | `id: string, content: string` | Update memory content, re-extract metadata, regenerate embedding. |
| `list_recent` | `days?: number, limit?: number, type?: string` | Browse recent captures with optional filters. |
| `search_by_entity` | `entity: string, type?: string` | Find all memories related to a named entity. |
| `stats` | `days?: number` | Overview: total memories, top entities, type distribution, capture frequency. |
| `get_context` | `topic: string, limit?: number` | Combine semantic + entity search to build rich context for a task/topic. |

---

## REST API

Mirrors MCP tools at `/api/v1/`:

```
POST   /api/v1/memories          → remember
GET    /api/v1/memories/search    → recall (?query=...&limit=...)
GET    /api/v1/memories/recent    → list_recent (?days=...&limit=...&type=...)
GET    /api/v1/memories/:id       → get single memory
PUT    /api/v1/memories/:id       → update
DELETE /api/v1/memories/:id       → forget
GET    /api/v1/entities/:name     → search_by_entity
GET    /api/v1/stats              → stats
POST   /api/v1/context            → get_context
POST   /api/v1/import/claude      → import Claude memories
POST   /api/v1/import/chatgpt     → import ChatGPT memories
```

Optional API key auth via `Authorization: Bearer <key>` header (configured via env var).

---

## Embedding Provider Abstraction

```typescript
interface EmbeddingProvider {
  generate(text: string): Promise<number[]>;
  dimensions: number;
}
```

Implementations: OpenAI (`text-embedding-3-small`, 1536d), Ollama (configurable model), Cohere (`embed-english-v3.0`).

Selected via `EMBEDDING_PROVIDER` env var.

---

## LLM Extraction Pipeline

On `remember`, before storing:
1. Generate embedding (async)
2. Call LLM to extract structured metadata (async, in parallel):
   - `type` classification (thought/decision/person/insight/meeting/fact/preference)
   - `entities` (names of people, projects, topics mentioned)
   - `action_items` (if any)
   - `summary` (one-line)
3. Upsert entities into `entities` table (deduplicate by name+type)
4. Insert memory + create `memory_entities` relationships

LLM provider selected via `LLM_PROVIDER` env var.

---

## Capture Templates

Built-in templates exposed as an MCP resource and via REST. Pre-structured prompts that help agents/users capture cleanly:

- **Decision**: "Decided [what] because [why]. Alternatives considered: [list]. Decided by: [who]."
- **Person**: "[Name] — [role/relationship]. Key context: [notes]. Contact: [info]."
- **Insight**: "Realized [what] while [context]. Implication: [so what]."
- **Meeting**: "Met with [who] on [topic]. Key points: [list]. Action items: [list]."

---

## Import Tools

### Claude Memory Import
- User exports Claude memory (plain text from claude.ai settings)
- Importer splits into individual memories, runs each through the standard pipeline (embed + extract)

### ChatGPT Memory Import
- User exports from ChatGPT settings (JSON)
- Importer filters to factual/preference/decision content, skips generic responses
- Runs filtered content through standard pipeline

Both available via REST endpoint and as a CLI command.

---

## Configuration (`.env`)

```env
# Database
DATABASE_URL=postgresql://nenya:nenya@localhost:5432/nenya

# Embedding provider: openai | ollama | cohere
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
COHERE_API_KEY=

# LLM provider for metadata extraction: openai | anthropic | ollama
LLM_PROVIDER=openai
ANTHROPIC_API_KEY=
OLLAMA_LLM_MODEL=llama3

# Server
MCP_PORT=3100
REST_PORT=3101
API_KEY=              # Optional, for REST API auth

# Embedding dimensions (auto-set per provider, override if needed)
EMBEDDING_DIMENSIONS=1536
```

---

## Docker Compose

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_USER: nenya
      POSTGRES_PASSWORD: nenya
      POSTGRES_DB: nenya
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  nenya:
    build: .
    depends_on:
      - postgres
    env_file: .env
    ports:
      - "3100:3100"   # MCP
      - "3101:3101"   # REST API

volumes:
  pgdata:
```

---

## Implementation Order

### Phase 1: Project scaffolding
- Init pnpm project, tsconfig, biome, vitest
- Docker Compose with Postgres+pgvector
- Drizzle ORM setup + schema + migrations
- `.env.example` + config loader

### Phase 2: Embedding + LLM providers
- Embedding provider interface + OpenAI implementation
- LLM provider interface + OpenAI implementation
- Ollama implementations for both (pluggability proof)
- Unit tests for providers

### Phase 3: Core memory service
- `memory.service.ts` — remember, recall, forget, update, list_recent, search_by_entity, stats, get_context
- `extraction.service.ts` — LLM metadata extraction pipeline
- Entity deduplication + relationship management
- Integration tests against real Postgres (via Docker)

### Phase 4: MCP server
- Wire all tools to memory service
- Expose capture templates as MCP resources
- Test with Claude Code as client

### Phase 5: REST API
- Hono server mirroring MCP tools
- Optional API key auth middleware
- Import endpoints (Claude + ChatGPT)

### Phase 6: Polish + ship
- README with setup guide, MCP client config examples (Claude, Cursor, ChatGPT)
- `.env.example` with clear documentation
- Final linting + test pass

---

## Verification

1. `pnpm lint` — Biome passes clean
2. `pnpm test` — All vitest tests pass
3. `docker compose up` — Postgres + nenya start cleanly
4. Connect Claude Code to MCP server → `remember` a thought → `recall` it → verify semantic search works
5. `curl` REST endpoints → verify CRUD + search
6. Import a Claude memory export → verify memories appear in search
7. Switch embedding provider to Ollama → verify it still works end-to-end
