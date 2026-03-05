import type { z } from "zod";

export interface LlmProvider {
	generateStructured<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T>;
}
