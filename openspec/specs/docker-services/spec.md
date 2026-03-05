### Requirement: Docker Compose for Postgres with pgvector
The project SHALL provide a `docker-compose.yml` at the repository root that defines a `postgres` service using the `pgvector/pgvector:pg17` image.

#### Scenario: Start database
- **WHEN** running `docker compose up postgres -d`
- **THEN** a Postgres 17 instance with pgvector extension starts and is accessible on port 5432

#### Scenario: pgvector extension available
- **WHEN** connecting to the database and running `CREATE EXTENSION IF NOT EXISTS vector`
- **THEN** the command succeeds without error

### Requirement: Default credentials
The Docker Compose postgres service SHALL use default credentials: user `nenya`, password `nenya`, database `nenya`. These SHALL be configurable via environment variables.

#### Scenario: Connect with default credentials
- **WHEN** connecting with `postgresql://nenya:nenya@localhost:5432/nenya`
- **THEN** the connection succeeds

### Requirement: Persistent volume
The Docker Compose SHALL define a named volume `pgdata` mounted at `/var/lib/postgresql/data` for the postgres service.

#### Scenario: Data survives restart
- **WHEN** running `docker compose down` followed by `docker compose up postgres -d`
- **THEN** previously created tables and data still exist

### Requirement: Port mapping
The postgres service SHALL map container port 5432 to host port 5432.

#### Scenario: Local access
- **WHEN** a local process connects to `localhost:5432`
- **THEN** it reaches the Postgres instance inside the container
