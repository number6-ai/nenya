## MODIFIED Requirements

### Requirement: Entry point
The system SHALL provide an entry point at `packages/core/src/index.ts` that loads config, creates the database client, instantiates providers and services, starts the MCP server on stdio, and starts the REST server on the configured port.

#### Scenario: Full stack boot
- **WHEN** the entry point is executed
- **THEN** config is loaded, database connected, providers instantiated, memory service created, MCP server started on stdio, and REST server started on the configured port
