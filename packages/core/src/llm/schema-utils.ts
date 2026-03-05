import type { z } from "zod";

/**
 * Convert a Zod schema to a JSON Schema object.
 * Uses Zod's built-in _def to produce a minimal JSON Schema.
 */
export function zodToJsonSchema(schema: z.ZodSchema): Record<string, unknown> {
	return walkZodType(schema);
}

function walkZodType(schema: z.ZodSchema): Record<string, unknown> {
	const def = (schema as unknown as { _def: Record<string, unknown> })._def;
	const typeName = def.typeName as string;

	switch (typeName) {
		case "ZodObject": {
			const shape = (def.shape as () => Record<string, z.ZodSchema>)();
			const properties: Record<string, unknown> = {};
			const required: string[] = [];

			for (const [key, value] of Object.entries(shape)) {
				const innerDef = (value as unknown as { _def: Record<string, unknown> })._def;
				if (innerDef.typeName === "ZodOptional") {
					properties[key] = walkZodType(innerDef.innerType as z.ZodSchema);
				} else {
					properties[key] = walkZodType(value);
					required.push(key);
				}
			}

			return { type: "object", properties, required };
		}
		case "ZodArray":
			return { type: "array", items: walkZodType(def.type as z.ZodSchema) };
		case "ZodString":
			return { type: "string" };
		case "ZodNumber":
			return { type: "number" };
		case "ZodBoolean":
			return { type: "boolean" };
		case "ZodEnum":
			return { type: "string", enum: def.values as string[] };
		case "ZodOptional":
			return walkZodType(def.innerType as z.ZodSchema);
		case "ZodDefault":
			return walkZodType(def.innerType as z.ZodSchema);
		case "ZodNullable": {
			const inner = walkZodType(def.innerType as z.ZodSchema);
			return { ...inner, nullable: true };
		}
		default:
			return { type: "string" };
	}
}
