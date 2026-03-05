import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OllamaEmbeddingProvider } from "../../src/embeddings/ollama.js";

describe("OllamaEmbeddingProvider", () => {
	let provider: OllamaEmbeddingProvider;

	beforeEach(() => {
		provider = new OllamaEmbeddingProvider({
			baseUrl: "http://localhost:11434",
			model: "nomic-embed-text",
			dimensions: 768,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("has correct dimensions", () => {
		expect(provider.dimensions).toBe(768);
	});

	it("calls Ollama /api/embed and returns vector", async () => {
		const mockEmbedding = Array.from({ length: 768 }, () => Math.random());

		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ embeddings: [mockEmbedding] }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const result = await provider.generate("hello world");

		expect(result).toEqual(mockEmbedding);
		expect(result).toHaveLength(768);
		expect(fetch).toHaveBeenCalledWith("http://localhost:11434/api/embed", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ model: "nomic-embed-text", input: "hello world" }),
		});
	});

	it("throws on non-ok response", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("model not found", { status: 404 }),
		);

		await expect(provider.generate("hello")).rejects.toThrow("Ollama embedding request failed");
	});
});
