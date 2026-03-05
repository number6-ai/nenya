### Requirement: Embedding provider interface
The system SHALL define an `EmbeddingProvider` interface with a `generate(text: string): Promise<number[]>` method and a `dimensions: number` property.

#### Scenario: Interface contract
- **WHEN** any embedding provider is instantiated
- **THEN** it exposes `generate()` and `dimensions` matching the interface

### Requirement: OpenAI-compatible embedding provider
The system SHALL implement an OpenAI-compatible embedding provider using the `openai` SDK. It SHALL accept a configurable `baseURL`, `apiKey`, and `model`. It SHALL work with any endpoint that implements the OpenAI embeddings API (OpenAI, OpenRouter, Together, Groq, local servers).

#### Scenario: Generate embedding with OpenAI
- **WHEN** calling `generate("hello world")` with OpenAI defaults
- **THEN** a vector of length matching `dimensions` is returned

#### Scenario: Custom base URL
- **WHEN** `OPENAI_BASE_URL` is set to a custom endpoint
- **THEN** the provider sends requests to that endpoint instead of OpenAI

#### Scenario: Custom model
- **WHEN** `OPENAI_EMBEDDING_MODEL` is set to "text-embedding-3-large"
- **THEN** the provider uses that model for embedding requests

### Requirement: Ollama embedding provider
The system SHALL implement an Ollama embedding provider using the native `/api/embed` HTTP endpoint. It SHALL accept a configurable `baseURL` and `model`.

#### Scenario: Generate embedding with Ollama
- **WHEN** calling `generate("hello world")` with Ollama configured
- **THEN** a vector of length matching `dimensions` is returned from the local Ollama instance

### Requirement: Embedding provider factory
The system SHALL export a `createEmbeddingProvider(config)` factory function that instantiates the correct provider based on `config.embeddingProvider`. Valid values: "openai" (OpenAI-compatible), "ollama".

#### Scenario: Factory creates OpenAI provider
- **WHEN** `EMBEDDING_PROVIDER` is "openai"
- **THEN** the factory returns an OpenAI-compatible embedding provider

#### Scenario: Factory creates Ollama provider
- **WHEN** `EMBEDDING_PROVIDER` is "ollama"
- **THEN** the factory returns an Ollama embedding provider

#### Scenario: Invalid provider
- **WHEN** `EMBEDDING_PROVIDER` is set to an unsupported value
- **THEN** the factory throws a descriptive error
