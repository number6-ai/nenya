import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import type { LlmProvider } from "./provider.js";
import { zodToJsonSchema } from "./schema-utils.js";

export class AnthropicLlmProvider implements LlmProvider {
	private client: Anthropic;
	private model: string;

	constructor(opts: { apiKey?: string; model: string }) {
		this.client = new Anthropic({
			apiKey: opts.apiKey ?? "",
		});
		this.model = opts.model;
	}

	async generateStructured<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
		const jsonSchema = zodToJsonSchema(schema);

		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: 4096,
			messages: [{ role: "user", content: prompt }],
			tools: [
				{
					name: "respond",
					description: "Respond with structured data matching the schema",
					input_schema: jsonSchema as Anthropic.Tool.InputSchema,
				},
			],
			tool_choice: { type: "tool", name: "respond" },
		});

		const toolBlock = response.content.find(
			(block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
		);

		if (!toolBlock) {
			throw new Error("Anthropic returned no tool use response");
		}

		return schema.parse(toolBlock.input);
	}
}
