## ADDED Requirements

### Requirement: Memories table
The system SHALL define a `memories` table with columns: `id` (uuid, primary key, auto-generated), `content` (text, not null), `type` (text, not null), `embedding` (vector, nullable, dimension configurable), `metadata` (jsonb, default empty object), `created_at` (timestamp with timezone, default now), `updated_at` (timestamp with timezone, default now).

#### Scenario: Memory record creation
- **WHEN** inserting a row into `memories` with `content` and `type`
- **THEN** the row is created with auto-generated `id`, `created_at`, and `updated_at`

#### Scenario: Embedding storage
- **WHEN** inserting a memory with a vector embedding
- **THEN** the embedding is stored in the `embedding` column and can be used for similarity search

### Requirement: Entities table
The system SHALL define an `entities` table with columns: `id` (uuid, primary key, auto-generated), `name` (text, not null), `type` (text, not null), `metadata` (jsonb, default empty object), `created_at` (timestamp with timezone, default now).

#### Scenario: Entity creation
- **WHEN** inserting a row into `entities` with `name` and `type`
- **THEN** the row is created with auto-generated `id` and `created_at`

#### Scenario: Unique constraint on name plus type
- **WHEN** inserting two entities with the same `name` and `type`
- **THEN** the second insert fails with a unique constraint violation

### Requirement: Memory-entities join table
The system SHALL define a `memory_entities` table with columns: `memory_id` (uuid, FK to memories), `entity_id` (uuid, FK to entities), `relationship` (text, not null). The primary key SHALL be the composite of all three columns.

#### Scenario: Linking a memory to an entity
- **WHEN** inserting a row into `memory_entities` with valid `memory_id`, `entity_id`, and `relationship`
- **THEN** the relationship is stored

#### Scenario: Cascade delete from memories
- **WHEN** a memory is deleted from the `memories` table
- **THEN** all related rows in `memory_entities` are also deleted

### Requirement: Type definitions table
The system SHALL define a `type_definitions` table with columns: `id` (uuid, primary key), `name` (text, not null), `category` (text, not null, one of "memory" or "entity"), `description` (text, nullable), `is_default` (boolean, default false), `created_at` (timestamp with timezone, default now). There SHALL be a unique constraint on `name` + `category`.

#### Scenario: Default memory types seeded
- **WHEN** running migrations on a fresh database
- **THEN** the `type_definitions` table contains default memory types: thought, decision, person, insight, meeting, fact, preference (all with `is_default: true`, `category: "memory"`)

#### Scenario: Default entity types seeded
- **WHEN** running migrations on a fresh database
- **THEN** the `type_definitions` table contains default entity types: person, project, topic, tool, organization (all with `is_default: true`, `category: "entity"`)

#### Scenario: Custom type creation
- **WHEN** inserting a new type_definition with `name: "recipe"`, `category: "memory"`, `is_default: false`
- **THEN** the type is stored and available for use

### Requirement: Vector similarity index
The system SHALL create an HNSW index on the `memories.embedding` column for cosine distance similarity search.

#### Scenario: Similarity search uses index
- **WHEN** querying memories ordered by cosine distance to a query vector
- **THEN** the query plan uses the HNSW index

### Requirement: Standard indexes
The system SHALL create btree indexes on: `memories.type`, `memories.created_at`, `entities.name`, and `entities.type`.

#### Scenario: Filtered queries use indexes
- **WHEN** querying memories filtered by `type`
- **THEN** the query plan uses the btree index on `memories.type`

### Requirement: Drizzle migrations
All schema changes SHALL be managed through Drizzle Kit migrations. A `drizzle.config.ts` SHALL be configured in `packages/core`.

#### Scenario: Generate migration
- **WHEN** running `pnpm --filter @nenya/core drizzle-kit generate`
- **THEN** a SQL migration file is created in the migrations directory

#### Scenario: Apply migration
- **WHEN** running `pnpm --filter @nenya/core drizzle-kit migrate`
- **THEN** the migration is applied to the database and the schema matches the Drizzle definitions
