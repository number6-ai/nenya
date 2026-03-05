import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OllamaLlmProvider } from "../../src/llm/ollama.js";

describe("OllamaLlmProvider", () => {
	let provider: OllamaLlmProvider;

	beforeEach(() => {
		provider = new OllamaLlmProvider({
			baseUrl: "http://localhost:11434",
			model: "llama3",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("calls /api/generate and parses JSON response", async () => {
		const schema = z.object({
			summary: z.string(),
			entities: z.array(z.string()),
		});

		const mockData = { summary: "Test", entities: ["Alice"] };

		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ response: JSON.stringify(mockData) }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const result = await provider.generateStructured("Extract data", schema);

		expect(result).toEqual(mockData);
		expect(fetch).toHaveBeenCalledWith(
			"http://localhost:11434/api/generate",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("retries once on invalid JSON then throws", async () => {
		const schema = z.object({ name: z.string() });

		vi.spyOn(globalThis, "fetch").mockImplementation(() =>
			Promise.resolve(
				new Response(JSON.stringify({ response: "not valid json {{{" }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			),
		);

		await expect(provider.generateStructured("test", schema)).rejects.toThrow(
			"invalid JSON after 2 attempts",
		);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it("throws on non-ok response without retrying", async () => {
		const schema = z.object({ name: z.string() });

		vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("server error", { status: 500 }));

		await expect(provider.generateStructured("test", schema)).rejects.toThrow(
			"Ollama request failed",
		);
	});
});
