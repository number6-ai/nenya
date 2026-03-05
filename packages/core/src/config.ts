import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const configSchema = z.object({
	database: z
		.object({
			url: z.string().min(1, "database.url is required"),
		})
		.default({ url: "" }),

	embedding: z
		.object({
			provider: z.enum(["openai", "ollama"]).default("openai"),
			dimensions: z.coerce.number().int().positive().default(1536),
			openai: z
				.object({
					api_key: z.string().optional(),
					base_url: z.string().default("https://api.openai.com/v1"),
					model: z.string().default("text-embedding-3-small"),
				})
				.default({}),
			ollama: z
				.object({
					base_url: z.string().default("http://localhost:11434"),
					model: z.string().default("nomic-embed-text"),
				})
				.default({}),
		})
		.default({}),

	llm: z
		.object({
			provider: z.enum(["openai", "anthropic", "ollama"]).default("openai"),
			openai: z
				.object({
					api_key: z.string().optional(),
					base_url: z.string().default("https://api.openai.com/v1"),
					model: z.string().default("gpt-4o-mini"),
				})
				.default({}),
			anthropic: z
				.object({
					api_key: z.string().optional(),
					model: z.string().default("claude-sonnet-4-20250514"),
				})
				.default({}),
			ollama: z
				.object({
					base_url: z.string().default("http://localhost:11434"),
					model: z.string().default("llama3"),
				})
				.default({}),
		})
		.default({}),

	server: z
		.object({
			mcp_port: z.coerce.number().int().positive().default(3100),
			rest_port: z.coerce.number().int().positive().default(3101),
			api_key: z.string().optional(),
		})
		.default({}),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Interpolate ${VAR} and ${VAR:-default} in a string value.
 */
function interpolateEnv(value: string): string {
	return value.replace(/\$\{([^}]+)\}/g, (_, expr: string) => {
		const sepIndex = expr.indexOf(":-");
		if (sepIndex !== -1) {
			const varName = expr.slice(0, sepIndex);
			const fallback = expr.slice(sepIndex + 2);
			return process.env[varName] ?? fallback;
		}
		return process.env[expr] ?? "";
	});
}

/**
 * Recursively walk an object and interpolate env vars in string values.
 */
function interpolateDeep(obj: unknown): unknown {
	if (typeof obj === "string") return interpolateEnv(obj);
	if (Array.isArray(obj)) return obj.map(interpolateDeep);
	if (obj !== null && typeof obj === "object") {
		const result: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(obj)) {
			result[key] = interpolateDeep(val);
		}
		return result;
	}
	return obj;
}

/**
 * Build config from env vars only (no YAML file).
 * Maps legacy flat env vars to the nested structure.
 */
function configFromEnv(): Record<string, unknown> {
	return {
		database: {
			url: process.env.DATABASE_URL ?? "",
		},
		embedding: {
			provider: process.env.EMBEDDING_PROVIDER || undefined,
			dimensions: process.env.EMBEDDING_DIMENSIONS || undefined,
			openai: {
				api_key: process.env.OPENAI_API_KEY || undefined,
				base_url: process.env.OPENAI_BASE_URL || undefined,
				model: process.env.OPENAI_EMBEDDING_MODEL || undefined,
			},
			ollama: {
				base_url: process.env.OLLAMA_BASE_URL || undefined,
				model: process.env.OLLAMA_EMBEDDING_MODEL || undefined,
			},
		},
		llm: {
			provider: process.env.LLM_PROVIDER || undefined,
			openai: {
				api_key: process.env.OPENAI_API_KEY || undefined,
				base_url: process.env.OPENAI_BASE_URL || undefined,
				model: process.env.OPENAI_LLM_MODEL || undefined,
			},
			anthropic: {
				api_key: process.env.ANTHROPIC_API_KEY || undefined,
				model: process.env.ANTHROPIC_LLM_MODEL || undefined,
			},
			ollama: {
				base_url: process.env.OLLAMA_BASE_URL || undefined,
				model: process.env.OLLAMA_LLM_MODEL || undefined,
			},
		},
		server: {
			mcp_port: process.env.MCP_PORT || undefined,
			rest_port: process.env.REST_PORT || undefined,
			api_key: process.env.API_KEY || undefined,
		},
	};
}

function findConfigFile(): string | null {
	if (process.env.NENYA_CONFIG) {
		const p = resolve(process.env.NENYA_CONFIG);
		if (existsSync(p)) return p;
		return null;
	}
	const cwd = resolve("nenya.yaml");
	if (existsSync(cwd)) return cwd;
	return null;
}

export function loadConfig(): Config {
	const configPath = findConfigFile();

	let raw: unknown;
	if (configPath) {
		const content = readFileSync(configPath, "utf-8");
		const parsed = parseYaml(content);
		raw = interpolateDeep(parsed ?? {});
	} else {
		raw = configFromEnv();
	}

	const result = configSchema.safeParse(raw);
	if (!result.success) {
		const errors = result.error.issues
			.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
			.join("\n");
		throw new Error(`Invalid configuration:\n${errors}`);
	}

	return result.data;
}

export const config = loadConfig();
