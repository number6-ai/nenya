import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { z } from "zod";
import type { Config } from "../config.js";
import { parseChatGptExport } from "../import/chatgpt.js";
import { parseClaudeExport } from "../import/claude.js";
import type { MemoryService } from "../services/memory.service.js";

const rememberSchema = z.object({
	content: z.string().min(1),
	type: z.string().optional(),
});

const contextSchema = z.object({
	topic: z.string().min(1),
	limit: z.number().int().positive().optional(),
});

export function createRestApp(memoryService: MemoryService, config: Config) {
	const app = new Hono();

	// API key auth middleware (conditional, excludes health)
	if (config.server.api_key) {
		app.use("/api/v1/*", async (c, next) => {
			if (c.req.path === "/api/v1/health") {
				return next();
			}
			const middleware = bearerAuth({ token: config.server.api_key as string });
			return middleware(c, next);
		});
	}

	// Health check (always public)
	app.get("/api/v1/health", (c) => c.json({ status: "ok" }));

	// POST /api/v1/memories (remember)
	app.post("/api/v1/memories", async (c) => {
		const body = await c.req.json();
		const parsed = rememberSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.issues[0].message }, 400);
		}
		try {
			const result = await memoryService.remember(parsed.data.content, parsed.data.type);
			return c.json(result, 201);
		} catch (err) {
			return c.json({ error: (err as Error).message }, 500);
		}
	});

	// GET /api/v1/memories/search (recall)
	app.get("/api/v1/memories/search", async (c) => {
		const query = c.req.query("query");
		if (!query) {
			return c.json({ error: "query parameter is required" }, 400);
		}
		const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
		try {
			const results = await memoryService.recall(query, limit);
			return c.json(results);
		} catch (err) {
			return c.json({ error: (err as Error).message }, 500);
		}
	});

	// GET /api/v1/memories/recent (list_recent)
	app.get("/api/v1/memories/recent", async (c) => {
		const days = c.req.query("days") ? Number(c.req.query("days")) : undefined;
		const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
		const type = c.req.query("type") ?? undefined;
		try {
			const results = await memoryService.listRecent({ days, limit, type });
			return c.json(results);
		} catch (err) {
			return c.json({ error: (err as Error).message }, 500);
		}
	});

	// GET /api/v1/memories/:id (get single memory)
	app.get("/api/v1/memories/:id", async (c) => {
		const id = c.req.param("id");
		try {
			const memory = await memoryService.getById(id);
			if (!memory) {
				return c.json({ error: "Memory not found" }, 404);
			}
			return c.json(memory);
		} catch (err) {
			return c.json({ error: (err as Error).message }, 500);
		}
	});

	// PUT /api/v1/memories/:id (update)
	app.put("/api/v1/memories/:id", async (c) => {
		const id = c.req.param("id");
		const body = await c.req.json();
		const parsed = z.object({ content: z.string().min(1) }).safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.issues[0].message }, 400);
		}
		try {
			const result = await memoryService.update(id, parsed.data.content);
			return c.json(result);
		} catch (err) {
			const message = (err as Error).message;
			if (message.includes("not found")) {
				return c.json({ error: message }, 404);
			}
			return c.json({ error: message }, 500);
		}
	});

	// DELETE /api/v1/memories/:id (forget)
	app.delete("/api/v1/memories/:id", async (c) => {
		const id = c.req.param("id");
		try {
			await memoryService.forget(id);
			return c.body(null, 204);
		} catch (err) {
			const message = (err as Error).message;
			if (message.includes("not found")) {
				return c.json({ error: message }, 404);
			}
			return c.json({ error: message }, 500);
		}
	});

	// GET /api/v1/entities/:name (search_by_entity)
	app.get("/api/v1/entities/:name", async (c) => {
		const name = decodeURIComponent(c.req.param("name"));
		const type = c.req.query("type") ?? undefined;
		try {
			const results = await memoryService.searchByEntity(name, type);
			return c.json(results);
		} catch (err) {
			return c.json({ error: (err as Error).message }, 500);
		}
	});

	// GET /api/v1/stats
	app.get("/api/v1/stats", async (c) => {
		const days = c.req.query("days") ? Number(c.req.query("days")) : undefined;
		try {
			const result = await memoryService.stats(days);
			return c.json(result);
		} catch (err) {
			return c.json({ error: (err as Error).message }, 500);
		}
	});

	// POST /api/v1/context (get_context)
	app.post("/api/v1/context", async (c) => {
		const body = await c.req.json();
		const parsed = contextSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.issues[0].message }, 400);
		}
		try {
			const results = await memoryService.getContext(parsed.data.topic, parsed.data.limit);
			return c.json(results);
		} catch (err) {
			return c.json({ error: (err as Error).message }, 500);
		}
	});

	// POST /api/v1/import/claude
	app.post("/api/v1/import/claude", async (c) => {
		const text = await c.req.text();
		const entries = parseClaudeExport(text);
		const errors: { index: number; error: string }[] = [];
		let imported = 0;

		for (let i = 0; i < entries.length; i++) {
			try {
				await memoryService.remember(entries[i]);
				imported++;
			} catch (err) {
				errors.push({ index: i, error: (err as Error).message });
			}
		}

		return c.json({ imported, errors });
	});

	// POST /api/v1/import/chatgpt
	app.post("/api/v1/import/chatgpt", async (c) => {
		let entries: string[];
		try {
			const text = await c.req.text();
			entries = parseChatGptExport(text);
		} catch (err) {
			return c.json({ error: (err as Error).message }, 400);
		}

		const errors: { index: number; error: string }[] = [];
		let imported = 0;

		for (let i = 0; i < entries.length; i++) {
			try {
				await memoryService.remember(entries[i]);
				imported++;
			} catch (err) {
				errors.push({ index: i, error: (err as Error).message });
			}
		}

		return c.json({ imported, errors });
	});

	return app;
}

export async function startRestServer(memoryService: MemoryService, config: Config) {
	const app = createRestApp(memoryService, config);
	const port = config.server.rest_port;
	serve({ fetch: app.fetch, port });
	console.error(`Nenya REST server running on http://localhost:${port}`);
	return app;
}
