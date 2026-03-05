import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "../../src/db/schema.js";
import type { EmbeddingProvider } from "../../src/embeddings/provider.js";
import type { LlmProvider } from "../../src/llm/provider.js";
import { ExtractionService } from "../../src/services/extraction.service.js";
import { MemoryService } from "../../src/services/memory.service.js";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://nenya:nenya@localhost:5432/nenya";

let queryClient: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle<typeof schema>>;

function fakeEmbedding(): number[] {
	return Array.from({ length: 1536 }, () => Math.random() - 0.5);
}

function mockEmbeddingProvider(): EmbeddingProvider {
	const vectors = new Map<string, number[]>();
	return {
		dimensions: 1536,
		generate: vi.fn(async (text: string) => {
			if (!vectors.has(text)) {
				vectors.set(text, fakeEmbedding());
			}
			return vectors.get(text) ?? fakeEmbedding();
		}),
	};
}

function mockLlmProvider(): LlmProvider {
	return {
		generateStructured: vi.fn(async (prompt: string) => {
			if (prompt.includes("Sarah") && prompt.includes("roadmap")) {
				return {
					type: "meeting",
					entities: [
						{ name: "Sarah", type: "person" },
						{ name: "Q4 roadmap", type: "topic" },
					],
					actionItems: ["draft mobile spec"],
					summary: "Meeting about Q4 roadmap with Sarah",
				};
			}
			if (prompt.includes("Postgres")) {
				return {
					type: "decision",
					entities: [{ name: "Postgres", type: "tool" }],
					actionItems: [],
					summary: "Decided to use Postgres",
				};
			}
			return {
				type: "thought",
				entities: [],
				actionItems: [],
				summary: "A general thought",
			};
		}),
	};
}

async function seedTypes() {
	const memoryTypes = ["thought", "decision", "meeting", "fact", "preference", "insight", "person"];
	const entityTypes = ["person", "project", "topic", "tool", "organization"];

	for (const name of memoryTypes) {
		await db
			.insert(schema.typeDefinitions)
			.values({ name, category: "memory", isDefault: true })
			.onConflictDoNothing();
	}
	for (const name of entityTypes) {
		await db
			.insert(schema.typeDefinitions)
			.values({ name, category: "entity", isDefault: true })
			.onConflictDoNothing();
	}
}

async function cleanTables() {
	await db.delete(schema.memoryEntities);
	await db.delete(schema.memories);
	await db.delete(schema.entities);
}

describe("MemoryService integration", () => {
	let memoryService: MemoryService;
	let embeddingProvider: EmbeddingProvider;

	beforeAll(async () => {
		queryClient = postgres(DATABASE_URL);
		db = drizzle(queryClient, { schema });

		// Ensure pgvector extension exists
		await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
		await seedTypes();

		embeddingProvider = mockEmbeddingProvider();
		const llmProvider = mockLlmProvider();
		const extractionService = new ExtractionService(llmProvider);
		memoryService = new MemoryService(db, embeddingProvider, extractionService);
	});

	afterEach(async () => {
		await cleanTables();
	});

	afterAll(async () => {
		await queryClient.end();
	});

	it("remember + recall round-trip", async () => {
		const result = await memoryService.remember(
			"Met with Sarah about the Q4 roadmap. She wants to prioritize mobile.",
		);

		expect(result.id).toBeDefined();
		expect(result.type).toBe("meeting");
		expect(result.entities).toContainEqual({ name: "Sarah", type: "person" });
		expect(result.summary).toContain("Q4 roadmap");

		const recalled = await memoryService.recall("Q4 roadmap mobile", 5);
		expect(recalled.length).toBeGreaterThan(0);
		expect(recalled[0].content).toContain("Sarah");
		expect(typeof recalled[0].similarity).toBe("number");
	});

	it("remember with explicit type", async () => {
		const result = await memoryService.remember("Always use tabs for indentation", "preference");
		expect(result.type).toBe("preference");
	});

	it("remember with invalid type throws", async () => {
		await expect(memoryService.remember("some content", "nonexistent_type")).rejects.toThrow(
			"Invalid memory type",
		);
	});

	it("forget deletes memory and relationships", async () => {
		const result = await memoryService.remember("Met with Sarah about the Q4 roadmap.");

		await memoryService.forget(result.id);

		const recalled = await memoryService.recall("Sarah roadmap", 5);
		const found = recalled.find((m) => m.id === result.id);
		expect(found).toBeUndefined();
	});

	it("forget non-existent memory throws", async () => {
		await expect(memoryService.forget("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
			"Memory not found",
		);
	});

	it("update changes content and re-extracts", async () => {
		const original = await memoryService.remember("Met with Sarah about the Q4 roadmap.");

		const updated = await memoryService.update(
			original.id,
			"We should use Postgres for the database.",
		);

		expect(updated.type).toBe("decision");
		expect(updated.entities).toContainEqual({ name: "Postgres", type: "tool" });
	});

	it("update non-existent memory throws", async () => {
		await expect(
			memoryService.update("00000000-0000-0000-0000-000000000000", "content"),
		).rejects.toThrow("Memory not found");
	});

	it("listRecent returns recent memories", async () => {
		await memoryService.remember("Met with Sarah about the Q4 roadmap.");
		await memoryService.remember("We should use Postgres for the database.");

		const recent = await memoryService.listRecent();
		expect(recent.length).toBe(2);
		expect(new Date(recent[0].createdAt).getTime()).toBeGreaterThanOrEqual(
			new Date(recent[1].createdAt).getTime(),
		);
	});

	it("listRecent filters by type", async () => {
		await memoryService.remember("Met with Sarah about the Q4 roadmap.");
		await memoryService.remember("We should use Postgres for the database.");

		const meetings = await memoryService.listRecent({ type: "meeting" });
		expect(meetings.every((m) => m.type === "meeting")).toBe(true);
	});

	it("searchByEntity finds memories linked to an entity", async () => {
		await memoryService.remember("Met with Sarah about the Q4 roadmap.");

		const results = await memoryService.searchByEntity("Sarah");
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].content).toContain("Sarah");
	});

	it("searchByEntity with type filter", async () => {
		await memoryService.remember("Met with Sarah about the Q4 roadmap.");

		const personResults = await memoryService.searchByEntity("Sarah", "person");
		expect(personResults.length).toBeGreaterThan(0);

		const projectResults = await memoryService.searchByEntity("Sarah", "project");
		expect(projectResults.length).toBe(0);
	});

	it("searchByEntity returns empty for unknown entity", async () => {
		const results = await memoryService.searchByEntity("Unknown Person");
		expect(results).toEqual([]);
	});

	it("stats returns overview", async () => {
		await memoryService.remember("Met with Sarah about the Q4 roadmap.");
		await memoryService.remember("We should use Postgres for the database.");

		const result = await memoryService.stats();
		expect(result.totalMemories).toBe(2);
		expect(result.typeDistribution.length).toBeGreaterThan(0);
		expect(result.topEntities.length).toBeGreaterThan(0);
	});

	it("getContext combines semantic and entity search", async () => {
		await memoryService.remember("Met with Sarah about the Q4 roadmap.");
		await memoryService.remember("We should use Postgres for the database.");

		const context = await memoryService.getContext("Sarah");
		expect(context.length).toBeGreaterThan(0);
	});
});
