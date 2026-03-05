import OpenAI from "openai";
import type { EmbeddingProvider } from "./provider.js";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
	private client: OpenAI;
	private model: string;
	readonly dimensions: number;

	constructor(opts: { apiKey?: string; baseUrl: string; model: string; dimensions: number }) {
		this.client = new OpenAI({
			apiKey: opts.apiKey ?? "",
			baseURL: opts.baseUrl,
		});
		this.model = opts.model;
		this.dimensions = opts.dimensions;
	}

	async generate(text: string): Promise<number[]> {
		const response = await this.client.embeddings.create({
			model: this.model,
			input: text,
		});
		return response.data[0].embedding;
	}
}
