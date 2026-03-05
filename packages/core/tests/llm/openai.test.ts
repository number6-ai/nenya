import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OpenAILlmProvider } from "../../src/llm/openai.js";

describe("OpenAILlmProvider", () => {
	let provider: OpenAILlmProvider;

	beforeEach(() => {
		provider = new OpenAILlmProvider({
			apiKey: "test-key",
			baseUrl: "https://api.openai.com/v1",
			model: "gpt-4o-mini",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("calls parse and returns structured data", async () => {
		const schema = z.object({
			summary: z.string(),
			entities: z.array(z.string()),
		});

		const mockParsed = { summary: "Test summary", entities: ["Alice", "Bob"] };

		const client = (
			provider as unknown as { client: { chat: { completions: { parse: unknown } } } }
		).client;
		client.chat.completions.parse = vi.fn().mockResolvedValue({
			choices: [{ message: { parsed: mockParsed } }],
		});

		const result = await provider.generateStructured("Extract data", schema);

		expect(result).toEqual(mockParsed);
	});

	it("throws when no parsed response", async () => {
		const schema = z.object({ name: z.string() });

		const client = (
			provider as unknown as { client: { chat: { completions: { parse: unknown } } } }
		).client;
		client.chat.completions.parse = vi.fn().mockResolvedValue({
			choices: [{ message: { parsed: null } }],
		});

		await expect(provider.generateStructured("test", schema)).rejects.toThrow("no parsed response");
	});
});
