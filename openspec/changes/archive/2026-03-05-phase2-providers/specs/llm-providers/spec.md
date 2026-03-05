## ADDED Requirements

### Requirement: LLM provider interface
The system SHALL define an `LlmProvider` interface with a `generateStructured<T>(prompt: string, schema: ZodSchema<T>): Promise<T>` method that returns validated, typed JSON output.

#### Scenario: Interface contract
- **WHEN** any LLM provider is instantiated
- **THEN** it exposes `generateStructured()` matching the interface

### Requirement: OpenAI-compatible LLM provider
The system SHALL implement an OpenAI-compatible LLM provider using the `openai` SDK. It SHALL accept a configurable `baseURL`, `apiKey`, and `model`. It SHALL extract structured JSON using the SDK's structured output or tool-calling capabilities.

#### Scenario: Structured extraction with OpenAI
- **WHEN** calling `generateStructured()` with a prompt and Zod schema
- **THEN** the response is parsed and validated against the schema, returning typed data

#### Scenario: Custom base URL for LLM
- **WHEN** `OPENAI_BASE_URL` is set to a custom endpoint (e.g., OpenRouter)
- **THEN** the LLM provider sends requests to that endpoint

#### Scenario: Custom model for LLM
- **WHEN** `OPENAI_LLM_MODEL` is set to "gpt-4o"
- **THEN** the provider uses that model for completions

### Requirement: Anthropic LLM provider
The system SHALL implement an Anthropic LLM provider using the `@anthropic-ai/sdk`. It SHALL accept a configurable `apiKey` and `model`. It SHALL extract structured JSON using Anthropic's tool_use feature.

#### Scenario: Structured extraction with Anthropic
- **WHEN** calling `generateStructured()` with a prompt and Zod schema
- **THEN** the response is parsed and validated against the schema

#### Scenario: Custom Anthropic model
- **WHEN** `ANTHROPIC_LLM_MODEL` is set to "claude-sonnet-4-20250514"
- **THEN** the provider uses that model

### Requirement: Ollama LLM provider
The system SHALL implement an Ollama LLM provider using the native `/api/generate` HTTP endpoint with `format: "json"`. It SHALL include the JSON schema description in the system prompt to guide output structure.

#### Scenario: Structured extraction with Ollama
- **WHEN** calling `generateStructured()` with a prompt and Zod schema
- **THEN** the JSON response is parsed and validated against the schema

#### Scenario: Invalid JSON from Ollama
- **WHEN** Ollama returns invalid JSON or JSON that doesn't match the schema
- **THEN** the provider retries once, then throws a descriptive error

### Requirement: LLM provider factory
The system SHALL export a `createLlmProvider(config)` factory function that instantiates the correct provider based on `config.llmProvider`. Valid values: "openai" (OpenAI-compatible), "anthropic", "ollama".

#### Scenario: Factory creates OpenAI-compatible provider
- **WHEN** `LLM_PROVIDER` is "openai"
- **THEN** the factory returns an OpenAI-compatible LLM provider

#### Scenario: Factory creates Anthropic provider
- **WHEN** `LLM_PROVIDER` is "anthropic"
- **THEN** the factory returns an Anthropic LLM provider

#### Scenario: Factory creates Ollama provider
- **WHEN** `LLM_PROVIDER` is "ollama"
- **THEN** the factory returns an Ollama LLM provider

#### Scenario: Invalid LLM provider
- **WHEN** `LLM_PROVIDER` is set to an unsupported value
- **THEN** the factory throws a descriptive error
