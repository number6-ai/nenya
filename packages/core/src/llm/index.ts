import type { Config } from "../config.js";
import { AnthropicLlmProvider } from "./anthropic.js";
import { OllamaLlmProvider } from "./ollama.js";
import { OpenAILlmProvider } from "./openai.js";
import type { LlmProvider } from "./provider.js";

export type { LlmProvider } from "./provider.js";

export function createLlmProvider(config: Config): LlmProvider {
	switch (config.llm.provider) {
		case "openai":
			return new OpenAILlmProvider({
				apiKey: config.llm.openai.api_key,
				baseUrl: config.llm.openai.base_url,
				model: config.llm.openai.model,
			});
		case "anthropic":
			return new AnthropicLlmProvider({
				apiKey: config.llm.anthropic.api_key,
				model: config.llm.anthropic.model,
			});
		case "ollama":
			return new OllamaLlmProvider({
				baseUrl: config.llm.ollama.base_url,
				model: config.llm.ollama.model,
			});
		default:
			throw new Error(
				`Unsupported LLM provider: ${config.llm.provider}. Use "openai", "anthropic", or "ollama".`,
			);
	}
}
