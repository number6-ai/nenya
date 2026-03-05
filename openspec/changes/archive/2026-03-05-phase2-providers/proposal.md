## Why

Phase 1 established the database and project structure. Before the memory service can store anything, it needs two capabilities: generating vector embeddings (for semantic search) and calling LLMs (for metadata extraction). Users should be able to point Nenya at any provider they want, not just a hardcoded list.

## What changes

- Add an embedding provider abstraction with two implementations: OpenAI-compatible (covers OpenAI, any compatible endpoint via base URL) and Ollama
- Add an LLM provider abstraction with three implementations: OpenAI-compatible, Anthropic (native SDK), and Ollama
- The OpenAI-compatible adapter uses the OpenAI SDK with configurable `baseURL` and `model`, letting users connect to OpenRouter, Together, Groq, local vLLM, or any other compatible API
- Drop the dedicated Cohere embedding provider from the original plan (users can hit Cohere through the OpenAI-compatible path or we add it later)
- Add unit tests for all providers

## Capabilities

### New capabilities
- `embedding-providers`: Pluggable embedding generation with OpenAI-compatible and Ollama implementations, factory selection via config
- `llm-providers`: Pluggable LLM calls for structured extraction with OpenAI-compatible, Anthropic, and Ollama implementations, factory selection via config

### Modified capabilities
- `config`: Replace pure env-var config with a `nenya.yaml` config file supporting `${ENV_VAR:-default}` interpolation. Add provider settings (base URLs, models, API keys).

## Impact

- **Code**: New `packages/core/src/embeddings/` and `packages/core/src/llm/` directories. Rewrite of `config.ts` to load YAML.
- **Dependencies**: `openai` SDK, `@anthropic-ai/sdk`, `yaml` (YAML parser)
- **Config**: New `nenya.yaml` file replaces `.env.example` as primary config. Env vars still work via `${VAR}` interpolation.
- **Tests**: Unit tests for each provider with mocked API calls, config loader tests
