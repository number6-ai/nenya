import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createMcpServer } from "../../src/mcp/server.js";
import type { MemoryService } from "../../src/services/memory.service.js";

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
				content: "Met with Sarah about the roadmap",
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
		searchByEntity: vi.fn().mockResolvedValue([
			{
				id: "mem-1",
				content: "Met with Sarah",
				type: "meeting",
				metadata: { summary: "Meeting with Sarah" },
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
				metadata: { summary: "Context" },
				createdAt: new Date("2026-03-01"),
				updatedAt: new Date("2026-03-01"),
			},
		]),
	} as unknown as MemoryService;
}

describe("MCP Server", () => {
	let client: Client;
	let memService: MemoryService;

	beforeAll(async () => {
		memService = mockMemoryService();
		const server = createMcpServer(memService);
		const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
		await server.connect(serverTransport);
		client = new Client({ name: "test-client", version: "1.0.0" });
		await client.connect(clientTransport);
	});

	afterAll(async () => {
		await client.close();
	});

	it("remember tool calls memoryService.remember", async () => {
		const result = await client.callTool({
			name: "remember",
			arguments: { content: "Met with Sarah about the roadmap" },
		});
		expect(memService.remember).toHaveBeenCalledWith("Met with Sarah about the roadmap", undefined);
		const text = (result.content as Array<{ type: string; text: string }>)[0].text;
		expect(text).toContain("meeting");
		expect(text).toContain("mem-1");
	});

	it("remember tool with explicit type", async () => {
		await client.callTool({
			name: "remember",
			arguments: { content: "Use pnpm", type: "preference" },
		});
		expect(memService.remember).toHaveBeenCalledWith("Use pnpm", "preference");
	});

	it("remember tool handles errors", async () => {
		(memService.remember as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new Error("Invalid memory type"),
		);
		const result = await client.callTool({
			name: "remember",
			arguments: { content: "test" },
		});
		expect(result.isError).toBe(true);
		const text = (result.content as Array<{ type: string; text: string }>)[0].text;
		expect(text).toContain("Invalid memory type");
	});

	it("recall tool returns memories with similarity", async () => {
		const result = await client.callTool({
			name: "recall",
			arguments: { query: "roadmap" },
		});
		expect(memService.recall).toHaveBeenCalledWith("roadmap", undefined);
		const text = (result.content as Array<{ type: string; text: string }>)[0].text;
		expect(text).toContain("0.920");
		expect(text).toContain("meeting");
	});

	it("forget tool deletes memory", async () => {
		const result = await client.callTool({
			name: "forget",
			arguments: { id: "mem-1" },
		});
		expect(memService.forget).toHaveBeenCalledWith("mem-1");
		const text = (result.content as Array<{ type: string; text: string }>)[0].text;
		expect(text).toContain("deleted");
	});

	it("update tool returns updated metadata", async () => {
		const result = await client.callTool({
			name: "update",
			arguments: { id: "mem-1", content: "Use Postgres" },
		});
		expect(memService.update).toHaveBeenCalledWith("mem-1", "Use Postgres");
		const text = (result.content as Array<{ type: string; text: string }>)[0].text;
		expect(text).toContain("decision");
		expect(text).toContain("Postgres");
	});

	it("list_recent tool returns formatted memories", async () => {
		const result = await client.callTool({
			name: "list_recent",
			arguments: { days: 7, type: "thought" },
		});
		expect(memService.listRecent).toHaveBeenCalledWith({
			days: 7,
			limit: undefined,
			type: "thought",
		});
		const text = (result.content as Array<{ type: string; text: string }>)[0].text;
		expect(text).toContain("thought");
	});

	it("search_by_entity tool returns matches", async () => {
		const result = await client.callTool({
			name: "search_by_entity",
			arguments: { entity: "Sarah" },
		});
		expect(memService.searchByEntity).toHaveBeenCalledWith("Sarah", undefined);
		const text = (result.content as Array<{ type: string; text: string }>)[0].text;
		expect(text).toContain("Sarah");
	});

	it("stats tool returns overview", async () => {
		const result = await client.callTool({
			name: "stats",
			arguments: {},
		});
		expect(memService.stats).toHaveBeenCalled();
		const text = (result.content as Array<{ type: string; text: string }>)[0].text;
		expect(text).toContain("42");
		expect(text).toContain("thought");
		expect(text).toContain("Sarah");
	});

	it("get_context tool returns combined results", async () => {
		const result = await client.callTool({
			name: "get_context",
			arguments: { topic: "Q4 roadmap" },
		});
		expect(memService.getContext).toHaveBeenCalledWith("Q4 roadmap", undefined);
		const text = (result.content as Array<{ type: string; text: string }>)[0].text;
		expect(text).toContain("meeting");
	});

	it("lists capture template resources", async () => {
		const resources = await client.listResources();
		const uris = resources.resources.map((r) => r.uri);
		expect(uris).toContain("nenya://templates/decision");
		expect(uris).toContain("nenya://templates/person");
		expect(uris).toContain("nenya://templates/insight");
		expect(uris).toContain("nenya://templates/meeting");
	});

	it("reads a capture template resource", async () => {
		const result = await client.readResource({ uri: "nenya://templates/decision" });
		const text = (result.contents[0] as { text: string }).text;
		expect(text).toContain("Decided");
		expect(text).toContain("Alternatives considered");
	});
});
