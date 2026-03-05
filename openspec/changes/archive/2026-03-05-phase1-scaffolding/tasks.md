## 1. Root project setup

- [x] 1.1 Initialize root `package.json` with pnpm workspace scripts (lint, test, build)
- [x] 1.2 Create `pnpm-workspace.yaml` defining `packages/*`
- [x] 1.3 Create root `tsconfig.json` with shared compiler options (ES2022, ESM, strict)
- [x] 1.4 Create root `biome.json` with linting and formatting rules
- [x] 1.5 Create `.env.example` with all documented configuration variables

## 2. Core package scaffolding

- [x] 2.1 Create `packages/core/package.json` (name: `@nenya/core`, type: module, dependencies: drizzle-orm, postgres, zod, dotenv)
- [x] 2.2 Create `packages/core/tsconfig.json` extending root config
- [x] 2.3 Create `packages/core/vitest.config.ts`
- [x] 2.4 Create `packages/core/src/index.ts` placeholder entry point

## 3. Web package placeholder

- [x] 3.1 Create `packages/web/package.json` (name: `@nenya/web`, minimal)
- [x] 3.2 Create `packages/web/README.md` noting frontend is deferred

## 4. Docker Compose

- [x] 4.1 Create `docker-compose.yml` with postgres service (pgvector/pgvector:pg17, default credentials, named volume, port 5432)

## 5. Configuration

- [x] 5.1 Create `packages/core/src/config.ts` with Zod-validated env loading (DATABASE_URL required, all other vars with defaults)

## 6. Database schema

- [x] 6.1 Create `packages/core/drizzle.config.ts` pointing to schema and migrations directory
- [x] 6.2 Create `packages/core/src/db/schema.ts` with `memories` table (uuid id, text content, text type, vector embedding, jsonb metadata, timestamps)
- [x] 6.3 Add `entities` table to schema (uuid id, text name, text type, jsonb metadata, timestamp, unique on name+type)
- [x] 6.4 Add `memory_entities` join table to schema (memory_id FK, entity_id FK, relationship text, composite PK, cascade delete)
- [x] 6.5 Add `type_definitions` table to schema (uuid id, text name, text category, text description, boolean is_default, timestamp, unique on name+category)
- [x] 6.6 Create `packages/core/src/db/client.ts` with Drizzle client setup using config
- [x] 6.7 Add HNSW index on `memories.embedding` and btree indexes on `memories.type`, `memories.created_at`, `entities.name`, `entities.type`

## 7. Migrations and seed

- [x] 7.1 Generate initial Drizzle migration from schema
- [x] 7.2 Create seed script to insert default memory types (thought, decision, person, insight, meeting, fact, preference) and entity types (person, project, topic, tool, organization) into `type_definitions`

## 8. Install and verify

- [x] 8.1 Run `pnpm install` and verify workspace resolution
- [x] 8.2 Verify `pnpm lint` passes
- [x] 8.3 Verify TypeScript compiles without errors
- [x] 8.4 Start Docker Compose, run migrations, verify tables exist
