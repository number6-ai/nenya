import { describe, expect, it, vi } from "vitest";
import type { Config } from "../../src/config.js";
import { createRestApp } from "../../src/rest/server.js";
import type { MemoryService } from "../../src/services/memory.service.js";

function mockConfig(apiKey?: string): Config {
	return {
		database: { url: "postgresql://test" },
		embedding: {
			provider: "openai",
			dimensions: 1536,
			openai: { base_url: "", model: "", api_key: "" },
			ollama: { base_url: "", model: "" },
		},
		llm: {
			provider: "openai",
			openai: { base_url: "", model: "", api_key: "" },
			anthropic: { model: "", api_key: "" },
			ollama: { base_url: "", model: "" },
		},
		server: { mcp_port: 3100, rest_port: 3101, api_key: apiKey },
	};
}

function mockMemoryService(): MemoryService {
	return {
		remember: vi.fn().mockResolvedValue({
			id: "mem-1",
			type: "meeting",
			entities: [{ name: "Sarah", type: "person" }],
			actionItems: ["draft spec"],
			summary: "Meeting with Sarah about roadmap",
		}),
		recall: vi.fn().mockResolvedValue([
			{
				id: "mem-1",
				content: "Met with Sarah",
				type: "meeting",
				metadata: {},
				createdAt: new Date("2026-03-01"),
				updatedAt: new Date("2026-03-01"),
				similarity: 0.92,
			},
		]),
		forget: vi.fn().mockResolvedValue(undefined),
		update: vi.fn().mockResolvedValue({
			id: "mem-1",
			type: "decision",
			entities: [{ name: "Postgres", type: "tool" }],
			actionItems: [],
			summary: "Decided to use Postgres",
		}),
		listRecent: vi.fn().mockResolvedValue([
			{
				id: "mem-1",
				content: "Recent memory",
				type: "thought",
				metadata: { summary: "A thought" },
				createdAt: new Date("2026-03-01"),
				updatedAt: new Date("2026-03-01"),
			},
		]),
		getById: vi.fn().mockResolvedValue({
			id: "mem-1",
			content: "A memory",
			type: "thought",
			metadata: {},
			createdAt: new Date("2026-03-01"),
			updatedAt: new Date("2026-03-01"),
		}),
		searchByEntity: vi.fn().mockResolvedValue([
			{
				id: "mem-1",
				content: "Met with Sarah",
				type: "meeting",
				metadata: {},
				createdAt: new Date("2026-03-01"),
				updatedAt: new Date("2026-03-01"),
			},
		]),
		stats: vi.fn().mockResolvedValue({
			totalMemories: 42,
			typeDistribution: [{ type: "thought", count: 20 }],
			topEntities: [{ name: "Sarah", type: "person", count: 5 }],
			dailyCounts: [{ date: "2026-03-01", count: 3 }],
		}),
		getContext: vi.fn().mockResolvedValue([
			{
				id: "mem-1",
				content: "Context memory",
				type: "meeting",
				metadata: {},
				createdAt: new Date("2026-03-01"),
				updatedAt: new Date("2026-03-01"),
			},
		]),
	} as unknown as MemoryService;
}

describe("REST Server", () => {
	const config = mockConfig();

	describe("health", () => {
		it("returns ok", async () => {
			const app = createRestApp(mockMemoryService(), config);
			const res = await app.request("/api/v1/health");
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({ status: "ok" });
		});
	});

	describe("POST /api/v1/memories", () => {
		it("creates a memory and returns 201", async () => {
			const svc = mockMemoryService();
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/memories", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "Met with Sarah" }),
			});
			expect(res.status).toBe(201);
			const json = await res.json();
			expect(json.id).toBe("mem-1");
			expect(json.type).toBe("meeting");
			expect(svc.remember).toHaveBeenCalledWith("Met with Sarah", undefined);
		});

		it("passes explicit type", async () => {
			const svc = mockMemoryService();
			const app = createRestApp(svc, config);
			await app.request("/api/v1/memories", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "Use pnpm", type: "preference" }),
			});
			expect(svc.remember).toHaveBeenCalledWith("Use pnpm", "preference");
		});

		it("returns 400 for missing content", async () => {
			const app = createRestApp(mockMemoryService(), config);
			const res = await app.request("/api/v1/memories", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
		});
	});

	describe("GET /api/v1/memories/search", () => {
		it("returns search results", async () => {
			const svc = mockMemoryService();
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/memories/search?query=roadmap");
			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json).toHaveLength(1);
			expect(json[0].similarity).toBe(0.92);
			expect(svc.recall).toHaveBeenCalledWith("roadmap", undefined);
		});

		it("passes limit parameter", async () => {
			const svc = mockMemoryService();
			const app = createRestApp(svc, config);
			await app.request("/api/v1/memories/search?query=test&limit=5");
			expect(svc.recall).toHaveBeenCalledWith("test", 5);
		});

		it("returns 400 without query", async () => {
			const app = createRestApp(mockMemoryService(), config);
			const res = await app.request("/api/v1/memories/search");
			expect(res.status).toBe(400);
		});
	});

	describe("GET /api/v1/memories/recent", () => {
		it("returns recent memories", async () => {
			const svc = mockMemoryService();
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/memories/recent?days=7&type=thought");
			expect(res.status).toBe(200);
			expect(svc.listRecent).toHaveBeenCalledWith({
				days: 7,
				limit: undefined,
				type: "thought",
			});
		});
	});

	describe("GET /api/v1/memories/:id", () => {
		it("returns a single memory", async () => {
			const svc = mockMemoryService();
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/memories/mem-1");
			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.id).toBe("mem-1");
			expect(svc.getById).toHaveBeenCalledWith("mem-1");
		});

		it("returns 404 for missing memory", async () => {
			const svc = mockMemoryService();
			(svc.getById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/memories/missing");
			expect(res.status).toBe(404);
		});
	});

	describe("PUT /api/v1/memories/:id", () => {
		it("updates a memory", async () => {
			const svc = mockMemoryService();
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/memories/mem-1", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "Updated content" }),
			});
			expect(res.status).toBe(200);
			expect(svc.update).toHaveBeenCalledWith("mem-1", "Updated content");
		});

		it("returns 404 for missing memory", async () => {
			const svc = mockMemoryService();
			(svc.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				new Error("Memory not found: bad-id"),
			);
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/memories/bad-id", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "test" }),
			});
			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /api/v1/memories/:id", () => {
		it("deletes a memory and returns 204", async () => {
			const svc = mockMemoryService();
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/memories/mem-1", { method: "DELETE" });
			expect(res.status).toBe(204);
			expect(svc.forget).toHaveBeenCalledWith("mem-1");
		});

		it("returns 404 for missing memory", async () => {
			const svc = mockMemoryService();
			(svc.forget as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				new Error("Memory not found: bad-id"),
			);
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/memories/bad-id", { method: "DELETE" });
			expect(res.status).toBe(404);
		});
	});

	describe("GET /api/v1/entities/:name", () => {
		it("returns entity memories", async () => {
			const svc = mockMemoryService();
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/entities/Sarah");
			expect(res.status).toBe(200);
			expect(svc.searchByEntity).toHaveBeenCalledWith("Sarah", undefined);
		});

		it("passes type filter", async () => {
			const svc = mockMemoryService();
			const app = createRestApp(svc, config);
			await app.request("/api/v1/entities/Nenya?type=project");
			expect(svc.searchByEntity).toHaveBeenCalledWith("Nenya", "project");
		});
	});

	describe("GET /api/v1/stats", () => {
		it("returns stats", async () => {
			const svc = mockMemoryService();
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/stats");
			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.totalMemories).toBe(42);
		});
	});

	describe("POST /api/v1/context", () => {
		it("returns context results", async () => {
			const svc = mockMemoryService();
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/context", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ topic: "Q4 roadmap" }),
			});
			expect(res.status).toBe(200);
			expect(svc.getContext).toHaveBeenCalledWith("Q4 roadmap", undefined);
		});

		it("returns 400 without topic", async () => {
			const app = createRestApp(mockMemoryService(), config);
			const res = await app.request("/api/v1/context", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
		});
	});

	describe("POST /api/v1/import/claude", () => {
		it("imports Claude memories", async () => {
			const svc = mockMemoryService();
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/import/claude", {
				method: "POST",
				headers: { "Content-Type": "text/plain" },
				body: "memory one\nmemory two\nmemory three",
			});
			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.imported).toBe(3);
			expect(json.errors).toEqual([]);
			expect(svc.remember).toHaveBeenCalledTimes(3);
		});

		it("reports partial failures", async () => {
			const svc = mockMemoryService();
			(svc.remember as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({ id: "1" })
				.mockRejectedValueOnce(new Error("boom"))
				.mockResolvedValueOnce({ id: "3" });
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/import/claude", {
				method: "POST",
				headers: { "Content-Type": "text/plain" },
				body: "a\nb\nc",
			});
			const json = await res.json();
			expect(json.imported).toBe(2);
			expect(json.errors).toHaveLength(1);
			expect(json.errors[0].index).toBe(1);
		});
	});

	describe("POST /api/v1/import/chatgpt", () => {
		it("imports ChatGPT memories", async () => {
			const svc = mockMemoryService();
			const app = createRestApp(svc, config);
			const res = await app.request("/api/v1/import/chatgpt", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify([{ content: "fact one" }, { content: "fact two" }]),
			});
			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.imported).toBe(2);
			expect(json.errors).toEqual([]);
		});

		it("returns 400 for invalid JSON", async () => {
			const app = createRestApp(mockMemoryService(), config);
			const res = await app.request("/api/v1/import/chatgpt", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "not json",
			});
			expect(res.status).toBe(400);
		});
	});

	describe("API key auth", () => {
		const authConfig = mockConfig("test-secret");

		it("rejects requests without auth header", async () => {
			const app = createRestApp(mockMemoryService(), authConfig);
			const res = await app.request("/api/v1/memories/search?query=test");
			expect(res.status).toBe(401);
		});

		it("rejects requests with wrong token", async () => {
			const app = createRestApp(mockMemoryService(), authConfig);
			const res = await app.request("/api/v1/memories/search?query=test", {
				headers: { Authorization: "Bearer wrong-key" },
			});
			expect(res.status).toBe(401);
		});

		it("allows requests with correct token", async () => {
			const app = createRestApp(mockMemoryService(), authConfig);
			const res = await app.request("/api/v1/memories/search?query=test", {
				headers: { Authorization: "Bearer test-secret" },
			});
			expect(res.status).toBe(200);
		});

		it("health endpoint bypasses auth", async () => {
			const app = createRestApp(mockMemoryService(), authConfig);
			const res = await app.request("/api/v1/health");
			expect(res.status).toBe(200);
		});
	});
});
