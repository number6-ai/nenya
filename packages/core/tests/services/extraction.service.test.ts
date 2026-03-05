import { describe, expect, it, vi } from "vitest";
import type { LlmProvider } from "../../src/llm/provider.js";
import { ExtractionService } from "../../src/services/extraction.service.js";

function mockLlm(result: unknown): LlmProvider {
	return {
		generateStructured: vi.fn().mockResolvedValue(result),
	};
}

const memoryTypes = ["thought", "decision", "meeting", "fact", "preference"];
const entityTypes = ["person", "project", "topic", "tool", "organization"];

describe("ExtractionService", () => {
	it("extracts metadata from content", async () => {
		const llm = mockLlm({
			type: "meeting",
			entities: [
				{ name: "Sarah", type: "person" },
				{ name: "Q4 roadmap", type: "topic" },
			],
			actionItems: ["draft mobile spec by Friday"],
			summary: "Meeting with Sarah about Q4 roadmap",
		});
		const service = new ExtractionService(llm);

		const result = await service.extract(
			"Met with Sarah about the Q4 roadmap.",
			memoryTypes,
			entityTypes,
		);

		expect(result.type).toBe("meeting");
		expect(result.entities).toHaveLength(2);
		expect(result.entities[0]).toEqual({ name: "Sarah", type: "person" });
		expect(result.actionItems).toEqual(["draft mobile spec by Friday"]);
		expect(result.summary).toBe("Meeting with Sarah about Q4 roadmap");
	});

	it("falls back to 'thought' for invalid memory type", async () => {
		const llm = mockLlm({
			type: "brainstorm",
			entities: [],
			actionItems: [],
			summary: "A thought",
		});
		const service = new ExtractionService(llm);

		const result = await service.extract("some content", memoryTypes, entityTypes);

		expect(result.type).toBe("thought");
	});

	it("falls back to 'topic' for invalid entity type", async () => {
		const llm = mockLlm({
			type: "fact",
			entities: [{ name: "React", type: "framework" }],
			actionItems: [],
			summary: "A fact about React",
		});
		const service = new ExtractionService(llm);

		const result = await service.extract("React is popular", memoryTypes, entityTypes);

		expect(result.entities[0]).toEqual({ name: "React", type: "topic" });
	});

	it("passes memory and entity types in the prompt", async () => {
		const llm = mockLlm({
			type: "thought",
			entities: [],
			actionItems: [],
			summary: "test",
		});
		const service = new ExtractionService(llm);

		await service.extract("test content", memoryTypes, entityTypes);

		const call = (llm.generateStructured as ReturnType<typeof vi.fn>).mock.calls[0];
		const prompt = call[0] as string;
		expect(prompt).toContain("thought, decision, meeting, fact, preference");
		expect(prompt).toContain("person, project, topic, tool, organization");
		expect(prompt).toContain("test content");
	});
});
