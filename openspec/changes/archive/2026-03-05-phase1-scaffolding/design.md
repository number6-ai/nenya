## Context

Nenya is a greenfield project with only a LICENSE and README. We need to establish the foundational architecture before any feature work. The key constraint is flexibility: memory types and entity types must not be hardcoded enums so users can extend them later.

The project uses a pnpm workspace monorepo with `packages/core` (server, DB, services) and `packages/web` (frontend, deferred to later phases).

## Goals / Non-goals

**Goals:**
- Working pnpm monorepo with TypeScript, Biome, and Vitest
- Docker Compose that starts Postgres 17 + pgvector with zero manual setup
- Drizzle ORM schema with migrations for memories, entities, and join table
- Flexible type system using strings with seeded defaults (not enums)
- Config loader that reads all settings from environment variables

**Non-goals:**
- MCP server, REST API, or any runtime endpoints (Phase 2+)
- Embedding or LLM provider implementations (Phase 2)
- Frontend (deferred)
- Production deployment or CI/CD

## Decisions

### Monorepo structure: pnpm workspaces (not Turborepo)
pnpm workspaces are sufficient for two packages. Turborepo adds build orchestration we don't need yet. We can add it later if build times become a concern.

**Alternatives considered:** Turborepo (unnecessary complexity), single package (no separation for frontend).

### Flexible types via string columns with a types table
Instead of Postgres enums, memory `type` and entity `type` are plain `text` columns. A `type_definitions` table stores valid types with metadata (name, category, description, is_default). Default types are seeded on first migration.

This lets users add custom types without schema migrations. Validation happens at the application layer by checking against the types table.

**Alternatives considered:** Postgres enums (requires migrations to add types), free-form strings with no validation (too loose, no discoverability).

### pgvector with HNSW index
Using HNSW over IVFFlat for the vector index. HNSW has better recall, doesn't require training, and works well at any dataset size. The embedding dimension is configurable via environment variable (defaults to 1536 for OpenAI).

**Alternatives considered:** IVFFlat (requires retraining as data grows).

### Drizzle ORM over Prisma
Drizzle is lighter, has better raw SQL escape hatches, and supports pgvector natively. It generates SQL migrations that are easy to review.

**Alternatives considered:** Prisma (heavier, less pgvector support), raw SQL (no type safety).

### Config via environment variables with Zod validation
A single `config.ts` reads all env vars, validates with Zod, and exports a typed config object. No config files to manage, works natively with Docker.

**Alternatives considered:** YAML/JSON config files (more complex, Docker env override needed).

## Risks / Trade-offs

- **String types require app-layer validation** → Mitigated by the `type_definitions` table and a validation helper. DB constraints are looser than enums, but we gain flexibility.
- **pgvector dimension must match embedding provider** → Mitigated by making dimension configurable. Changing providers requires re-embedding existing data (documented in config).
- **Monorepo adds workspace complexity** → Minimal risk since pnpm workspaces are lightweight. Only two packages initially.
