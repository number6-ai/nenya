import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// We re-import loadConfig fresh each test by using dynamic import + vi.resetModules
describe("config", () => {
	const tmpDir = join(import.meta.dirname, ".tmp-config-test");
	const yamlPath = join(tmpDir, "nenya.yaml");

	beforeEach(() => {
		mkdirSync(tmpDir, { recursive: true });
		vi.resetModules();
	});

	afterEach(() => {
		if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
		vi.unstubAllEnvs();
	});

	async function loadConfigFresh() {
		const mod = await import("../../src/config.js");
		return mod.loadConfig;
	}

	it("loads from YAML file with defaults", async () => {
		writeFileSync(yamlPath, "database:\n  url: postgresql://test:test@localhost:5432/test\n");
		vi.stubEnv("NENYA_CONFIG", yamlPath);

		const loadConfig = await loadConfigFresh();
		const config = loadConfig();

		expect(config.database.url).toBe("postgresql://test:test@localhost:5432/test");
		expect(config.embedding.provider).toBe("openai");
		expect(config.embedding.openai.base_url).toBe("https://api.openai.com/v1");
		expect(config.llm.provider).toBe("openai");
		expect(config.server.mcp_port).toBe(3100);
	});

	it("interpolates ${VAR} from env", async () => {
		writeFileSync(yamlPath, "database:\n  url: ${TEST_DB_URL}\n");
		vi.stubEnv("NENYA_CONFIG", yamlPath);
		vi.stubEnv("TEST_DB_URL", "postgresql://from-env:5432/db");

		const loadConfig = await loadConfigFresh();
		const config = loadConfig();

		expect(config.database.url).toBe("postgresql://from-env:5432/db");
	});

	it("interpolates ${VAR:-default} with fallback", async () => {
		writeFileSync(yamlPath, "database:\n  url: ${MISSING_VAR:-postgresql://fallback:5432/db}\n");
		vi.stubEnv("NENYA_CONFIG", yamlPath);
		vi.unstubAllEnvs();
		vi.stubEnv("NENYA_CONFIG", yamlPath);

		const loadConfig = await loadConfigFresh();
		const config = loadConfig();

		expect(config.database.url).toBe("postgresql://fallback:5432/db");
	});

	it("falls back to env-only mode when no YAML file", async () => {
		vi.stubEnv("NENYA_CONFIG", join(tmpDir, "nonexistent.yaml"));
		vi.stubEnv("DATABASE_URL", "postgresql://env-only:5432/db");

		const loadConfig = await loadConfigFresh();
		const config = loadConfig();

		expect(config.database.url).toBe("postgresql://env-only:5432/db");
	});

	it("throws on missing required database.url", async () => {
		writeFileSync(yamlPath, "embedding:\n  provider: openai\n");
		vi.stubEnv("NENYA_CONFIG", yamlPath);

		await expect(async () => {
			const loadConfig = await loadConfigFresh();
			loadConfig();
		}).rejects.toThrow("database.url");
	});

	it("validates invalid port", async () => {
		writeFileSync(yamlPath, "database:\n  url: postgresql://x:5432/db\nserver:\n  mcp_port: abc\n");
		vi.stubEnv("NENYA_CONFIG", yamlPath);

		await expect(async () => {
			const loadConfig = await loadConfigFresh();
			loadConfig();
		}).rejects.toThrow();
	});

	it("maps legacy env vars in env-only mode", async () => {
		vi.stubEnv("NENYA_CONFIG", join(tmpDir, "nonexistent.yaml"));
		vi.stubEnv("DATABASE_URL", "postgresql://x:5432/db");
		vi.stubEnv("EMBEDDING_PROVIDER", "ollama");
		vi.stubEnv("LLM_PROVIDER", "anthropic");
		vi.stubEnv("OPENAI_BASE_URL", "https://custom.api/v1");

		const loadConfig = await loadConfigFresh();
		const config = loadConfig();

		expect(config.embedding.provider).toBe("ollama");
		expect(config.llm.provider).toBe("anthropic");
		expect(config.llm.openai.base_url).toBe("https://custom.api/v1");
	});
});
