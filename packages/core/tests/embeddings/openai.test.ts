import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAIEmbeddingProvider } from "../../src/embeddings/openai.js";

describe("OpenAIEmbeddingProvider", () => {
	let provider: OpenAIEmbeddingProvider;

	beforeEach(() => {
		provider = new OpenAIEmbeddingProvider({
			apiKey: "test-key",
			baseUrl: "https://api.openai.com/v1",
			model: "text-embedding-3-small",
			dimensions: 1536,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("has correct dimensions", () => {
		expect(provider.dimensions).toBe(1536);
	});

	it("calls OpenAI embeddings API and returns vector", async () => {
		const mockEmbedding = Array.from({ length: 1536 }, () => Math.random());

		// Mock the client's embeddings.create method
		const client = (provider as unknown as { client: { embeddings: { create: unknown } } }).client;
		client.embeddings.create = vi.fn().mockResolvedValue({
			data: [{ embedding: mockEmbedding }],
		});

		const result = await provider.generate("hello world");

		expect(result).toEqual(mockEmbedding);
		expect(result).toHaveLength(1536);
		expect(client.embeddings.create).toHaveBeenCalledWith({
			model: "text-embedding-3-small",
			input: "hello world",
		});
	});
});
