## 1. Dependencies

- [x] 1.1 Add `openai` SDK to `@nenya/core` dependencies
- [x] 1.2 Add `@anthropic-ai/sdk` to `@nenya/core` dependencies
- [x] 1.3 Add `yaml` package to `@nenya/core` dependencies
- [x] 1.4 Run `pnpm install`

## 2. YAML config system

- [x] 2.1 Rewrite `packages/core/src/config.ts`: load `nenya.yaml` from CWD or `NENYA_CONFIG` path, parse with `yaml`, interpolate `${VAR:-default}` syntax, validate with Zod. Fall back to env-only mode if no file found.
- [x] 2.2 Create `nenya.yaml.default` at repo root with all settings, comments, and env var placeholders as the reference config
- [x] 2.3 Update `.env.example` to be minimal (just secrets: API keys) with a note pointing to `nenya.yaml`
- [x] 2.4 Add config unit tests: YAML loading, env interpolation, defaults, validation errors, env-only fallback

## 3. Embedding provider interface and implementations

- [x] 3.1 Create `packages/core/src/embeddings/provider.ts` with `EmbeddingProvider` interface (generate + dimensions)
- [x] 3.2 Create `packages/core/src/embeddings/openai.ts` implementing OpenAI-compatible embeddings using `openai` SDK with configurable baseURL and model
- [x] 3.3 Create `packages/core/src/embeddings/ollama.ts` implementing Ollama embeddings using native `/api/embed` endpoint
- [x] 3.4 Create `packages/core/src/embeddings/index.ts` with `createEmbeddingProvider(config)` factory

## 4. LLM provider interface and implementations

- [x] 4.1 Create `packages/core/src/llm/provider.ts` with `LlmProvider` interface (generateStructured with Zod schema)
- [x] 4.2 Create `packages/core/src/llm/openai.ts` implementing OpenAI-compatible structured output using `openai` SDK
- [x] 4.3 Create `packages/core/src/llm/anthropic.ts` implementing Anthropic structured output using tool_use
- [x] 4.4 Create `packages/core/src/llm/ollama.ts` implementing Ollama structured output using format: "json" with schema in system prompt
- [x] 4.5 Create `packages/core/src/llm/index.ts` with `createLlmProvider(config)` factory

## 5. Tests

- [x] 5.1 Create `packages/core/tests/embeddings/openai.test.ts` with mocked SDK calls
- [x] 5.2 Create `packages/core/tests/embeddings/ollama.test.ts` with mocked fetch
- [x] 5.3 Create `packages/core/tests/embeddings/factory.test.ts` testing provider selection
- [x] 5.4 Create `packages/core/tests/llm/openai.test.ts` with mocked SDK calls
- [x] 5.5 Create `packages/core/tests/llm/anthropic.test.ts` with mocked SDK calls
- [x] 5.6 Create `packages/core/tests/llm/ollama.test.ts` with mocked fetch
- [x] 5.7 Create `packages/core/tests/llm/factory.test.ts` testing provider selection

## 6. Verify

- [x] 6.1 Run `pnpm lint` and fix any issues
- [x] 6.2 Run `pnpm test` and verify all tests pass
- [x] 6.3 Verify TypeScript compiles without errors
