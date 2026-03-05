### Requirement: YAML-based configuration
The system SHALL load configuration from a `nenya.yaml` file. The file location SHALL be resolved in this order: `NENYA_CONFIG` env var, then `nenya.yaml` in the current working directory. If no config file is found, the system SHALL use built-in defaults for all optional values but fail if required values (like database URL) have no default and no env var fallback.

#### Scenario: Load from CWD
- **WHEN** `nenya.yaml` exists in the current working directory
- **THEN** the config is loaded from that file

#### Scenario: Load from NENYA_CONFIG
- **WHEN** `NENYA_CONFIG` is set to `/etc/nenya/config.yaml`
- **THEN** the config is loaded from that path instead of CWD

#### Scenario: No config file with env fallback
- **WHEN** no `nenya.yaml` exists but `DATABASE_URL` is set as an env var
- **THEN** the system starts with defaults and the env-provided database URL

#### Scenario: No config file and no env fallback for required values
- **WHEN** no `nenya.yaml` exists and `DATABASE_URL` is not set
- **THEN** the system throws a descriptive error

### Requirement: Environment variable interpolation
String values in `nenya.yaml` SHALL support `${ENV_VAR}` and `${ENV_VAR:-default}` syntax. Interpolation SHALL be resolved at load time before Zod validation.

#### Scenario: Resolve env var
- **WHEN** config contains `api_key: ${OPENAI_API_KEY}` and `OPENAI_API_KEY=sk-123`
- **THEN** the resolved value is `sk-123`

#### Scenario: Resolve with default
- **WHEN** config contains `model: ${LLM_MODEL:-gpt-4o-mini}` and `LLM_MODEL` is not set
- **THEN** the resolved value is `gpt-4o-mini`

#### Scenario: Unresolved env var without default
- **WHEN** config contains `api_key: ${MISSING_VAR}` and `MISSING_VAR` is not set
- **THEN** the resolved value is an empty string

### Requirement: Configuration structure
The `nenya.yaml` SHALL support the following structure with defaults:

```yaml
database:
  url: ${DATABASE_URL:-postgresql://nenya:nenya@localhost:5432/nenya}

embedding:
  provider: openai  # openai | ollama
  dimensions: 1536
  openai:
    api_key: ${OPENAI_API_KEY}
    base_url: https://api.openai.com/v1
    model: text-embedding-3-small
  ollama:
    base_url: http://localhost:11434
    model: nomic-embed-text

llm:
  provider: openai  # openai | anthropic | ollama
  openai:
    api_key: ${OPENAI_API_KEY}
    base_url: https://api.openai.com/v1
    model: gpt-4o-mini
  anthropic:
    api_key: ${ANTHROPIC_API_KEY}
    model: claude-sonnet-4-20250514
  ollama:
    base_url: http://localhost:11434
    model: llama3

server:
  mcp_port: 3100
  rest_port: 3101
  api_key: ${API_KEY}
```

#### Scenario: Fully default config
- **WHEN** loading a `nenya.yaml` with only `database.url` set
- **THEN** all other values use their built-in defaults

#### Scenario: Partial override
- **WHEN** `nenya.yaml` sets `llm.provider: anthropic` and `llm.anthropic.model: claude-opus-4-20250514`
- **THEN** those values are overridden while all other values remain default

### Requirement: Zod validation
The loaded and interpolated config SHALL be validated using Zod schemas. Invalid values SHALL produce clear error messages referencing the YAML path.

#### Scenario: Invalid port
- **WHEN** `server.mcp_port` is set to "abc"
- **THEN** the system throws an error indicating `server.mcp_port` must be a number

### Requirement: Default config generation
The system SHALL provide a CLI command or startup behavior that generates a default `nenya.yaml` file with all settings, comments, and `${ENV_VAR}` placeholders.

#### Scenario: Generate default config
- **WHEN** running with a `--init` flag or similar
- **THEN** a `nenya.yaml` is written to CWD with all defaults and explanatory comments

### Requirement: Backward compatibility with env-only mode
The system SHALL continue to work without a `nenya.yaml` file if all required values are provided via environment variables. This supports Docker/CI environments where a config file is impractical.

#### Scenario: Pure env var mode
- **WHEN** no `nenya.yaml` exists but DATABASE_URL, EMBEDDING_PROVIDER, LLM_PROVIDER, and OPENAI_API_KEY are set as env vars
- **THEN** the system starts successfully using env vars mapped to the equivalent config paths
