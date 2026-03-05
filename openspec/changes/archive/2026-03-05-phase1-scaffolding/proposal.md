## Why

Nenya has an empty repo (LICENSE + README only). Before any feature work can happen, we need the foundational project structure, database schema, and configuration system in place. This is Phase 1 from the implementation plan: get a working monorepo with a Postgres+pgvector database that migrations can run against.

## What changes

- Initialize pnpm workspace monorepo with `packages/core` (server/API) and `packages/web` (frontend placeholder)
- Add TypeScript, Biome, and Vitest configuration
- Add Docker Compose with Postgres 17 + pgvector
- Define Drizzle ORM schema for `memories`, `entities`, and `memory_entities` tables with flexible string-based types (no hardcoded enums)
- Create migration system and seed default types
- Add environment-based configuration loader with `.env.example`

## Capabilities

### New capabilities
- `project-structure`: pnpm workspace monorepo layout, TypeScript config, Biome linting, Vitest testing setup
- `database-schema`: Drizzle ORM schema for memories, entities, and their relationships with pgvector support and flexible user-defined types
- `docker-services`: Docker Compose configuration for Postgres 17 + pgvector development environment
- `config`: Environment-based configuration loader supporting all provider settings, server ports, and API keys

### Modified capabilities

None (greenfield project).

## Impact

- **Code**: Creates the entire `packages/core` directory structure with DB, config, and tooling
- **Dependencies**: pnpm, TypeScript, Drizzle ORM, pgvector, Biome, Vitest
- **Infrastructure**: Docker Compose for local Postgres
- **APIs**: No APIs yet (Phase 1 is foundation only)
