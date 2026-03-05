import { z } from "zod";
import type { LlmProvider } from "../llm/provider.js";

export const extractionResultSchema = z.object({
	type: z.string(),
	entities: z.array(
		z.object({
			name: z.string(),
			type: z.string(),
		}),
	),
	actionItems: z.array(z.string()),
	summary: z.string(),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export class ExtractionService {
	constructor(private llm: LlmProvider) {}

	async extract(
		content: string,
		memoryTypes: string[],
		entityTypes: string[],
	): Promise<ExtractionResult> {
		const prompt = `Analyze the following content and extract structured metadata.

Classify the content as one of these memory types: ${memoryTypes.join(", ")}
For each entity mentioned, classify it as one of these entity types: ${entityTypes.join(", ")}

Content:
${content}

Extract:
- type: the most appropriate memory type for this content
- entities: array of {name, type} for each person, project, tool, organization, or topic mentioned
- actionItems: array of action items or tasks mentioned (empty array if none)
- summary: a one-line summary of the content`;

		const result = await this.llm.generateStructured(prompt, extractionResultSchema);

		const validatedType = memoryTypes.includes(result.type) ? result.type : "thought";

		const validatedEntities = result.entities.map((e) => ({
			name: e.name,
			type: entityTypes.includes(e.type) ? e.type : "topic",
		}));

		return {
			...result,
			type: validatedType,
			entities: validatedEntities,
		};
	}
}
