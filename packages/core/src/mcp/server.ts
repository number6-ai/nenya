import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { MemoryService } from "../services/memory.service.js";
import { captureTemplates } from "../templates/capture.js";

function formatMemory(mem: {
	id: string;
	content: string;
	type: string;
	createdAt: Date;
	metadata: Record<string, unknown>;
}) {
	return `[${mem.type}] ${mem.content}\n  ID: ${mem.id}\n  Created: ${mem.createdAt.toISOString()}\n  Summary: ${(mem.metadata as Record<string, unknown>).summary ?? ""}`;
}

export function createMcpServer(memoryService: MemoryService) {
	const server = new McpServer({
		name: "nenya",
		version: "0.1.0",
	});

	server.registerTool(
		"remember",
		{
			title: "Remember",
			description:
				"Capture a thought, decision, meeting note, or any content. LLM extracts metadata, entities, and generates embedding automatically.",
			inputSchema: z.object({
				content: z.string().describe("The content to remember"),
				type: z
					.string()
					.optional()
					.describe("Optional memory type (e.g. thought, decision, meeting, fact, preference)"),
			}),
		},
		async ({ content, type }) => {
			try {
				const result = await memoryService.remember(content, type);
				return {
					content: [
						{
							type: "text" as const,
							text: `Remembered (${result.type}): ${result.summary}\nID: ${result.id}\nEntities: ${result.entities.map((e) => `${e.name} (${e.type})`).join(", ") || "none"}\nAction items: ${result.actionItems.join(", ") || "none"}`,
						},
					],
				};
			} catch (err) {
				return {
					content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
					isError: true,
				};
			}
		},
	);

	server.registerTool(
		"recall",
		{
			title: "Recall",
			description: "Search memories by meaning using semantic similarity.",
			inputSchema: z.object({
				query: z.string().describe("What to search for"),
				limit: z.number().optional().describe("Max results (default 10)"),
			}),
		},
		async ({ query, limit }) => {
			try {
				const results = await memoryService.recall(query, limit);
				if (results.length === 0) {
					return { content: [{ type: "text" as const, text: "No memories found." }] };
				}
				const text = results
					.map(
						(m, i) =>
							`${i + 1}. [${m.type}] ${m.content}\n   Similarity: ${m.similarity.toFixed(3)} | ID: ${m.id}`,
					)
					.join("\n\n");
				return { content: [{ type: "text" as const, text }] };
			} catch (err) {
				return {
					content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
					isError: true,
				};
			}
		},
	);

	server.registerTool(
		"forget",
		{
			title: "Forget",
			description: "Delete a memory and its entity relationships.",
			inputSchema: z.object({
				id: z.string().describe("Memory ID to delete"),
			}),
		},
		async ({ id }) => {
			try {
				await memoryService.forget(id);
				return {
					content: [{ type: "text" as const, text: `Memory ${id} deleted.` }],
				};
			} catch (err) {
				return {
					content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
					isError: true,
				};
			}
		},
	);

	server.registerTool(
		"update",
		{
			title: "Update",
			description: "Update a memory's content. Re-extracts metadata and regenerates embedding.",
			inputSchema: z.object({
				id: z.string().describe("Memory ID to update"),
				content: z.string().describe("New content"),
			}),
		},
		async ({ id, content }) => {
			try {
				const result = await memoryService.update(id, content);
				return {
					content: [
						{
							type: "text" as const,
							text: `Updated (${result.type}): ${result.summary}\nEntities: ${result.entities.map((e) => `${e.name} (${e.type})`).join(", ") || "none"}`,
						},
					],
				};
			} catch (err) {
				return {
					content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
					isError: true,
				};
			}
		},
	);

	server.registerTool(
		"list_recent",
		{
			title: "List Recent",
			description: "Browse recent memories with optional filters.",
			inputSchema: z.object({
				days: z.number().optional().describe("Number of days to look back (default 7)"),
				limit: z.number().optional().describe("Max results (default 20)"),
				type: z.string().optional().describe("Filter by memory type"),
			}),
		},
		async ({ days, limit, type }) => {
			try {
				const results = await memoryService.listRecent({ days, limit, type });
				if (results.length === 0) {
					return { content: [{ type: "text" as const, text: "No recent memories found." }] };
				}
				const text = results.map((m) => formatMemory(m)).join("\n\n");
				return { content: [{ type: "text" as const, text }] };
			} catch (err) {
				return {
					content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
					isError: true,
				};
			}
		},
	);

	server.registerTool(
		"search_by_entity",
		{
			title: "Search by Entity",
			description: "Find all memories related to a named entity.",
			inputSchema: z.object({
				entity: z.string().describe("Entity name to search for"),
				type: z.string().optional().describe("Entity type filter (e.g. person, project, tool)"),
			}),
		},
		async ({ entity, type }) => {
			try {
				const results = await memoryService.searchByEntity(entity, type);
				if (results.length === 0) {
					return {
						content: [{ type: "text" as const, text: `No memories found for entity "${entity}".` }],
					};
				}
				const text = results.map((m) => formatMemory(m)).join("\n\n");
				return { content: [{ type: "text" as const, text }] };
			} catch (err) {
				return {
					content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
					isError: true,
				};
			}
		},
	);

	server.registerTool(
		"stats",
		{
			title: "Stats",
			description: "Overview of memory store: total count, type distribution, top entities.",
			inputSchema: z.object({
				days: z.number().optional().describe("Timeframe in days (default 30)"),
			}),
		},
		async ({ days }) => {
			try {
				const result = await memoryService.stats(days);
				const lines = [
					`Total memories: ${result.totalMemories}`,
					"",
					"Type distribution:",
					...result.typeDistribution.map((t) => `  ${t.type}: ${t.count}`),
					"",
					"Top entities:",
					...result.topEntities.map((e) => `  ${e.name} (${e.type}): ${e.count} memories`),
				];
				return { content: [{ type: "text" as const, text: lines.join("\n") }] };
			} catch (err) {
				return {
					content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
					isError: true,
				};
			}
		},
	);

	server.registerTool(
		"get_context",
		{
			title: "Get Context",
			description: "Build rich context for a topic by combining semantic search and entity search.",
			inputSchema: z.object({
				topic: z.string().describe("Topic to get context for"),
				limit: z.number().optional().describe("Max results (default 20)"),
			}),
		},
		async ({ topic, limit }) => {
			try {
				const results = await memoryService.getContext(topic, limit);
				if (results.length === 0) {
					return {
						content: [{ type: "text" as const, text: `No context found for "${topic}".` }],
					};
				}
				const text = results.map((m) => formatMemory(m)).join("\n\n");
				return { content: [{ type: "text" as const, text }] };
			} catch (err) {
				return {
					content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
					isError: true,
				};
			}
		},
	);

	// Register capture template resources
	for (const [key, template] of Object.entries(captureTemplates)) {
		server.registerResource(
			`template-${key}`,
			`nenya://templates/${key}`,
			{
				title: `${template.name} Template`,
				description: template.description,
				mimeType: "text/plain",
			},
			async (uri) => ({
				contents: [
					{
						uri: uri.href,
						mimeType: "text/plain",
						text: template.template,
					},
				],
			}),
		);
	}

	return server;
}

export async function startMcpServer(memoryService: MemoryService) {
	const server = createMcpServer(memoryService);
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Nenya MCP server running on stdio");
	return server;
}
