import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AnthropicLlmProvider } from "../../src/llm/anthropic.js";

describe("AnthropicLlmProvider", () => {
	let provider: AnthropicLlmProvider;

	beforeEach(() => {
		provider = new AnthropicLlmProvider({
			apiKey: "test-key",
			model: "claude-sonnet-4-20250514",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("uses tool_use to extract structured data", async () => {
		const schema = z.object({
			summary: z.string(),
			entities: z.array(z.string()),
		});

		const mockInput = { summary: "Test", entities: ["Alice"] };

		const client = (provider as unknown as { client: { messages: { create: unknown } } }).client;
		client.messages.create = vi.fn().mockResolvedValue({
			content: [
				{
					type: "tool_use",
					id: "tool_1",
					name: "respond",
					input: mockInput,
				},
			],
		});

		const result = await provider.generateStructured("Extract data", schema);

		expect(result).toEqual(mockInput);
		expect(client.messages.create).toHaveBeenCalledWith(
			expect.objectContaining({
				tool_choice: { type: "tool", name: "respond" },
			}),
		);
	});

	it("throws when no tool_use block returned", async () => {
		const schema = z.object({ name: z.string() });

		const client = (provider as unknown as { client: { messages: { create: unknown } } }).client;
		client.messages.create = vi.fn().mockResolvedValue({
			content: [{ type: "text", text: "Hello" }],
		});

		await expect(provider.generateStructured("test", schema)).rejects.toThrow(
			"no tool use response",
		);
	});
});
