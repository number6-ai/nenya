# Nenya

<p align="center">
  <img src="nenya.webp" alt="Nenya" width="600" />
</p>

One ring to remember them all. Self-hosted memory layer for AI agents. One Postgres + pgvector brain, exposed via MCP, readable by Claude, ChatGPT, Cursor, or any agent you'll ever use. Own your context. Switch tools freely.

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
```

The `openai` provider works with any OpenAI-compatible API. Change `base_url` to point at OpenRouter, Together, Groq, a local vLLM instance, or anything else that speaks the same protocol. Anthropic and Ollama have their own native adapters.

Copy `nenya.yaml.default` to get started. See `.env.example` for the secret-only env vars.

## Project structure

```
nenya/
├── packages/
│   ├── core/          # API, MCP server, services, DB
│   │   ├── src/
│   │   │   ├── config.ts           # YAML config loader with env interpolation
│   │   │   ├── db/                 # Drizzle schema, client, migrations, seed
│   │   │   ├── embeddings/         # Embedding providers (OpenAI-compat, Ollama)
│   │   │   └── llm/               # LLM providers (OpenAI-compat, Anthropic, Ollama)
│   │   └── tests/
│   └── web/           # Frontend (coming later)
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
- [ ] Core memory service (remember, recall, search, extraction pipeline)
- [ ] MCP server
- [ ] REST API
- [ ] Import tools (Claude, ChatGPT memory export)
- [ ] Web frontend

## License

MIT
