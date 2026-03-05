import type { Config } from "../config.js";
import { OllamaEmbeddingProvider } from "./ollama.js";
import { OpenAIEmbeddingProvider } from "./openai.js";
import type { EmbeddingProvider } from "./provider.js";

export type { EmbeddingProvider } from "./provider.js";

export function createEmbeddingProvider(config: Config): EmbeddingProvider {
	switch (config.embedding.provider) {
		case "openai":
			return new OpenAIEmbeddingProvider({
				apiKey: config.embedding.openai.api_key,
				baseUrl: config.embedding.openai.base_url,
				model: config.embedding.openai.model,
				dimensions: config.embedding.dimensions,
			});
		case "ollama":
			return new OllamaEmbeddingProvider({
				baseUrl: config.embedding.ollama.base_url,
				model: config.embedding.ollama.model,
				dimensions: config.embedding.dimensions,
			});
		default:
			throw new Error(
				`Unsupported embedding provider: ${config.embedding.provider}. Use "openai" or "ollama".`,
			);
	}
}
