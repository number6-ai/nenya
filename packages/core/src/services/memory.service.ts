import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema.js";
import type { EmbeddingProvider } from "../embeddings/provider.js";
import type { ExtractionService } from "./extraction.service.js";

type DB = PostgresJsDatabase<typeof schema>;

export interface RememberResult {
	id: string;
	type: string;
	entities: { name: string; type: string }[];
	actionItems: string[];
	summary: string;
}

export interface MemoryWithScore {
	id: string;
	content: string;
	type: string;
	metadata: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
	similarity: number;
}

export interface MemoryRecord {
	id: string;
	content: string;
	type: string;
	metadata: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

export interface StatsResult {
	totalMemories: number;
	typeDistribution: { type: string; count: number }[];
	topEntities: { name: string; type: string; count: number }[];
	dailyCounts: { date: string; count: number }[];
}

export class MemoryService {
	constructor(
		private db: DB,
		private embedding: EmbeddingProvider,
		private extraction: ExtractionService,
	) {}

	async remember(content: string, type?: string): Promise<RememberResult> {
		if (type) {
			const validTypes = await this.getValidTypes("memory");
			if (!validTypes.includes(type)) {
				throw new Error(`Invalid memory type: "${type}". Valid types: ${validTypes.join(", ")}`);
			}
		}

		const memoryTypes = await this.getValidTypes("memory");
		const entityTypes = await this.getValidTypes("entity");

		const [extractionResult, embeddingVector] = await Promise.all([
			this.extraction.extract(content, memoryTypes, entityTypes),
			this.embedding.generate(content),
		]);

		const finalType = type ?? extractionResult.type;

		const [inserted] = await this.db
			.insert(schema.memories)
			.values({
				content,
				type: finalType,
				embedding: embeddingVector,
				metadata: {
					actionItems: extractionResult.actionItems,
					summary: extractionResult.summary,
				},
			})
			.returning({ id: schema.memories.id });

		for (const entity of extractionResult.entities) {
			await this.db
				.insert(schema.entities)
				.values({ name: entity.name, type: entity.type })
				.onConflictDoNothing();

			const [existing] = await this.db
				.select({ id: schema.entities.id })
				.from(schema.entities)
				.where(and(eq(schema.entities.name, entity.name), eq(schema.entities.type, entity.type)));

			if (existing) {
				await this.db
					.insert(schema.memoryEntities)
					.values({
						memoryId: inserted.id,
						entityId: existing.id,
						relationship: "mentioned_in",
					})
					.onConflictDoNothing();
			}
		}

		return {
			id: inserted.id,
			type: finalType,
			entities: extractionResult.entities,
			actionItems: extractionResult.actionItems,
			summary: extractionResult.summary,
		};
	}

	async recall(query: string, limit = 10): Promise<MemoryWithScore[]> {
		const queryVector = await this.embedding.generate(query);
		const vectorStr = `[${queryVector.join(",")}]`;

		const results = await this.db.execute(sql`
			SELECT id, content, type, metadata, created_at, updated_at,
				1 - (embedding <=> ${vectorStr}::vector) as similarity
			FROM memories
			ORDER BY embedding <=> ${vectorStr}::vector
			LIMIT ${limit}
		`);

		return (results as unknown as Record<string, unknown>[]).map((row) => ({
			id: row.id as string,
			content: row.content as string,
			type: row.type as string,
			metadata: (row.metadata ?? {}) as Record<string, unknown>,
			createdAt: new Date(row.created_at as string),
			updatedAt: new Date(row.updated_at as string),
			similarity: Number(row.similarity),
		}));
	}

	async forget(id: string): Promise<void> {
		const [existing] = await this.db
			.select({ id: schema.memories.id })
			.from(schema.memories)
			.where(eq(schema.memories.id, id));

		if (!existing) {
			throw new Error(`Memory not found: ${id}`);
		}

		await this.db.delete(schema.memories).where(eq(schema.memories.id, id));
	}

	async update(id: string, content: string): Promise<RememberResult> {
		const [existing] = await this.db
			.select({ id: schema.memories.id })
			.from(schema.memories)
			.where(eq(schema.memories.id, id));

		if (!existing) {
			throw new Error(`Memory not found: ${id}`);
		}

		const memoryTypes = await this.getValidTypes("memory");
		const entityTypes = await this.getValidTypes("entity");

		const [extractionResult, embeddingVector] = await Promise.all([
			this.extraction.extract(content, memoryTypes, entityTypes),
			this.embedding.generate(content),
		]);

		await this.db
			.update(schema.memories)
			.set({
				content,
				type: extractionResult.type,
				embedding: embeddingVector,
				metadata: {
					actionItems: extractionResult.actionItems,
					summary: extractionResult.summary,
				},
				updatedAt: new Date(),
			})
			.where(eq(schema.memories.id, id));

		// Remove old relationships and create new ones
		await this.db.delete(schema.memoryEntities).where(eq(schema.memoryEntities.memoryId, id));

		for (const entity of extractionResult.entities) {
			await this.db
				.insert(schema.entities)
				.values({ name: entity.name, type: entity.type })
				.onConflictDoNothing();

			const [found] = await this.db
				.select({ id: schema.entities.id })
				.from(schema.entities)
				.where(and(eq(schema.entities.name, entity.name), eq(schema.entities.type, entity.type)));

			if (found) {
				await this.db
					.insert(schema.memoryEntities)
					.values({
						memoryId: id,
						entityId: found.id,
						relationship: "mentioned_in",
					})
					.onConflictDoNothing();
			}
		}

		return {
			id,
			type: extractionResult.type,
			entities: extractionResult.entities,
			actionItems: extractionResult.actionItems,
			summary: extractionResult.summary,
		};
	}

	async getById(id: string): Promise<MemoryRecord | null> {
		const [result] = await this.db
			.select({
				id: schema.memories.id,
				content: schema.memories.content,
				type: schema.memories.type,
				metadata: schema.memories.metadata,
				createdAt: schema.memories.createdAt,
				updatedAt: schema.memories.updatedAt,
			})
			.from(schema.memories)
			.where(eq(schema.memories.id, id));

		return result ?? null;
	}

	async listRecent(options?: {
		days?: number;
		limit?: number;
		type?: string;
	}): Promise<MemoryRecord[]> {
		const days = options?.days ?? 7;
		const limit = options?.limit ?? 20;
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - days);

		const conditions = [gte(schema.memories.createdAt, cutoff)];
		if (options?.type) {
			conditions.push(eq(schema.memories.type, options.type));
		}

		const results = await this.db
			.select({
				id: schema.memories.id,
				content: schema.memories.content,
				type: schema.memories.type,
				metadata: schema.memories.metadata,
				createdAt: schema.memories.createdAt,
				updatedAt: schema.memories.updatedAt,
			})
			.from(schema.memories)
			.where(and(...conditions))
			.orderBy(desc(schema.memories.createdAt))
			.limit(limit);

		return results;
	}

	async searchByEntity(entity: string, type?: string): Promise<MemoryRecord[]> {
		const entityConditions = [eq(schema.entities.name, entity)];
		if (type) {
			entityConditions.push(eq(schema.entities.type, type));
		}

		const results = await this.db
			.select({
				id: schema.memories.id,
				content: schema.memories.content,
				type: schema.memories.type,
				metadata: schema.memories.metadata,
				createdAt: schema.memories.createdAt,
				updatedAt: schema.memories.updatedAt,
			})
			.from(schema.memories)
			.innerJoin(schema.memoryEntities, eq(schema.memories.id, schema.memoryEntities.memoryId))
			.innerJoin(schema.entities, eq(schema.memoryEntities.entityId, schema.entities.id))
			.where(and(...entityConditions))
			.orderBy(desc(schema.memories.createdAt));

		return results;
	}

	async stats(days = 30): Promise<StatsResult> {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - days);

		const [totalResult] = await this.db
			.select({ count: count() })
			.from(schema.memories)
			.where(gte(schema.memories.createdAt, cutoff));

		const typeDistribution = await this.db
			.select({
				type: schema.memories.type,
				count: count(),
			})
			.from(schema.memories)
			.where(gte(schema.memories.createdAt, cutoff))
			.groupBy(schema.memories.type)
			.orderBy(desc(count()));

		const topEntities = await this.db
			.select({
				name: schema.entities.name,
				type: schema.entities.type,
				count: count(),
			})
			.from(schema.entities)
			.innerJoin(schema.memoryEntities, eq(schema.entities.id, schema.memoryEntities.entityId))
			.innerJoin(schema.memories, eq(schema.memoryEntities.memoryId, schema.memories.id))
			.where(gte(schema.memories.createdAt, cutoff))
			.groupBy(schema.entities.name, schema.entities.type)
			.orderBy(desc(count()))
			.limit(10);

		const dailyCounts = await this.db.execute(sql`
			SELECT date_trunc('day', created_at)::date::text as date, count(*)::int as count
			FROM memories
			WHERE created_at >= ${cutoff.toISOString()}
			GROUP BY date_trunc('day', created_at)
			ORDER BY date_trunc('day', created_at)
		`);

		return {
			totalMemories: totalResult.count,
			typeDistribution: typeDistribution.map((r) => ({
				type: r.type,
				count: r.count,
			})),
			topEntities: topEntities.map((r) => ({
				name: r.name,
				type: r.type,
				count: r.count,
			})),
			dailyCounts: (dailyCounts as unknown as Record<string, unknown>[]).map((r) => ({
				date: r.date as string,
				count: r.count as number,
			})),
		};
	}

	async getContext(topic: string, limit = 20): Promise<MemoryRecord[]> {
		const halfLimit = Math.ceil(limit / 2);

		const [semanticResults, entityResults] = await Promise.all([
			this.recall(topic, halfLimit),
			this.searchByEntity(topic),
		]);

		const seen = new Set<string>();
		const combined: MemoryRecord[] = [];

		for (const mem of semanticResults) {
			if (!seen.has(mem.id)) {
				seen.add(mem.id);
				combined.push({
					id: mem.id,
					content: mem.content,
					type: mem.type,
					metadata: mem.metadata,
					createdAt: mem.createdAt,
					updatedAt: mem.updatedAt,
				});
			}
		}

		for (const mem of entityResults) {
			if (!seen.has(mem.id)) {
				seen.add(mem.id);
				combined.push(mem);
			}
		}

		return combined.slice(0, limit);
	}

	private async getValidTypes(category: string): Promise<string[]> {
		const types = await this.db
			.select({ name: schema.typeDefinitions.name })
			.from(schema.typeDefinitions)
			.where(eq(schema.typeDefinitions.category, category));

		return types.map((t) => t.name);
	}
}
