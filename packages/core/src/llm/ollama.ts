import type { z } from "zod";
import type { LlmProvider } from "./provider.js";
import { zodToJsonSchema } from "./schema-utils.js";

export class OllamaLlmProvider implements LlmProvider {
	private baseUrl: string;
	private model: string;

	constructor(opts: { baseUrl: string; model: string }) {
		this.baseUrl = opts.baseUrl.replace(/\/$/, "");
		this.model = opts.model;
	}

	async generateStructured<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
		const jsonSchema = zodToJsonSchema(schema);
		const systemPrompt = `You are a structured data extraction assistant. Respond ONLY with valid JSON matching this schema:\n${JSON.stringify(jsonSchema, null, 2)}`;

		let lastError: Error | null = null;

		for (let attempt = 0; attempt < 2; attempt++) {
			const response = await fetch(`${this.baseUrl}/api/generate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model: this.model,
					system: systemPrompt,
					prompt,
					format: "json",
					stream: false,
				}),
			});

			if (!response.ok) {
				const body = await response.text();
				throw new Error(`Ollama request failed (${response.status}): ${body}`);
			}

			const data = (await response.json()) as { response: string };

			try {
				const parsed = JSON.parse(data.response);
				return schema.parse(parsed);
			} catch (err) {
				lastError = err instanceof Error ? err : new Error(String(err));
			}
		}

		throw new Error(`Ollama returned invalid JSON after 2 attempts: ${lastError?.message}`);
	}
}
