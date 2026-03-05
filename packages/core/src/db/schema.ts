import {
	boolean,
	index,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uuid,
	vector,
} from "drizzle-orm/pg-core";

export const memories = pgTable(
	"memories",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		content: text("content").notNull(),
		type: text("type").notNull(),
		embedding: vector("embedding", { dimensions: 1536 }),
		metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("memories_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
		index("memories_type_idx").on(table.type),
		index("memories_created_at_idx").on(table.createdAt),
	],
);

export const entities = pgTable(
	"entities",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		name: text("name").notNull(),
		type: text("type").notNull(),
		metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		unique("entities_name_type_unique").on(table.name, table.type),
		index("entities_name_idx").on(table.name),
		index("entities_type_idx").on(table.type),
	],
);

export const memoryEntities = pgTable(
	"memory_entities",
	{
		memoryId: uuid("memory_id")
			.notNull()
			.references(() => memories.id, { onDelete: "cascade" }),
		entityId: uuid("entity_id")
			.notNull()
			.references(() => entities.id, { onDelete: "cascade" }),
		relationship: text("relationship").notNull(),
	},
	(table) => [primaryKey({ columns: [table.memoryId, table.entityId, table.relationship] })],
);

export const typeDefinitions = pgTable(
	"type_definitions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		name: text("name").notNull(),
		category: text("category").notNull(),
		description: text("description"),
		isDefault: boolean("is_default").default(false).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [unique("type_definitions_name_category_unique").on(table.name, table.category)],
);
