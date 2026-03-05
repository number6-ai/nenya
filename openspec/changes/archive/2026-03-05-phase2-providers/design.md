## Context

Nenya needs to generate embeddings and call LLMs as part of its memory pipeline. Phase 1 established the database; this phase adds the provider layer. The key constraint is that users should be able to use any provider, not just a hardcoded set.

The existing config module uses pure env vars with Zod validation. We're replacing that with a `nenya.yaml` config file that supports `${ENV_VAR:-default}` interpolation, giving users a readable config file while still allowing env overrides for secrets and CI.

## Goals / Non-goals

**Goals:**
- Abstract interfaces for embedding generation and LLM text/structured output
- OpenAI-compatible adapter as the universal provider (works with OpenAI, OpenRouter, Together, Groq, vLLM, etc.)
- Native Anthropic SDK adapter for LLM calls
- Native Ollama adapter for both embeddings and LLM
- Factory functions that instantiate the right provider from config
- Unit tests with mocked HTTP/SDK calls

**Non-goals:**
- Streaming responses (not needed for extraction)
- Multi-modal inputs (text only)
- Provider-specific features beyond basic completions and embeddings
- Rate limiting or retry logic beyond what the SDKs provide

## Decisions

### OpenAI SDK as universal adapter
The `openai` npm package supports a `baseURL` constructor option. By letting users set `OPENAI_BASE_URL`, a single implementation covers OpenAI, OpenRouter, Together, Groq, and any vLLM/text-generation-inference server. This avoids writing separate adapters for each.

**Alternatives considered:** Raw fetch (more boilerplate, no built-in retries), provider-specific SDKs (too many dependencies).

### Separate interfaces for embedding and LLM
Embedding providers return `number[]`. LLM providers return structured JSON (for metadata extraction). Keeping them separate means you can mix providers (e.g., Ollama for embeddings, Anthropic for LLM extraction).

### Ollama via its native HTTP API, not OpenAI-compat mode
While Ollama supports an OpenAI-compatible endpoint, using the native `/api/embed` and `/api/generate` endpoints gives access to Ollama-specific features and avoids compatibility edge cases. We use raw `fetch` for Ollama since its API is simple.

**Alternatives considered:** Using Ollama's OpenAI-compatible mode (works but less reliable for edge cases).

### LLM interface uses structured output
The LLM provider interface accepts a Zod schema and returns validated, typed JSON. For OpenAI-compatible providers this uses the `response_format` / tool-calling approach. For Anthropic, we use tool_use. For Ollama, we use the `format: "json"` option with a system prompt describing the schema.

### YAML config with env interpolation
Replace pure env-var config with `nenya.yaml`. The file is parsed as YAML, then string values containing `${VAR}` or `${VAR:-default}` are resolved against `process.env`. This gives users a single readable file with all settings, while secrets (API keys) stay in env vars.

Loading order: read `nenya.yaml` from CWD (or path in `NENYA_CONFIG` env var), interpolate env vars, validate with Zod.

The `yaml` npm package handles parsing. Env interpolation is a simple regex replacement on string values before Zod validation.

**Alternatives considered:** dotenv + env-only (not user-friendly for complex nested config), TOML (less familiar), JSON (no comments).

## Risks / Trade-offs

- **OpenAI-compatible endpoints vary in feature support** → We use only basic completion and embedding endpoints, which are universally supported. No provider-specific features.
- **Ollama structured output is less reliable** → Mitigated by validating with Zod and retrying once on parse failure.
- **Anthropic SDK adds another dependency** → Acceptable since Anthropic is a first-class provider and the SDK handles auth, retries, and types.
