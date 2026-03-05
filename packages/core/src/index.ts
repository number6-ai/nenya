import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "./config.js";
import * as schema from "./db/schema.js";
import { createEmbeddingProvider } from "./embeddings/index.js";
import { createLlmProvider } from "./llm/index.js";
import { startMcpServer } from "./mcp/server.js";
import { startRestServer } from "./rest/server.js";
import { ExtractionService } from "./services/extraction.service.js";
import { MemoryService } from "./services/memory.service.js";

async function main() {
	const queryClient = postgres(config.database.url);
	const db = drizzle(queryClient, { schema });

	const embeddingProvider = createEmbeddingProvider(config);
	const llmProvider = createLlmProvider(config);
	const extractionService = new ExtractionService(llmProvider);
	const memoryService = new MemoryService(db, embeddingProvider, extractionService);

	await Promise.all([startMcpServer(memoryService), startRestServer(memoryService, config)]);
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
