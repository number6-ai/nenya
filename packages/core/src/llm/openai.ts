import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { z } from "zod";
import type { LlmProvider } from "./provider.js";

export class OpenAILlmProvider implements LlmProvider {
	private client: OpenAI;
	private model: string;

	constructor(opts: { apiKey?: string; baseUrl: string; model: string }) {
		this.client = new OpenAI({
			apiKey: opts.apiKey ?? "",
			baseURL: opts.baseUrl,
		});
		this.model = opts.model;
	}

	async generateStructured<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
		const completion = await this.client.chat.completions.parse({
			model: this.model,
			messages: [{ role: "user", content: prompt }],
			response_format: zodResponseFormat(schema, "response"),
		});

		const parsed = completion.choices[0]?.message?.parsed;
		if (parsed === null || parsed === undefined) {
			throw new Error("OpenAI returned no parsed response");
		}
		return parsed;
	}
}
