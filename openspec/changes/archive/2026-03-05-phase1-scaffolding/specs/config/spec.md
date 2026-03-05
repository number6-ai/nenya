## ADDED Requirements

### Requirement: Environment-based configuration
The system SHALL load all configuration from environment variables. A `config.ts` module SHALL export a validated, typed configuration object.

#### Scenario: Valid configuration
- **WHEN** all required environment variables are set (DATABASE_URL)
- **THEN** the config module exports a fully typed configuration object

#### Scenario: Missing required variable
- **WHEN** DATABASE_URL is not set
- **THEN** the config module throws a descriptive error at startup listing the missing variable

### Requirement: Configuration variables
The config module SHALL support the following environment variables with defaults where noted:

- `DATABASE_URL` (required, no default)
- `EMBEDDING_PROVIDER` (default: "openai")
- `OPENAI_API_KEY` (optional)
- `OLLAMA_BASE_URL` (default: "http://localhost:11434")
- `OLLAMA_EMBEDDING_MODEL` (default: "nomic-embed-text")
- `COHERE_API_KEY` (optional)
- `LLM_PROVIDER` (default: "openai")
- `ANTHROPIC_API_KEY` (optional)
- `OLLAMA_LLM_MODEL` (default: "llama3")
- `MCP_PORT` (default: 3100)
- `REST_PORT` (default: 3101)
- `API_KEY` (optional)
- `EMBEDDING_DIMENSIONS` (default: 1536)

#### Scenario: Default values applied
- **WHEN** only DATABASE_URL is set
- **THEN** config.embeddingProvider equals "openai", config.mcpPort equals 3100, config.restPort equals 3101, config.embeddingDimensions equals 1536

#### Scenario: Override defaults
- **WHEN** EMBEDDING_PROVIDER is set to "ollama" and MCP_PORT is set to 4000
- **THEN** config.embeddingProvider equals "ollama" and config.mcpPort equals 4000

### Requirement: Zod validation
The configuration SHALL be validated using Zod schemas. Invalid values (e.g., non-numeric port) SHALL produce clear error messages.

#### Scenario: Invalid port value
- **WHEN** MCP_PORT is set to "not-a-number"
- **THEN** the config module throws an error indicating MCP_PORT must be a number

### Requirement: Env example file
The project SHALL include a `.env.example` file at the repository root documenting all supported environment variables with comments.

#### Scenario: Env example exists
- **WHEN** reading `.env.example`
- **THEN** it contains all configuration variables listed above with descriptive comments
