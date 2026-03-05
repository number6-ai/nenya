import { describe, expect, it } from "vitest";
import type { Config } from "../../src/config.js";
import { createEmbeddingProvider } from "../../src/embeddings/index.js";
import { OllamaEmbeddingProvider } from "../../src/embeddings/ollama.js";
import { OpenAIEmbeddingProvider } from "../../src/embeddings/openai.js";

function makeConfig(overrides: Partial<Config["embedding"]> = {}): Config {
	return {
		database: { url: "postgresql://test:5432/test" },
		embedding: {
			provider: "openai",
			dimensions: 1536,
			openai: {
				api_key: "key",
				base_url: "https://api.openai.com/v1",
				model: "text-embedding-3-small",
			},
			ollama: { base_url: "http://localhost:11434", model: "nomic-embed-text" },
			...overrides,
		},
		llm: {
			provider: "openai",
			openai: { api_key: "key", base_url: "https://api.openai.com/v1", model: "gpt-4o-mini" },
			anthropic: { api_key: "key", model: "claude-sonnet-4-20250514" },
			ollama: { base_url: "http://localhost:11434", model: "llama3" },
		},
		server: { mcp_port: 3100, rest_port: 3101 },
	};
}

describe("createEmbeddingProvider", () => {
	it("creates OpenAI provider", () => {
		const provider = createEmbeddingProvider(makeConfig({ provider: "openai" }));
		expect(provider).toBeInstanceOf(OpenAIEmbeddingProvider);
		expect(provider.dimensions).toBe(1536);
	});

	it("creates Ollama provider", () => {
		const provider = createEmbeddingProvider(makeConfig({ provider: "ollama" }));
		expect(provider).toBeInstanceOf(OllamaEmbeddingProvider);
	});

	it("throws on unsupported provider", () => {
		expect(() => createEmbeddingProvider(makeConfig({ provider: "invalid" as "openai" }))).toThrow(
			"Unsupported embedding provider",
		);
	});
});
