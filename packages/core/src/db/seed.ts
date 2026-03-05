import { db } from "./client.js";
import { typeDefinitions } from "./schema.js";

const defaultMemoryTypes = [
	"thought",
	"decision",
	"person",
	"insight",
	"meeting",
	"fact",
	"preference",
];

const defaultEntityTypes = ["person", "project", "topic", "tool", "organization"];

async function seed() {
	console.log("Seeding default types...");

	for (const name of defaultMemoryTypes) {
		await db
			.insert(typeDefinitions)
			.values({ name, category: "memory", isDefault: true })
			.onConflictDoNothing();
	}

	for (const name of defaultEntityTypes) {
		await db
			.insert(typeDefinitions)
			.values({ name, category: "entity", isDefault: true })
			.onConflictDoNothing();
	}

	console.log("Seeding complete.");
	process.exit(0);
}

seed().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
