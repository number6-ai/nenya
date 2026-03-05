import { describe, expect, it } from "vitest";
import type { Config } from "../../src/config.js";
import { AnthropicLlmProvider } from "../../src/llm/anthropic.js";
import { createLlmProvider } from "../../src/llm/index.js";
import { OllamaLlmProvider } from "../../src/llm/ollama.js";
import { OpenAILlmProvider } from "../../src/llm/openai.js";

function makeConfig(overrides: Partial<Config["llm"]> = {}): Config {
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
		},
		llm: {
			provider: "openai",
			openai: { api_key: "key", base_url: "https://api.openai.com/v1", model: "gpt-4o-mini" },
			anthropic: { api_key: "key", model: "claude-sonnet-4-20250514" },
			ollama: { base_url: "http://localhost:11434", model: "llama3" },
			...overrides,
		},
		server: { mcp_port: 3100, rest_port: 3101 },
	};
}

describe("createLlmProvider", () => {
	it("creates OpenAI provider", () => {
		const provider = createLlmProvider(makeConfig({ provider: "openai" }));
		expect(provider).toBeInstanceOf(OpenAILlmProvider);
	});

	it("creates Anthropic provider", () => {
		const provider = createLlmProvider(makeConfig({ provider: "anthropic" }));
		expect(provider).toBeInstanceOf(AnthropicLlmProvider);
	});

	it("creates Ollama provider", () => {
		const provider = createLlmProvider(makeConfig({ provider: "ollama" }));
		expect(provider).toBeInstanceOf(OllamaLlmProvider);
	});

	it("throws on unsupported provider", () => {
		expect(() => createLlmProvider(makeConfig({ provider: "invalid" as "openai" }))).toThrow(
			"Unsupported LLM provider",
		);
	});
});
