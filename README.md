# Nenya

<p align="center">
  <img src="nenya.webp" alt="Nenya" width="600" />
</p>

One ring to remember them all. Self-hosted memory layer for AI agents. One Postgres + pgvector brain, exposed via MCP and REST, readable by Claude, ChatGPT, Cursor, or any agent you'll ever use. Own your context. Switch tools freely.

## Why

Claude remembers things about you. So does ChatGPT. So does Cursor. None of them talk to each other, and you don't own any of it. Nenya is a single Postgres+pgvector database that any AI agent can read from and write to over MCP. You keep one set of memories, switch tools whenever you want, and nothing gets lost.

You store thoughts, decisions, meetings, facts. Search them by meaning with vector similarity. Memories get linked to people, projects, and topics automatically through LLM extraction.

## Quick start

```bash
# Clone and install
git clone https://github.com/number6-ai/nenya.git
cd nenya
pnpm install

# Start Postgres with pgvector
docker compose up postgres -d

# Copy and configure
cp nenya.yaml.default nenya.yaml
# Edit nenya.yaml with your API keys

# Run migrations and seed default types
pnpm --filter @nenya/core db:migrate
pnpm --filter @nenya/core db:seed

# Start the server (MCP on stdio, REST on port 3101)
pnpm --filter @nenya/core dev
```

## Configuration

All config lives in `nenya.yaml`. Values support `${ENV_VAR:-default}` interpolation, so secrets can stay in `.env` while everything else is in one readable file.

```yaml
database:
  url: ${DATABASE_URL:-postgresql://nenya:nenya@localhost:5432/nenya}

embedding:
  provider: openai  # openai | ollama
  openai:
    api_key: ${OPENAI_API_KEY}
    base_url: https://api.openai.com/v1  # or OpenRouter, Together, Groq, etc.
    model: text-embedding-3-small

llm:
  provider: openai  # openai | anthropic | ollama
  openai:
    api_key: ${OPENAI_API_KEY}
    base_url: https://api.openai.com/v1
    model: gpt-4o-mini

server:
  rest_port: 3101
  api_key: ${API_KEY}  # optional, protects the REST API
```

The `openai` provider works with any OpenAI-compatible API. Change `base_url` to point at OpenRouter, Together, Groq, a local vLLM instance, or anything else that speaks the same protocol. Anthropic and Ollama have their own native adapters.

Copy `nenya.yaml.default` to get started. See `.env.example` for the secret-only env vars.

## MCP server

Nenya runs an MCP server over stdio. Connect it from any MCP-compatible client.

### Tools

| Tool | Params | What it does |
|---|---|---|
| `remember` | `content`, `type?` | Store a thought. LLM extracts metadata, entities, and generates an embedding. |
| `recall` | `query`, `limit?` | Semantic search by meaning. Returns ranked results with similarity scores. |
| `forget` | `id` | Delete a memory and its entity links. |
| `update` | `id`, `content` | Replace a memory's content. Re-extracts metadata and regenerates the embedding. |
| `list_recent` | `days?`, `limit?`, `type?` | Browse recent memories with optional filters. |
| `search_by_entity` | `entity`, `type?` | Find all memories linked to a person, project, or topic. |
| `stats` | `days?` | Total count, type distribution, top entities. |
| `get_context` | `topic`, `limit?` | Combines semantic and entity search for rich context on a topic. |

### Capture templates

Four built-in templates are exposed as MCP resources at `nenya://templates/{name}`:

- **decision**: "Decided [what] because [why]. Alternatives considered: [list]. Decided by: [who]."
- **person**: "[Name], [role/relationship]. Key context: [notes]. Contact: [info]."
- **insight**: "Realized [what] while [context]. Implication: [so what]."
- **meeting**: "Met with [who] on [topic]. Key points: [list]. Action items: [list]."

### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "nenya": {
      "command": "pnpm",
      "args": ["--filter", "@nenya/core", "dev"],
      "cwd": "/path/to/nenya"
    }
  }
}
```

### Cursor

Add to Cursor's MCP settings (`Settings > MCP Servers`):

```json
{
  "nenya": {
    "command": "pnpm",
    "args": ["--filter", "@nenya/core", "dev"],
    "cwd": "/path/to/nenya"
  }
}
```

## REST API

The same operations are available over HTTP at `/api/v1/`. Runs on the port set in `server.rest_port` (default 3101).

### Authentication

Optional. Set `server.api_key` in `nenya.yaml` (or the `API_KEY` env var) to require `Authorization: Bearer <key>` on all endpoints except health.

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check (always public) |
| `POST` | `/api/v1/memories` | Create a memory. Body: `{ "content": "...", "type?": "..." }` |
| `GET` | `/api/v1/memories/search?query=...&limit=...` | Semantic search |
| `GET` | `/api/v1/memories/recent?days=...&limit=...&type=...` | Recent memories |
| `GET` | `/api/v1/memories/:id` | Get a single memory |
| `PUT` | `/api/v1/memories/:id` | Update a memory. Body: `{ "content": "..." }` |
| `DELETE` | `/api/v1/memories/:id` | Delete a memory |
| `GET` | `/api/v1/entities/:name?type=...` | Memories linked to an entity |
| `GET` | `/api/v1/stats?days=...` | Memory statistics |
| `POST` | `/api/v1/context` | Rich context. Body: `{ "topic": "...", "limit?": 20 }` |
| `POST` | `/api/v1/import/claude` | Import Claude memory export (plain text body) |
| `POST` | `/api/v1/import/chatgpt` | Import ChatGPT memory export (JSON body) |

### Examples

```bash
# Remember something
curl -X POST http://localhost:3101/api/v1/memories \
  -H "Content-Type: application/json" \
  -d '{"content": "Met with Sarah about the Q4 roadmap"}'

# Search by meaning
curl "http://localhost:3101/api/v1/memories/search?query=roadmap"

# Get stats
curl http://localhost:3101/api/v1/stats
```

## Importing memories

### From Claude

Go to claude.ai Settings > Memory, export your memories as text, then:

```bash
curl -X POST http://localhost:3101/api/v1/import/claude \
  -H "Content-Type: text/plain" \
  --data-binary @claude-memories.txt
```

### From ChatGPT

Go to ChatGPT Settings > Data controls > Export data. The export includes a JSON file with your memories. Then:

```bash
curl -X POST http://localhost:3101/api/v1/import/chatgpt \
  -H "Content-Type: application/json" \
  --data-binary @chatgpt-memories.json
```

Both endpoints process each memory through the full pipeline (embedding + LLM extraction), so large imports take a bit.

## Project structure

```
nenya/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── index.ts              # Entry point (starts MCP + REST)
│   │   │   ├── config.ts             # YAML config loader with env interpolation
│   │   │   ├── db/                   # Drizzle schema, migrations, seed
│   │   │   ├── embeddings/           # Embedding providers (OpenAI-compat, Ollama)
│   │   │   ├── llm/                  # LLM providers (OpenAI-compat, Anthropic, Ollama)
│   │   │   ├── services/             # MemoryService, ExtractionService
│   │   │   ├── mcp/                  # MCP server with tool definitions
│   │   │   ├── rest/                 # Hono REST API
│   │   │   ├── import/               # Claude and ChatGPT import parsers
│   │   │   └── templates/            # Capture templates (decision, person, insight, meeting)
│   │   └── tests/
│   └── web/                          # Frontend (coming later)
├── docker-compose.yml
├── nenya.yaml.default
└── pnpm-workspace.yaml
```

## Database

Postgres 17 with pgvector. Four tables:

- `memories`: content, type, vector embedding, jsonb metadata, timestamps
- `entities`: people, projects, topics, tools, organizations
- `memory_entities`: join table linking memories to entities with a relationship label
- `type_definitions`: the list of valid types for memories and entities

Types are plain strings, not Postgres enums. The seed script creates defaults (thought, decision, insight, meeting, fact, preference, person) but you can add whatever types you need without touching the schema.

## Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript (ESM) |
| Package manager | pnpm workspaces |
| Database | Postgres 17 + pgvector |
| ORM | Drizzle |
| MCP SDK | @modelcontextprotocol/sdk |
| REST framework | Hono |
| Embeddings | OpenAI-compatible, Ollama |
| LLM extraction | OpenAI-compatible, Anthropic, Ollama |
| Config | YAML with env interpolation + Zod validation |
| Testing | Vitest |
| Linting | Biome |

## Development

```bash
pnpm lint          # Check with Biome
pnpm lint:fix      # Auto-fix
pnpm test          # Run all tests
```

## Roadmap

- [x] Project scaffolding and database schema
- [x] Embedding and LLM provider abstraction
- [x] Core memory service (remember, recall, search, extraction pipeline)
- [x] MCP server with tools and capture templates
- [x] REST API with auth and import endpoints
- [ ] Web frontend

## License

MIT
