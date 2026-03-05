import type { EmbeddingProvider } from "./provider.js";

export class OllamaEmbeddingProvider implements EmbeddingProvider {
	private baseUrl: string;
	private model: string;
	readonly dimensions: number;

	constructor(opts: { baseUrl: string; model: string; dimensions: number }) {
		this.baseUrl = opts.baseUrl.replace(/\/$/, "");
		this.model = opts.model;
		this.dimensions = opts.dimensions;
	}

	async generate(text: string): Promise<number[]> {
		const response = await fetch(`${this.baseUrl}/api/embed`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ model: this.model, input: text }),
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`Ollama embedding request failed (${response.status}): ${body}`);
		}

		const data = (await response.json()) as { embeddings: number[][] };
		return data.embeddings[0];
	}
}
