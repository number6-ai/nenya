import { describe, expect, it } from "vitest";
import { parseChatGptExport } from "../../src/import/chatgpt.js";
import { parseClaudeExport } from "../../src/import/claude.js";

describe("parseClaudeExport", () => {
	it("splits text by newlines and trims", () => {
		const result = parseClaudeExport("memory one\n\nmemory two\n  \nmemory three\n");
		expect(result).toEqual(["memory one", "memory two", "memory three"]);
	});

	it("returns empty array for empty input", () => {
		expect(parseClaudeExport("")).toEqual([]);
		expect(parseClaudeExport("  \n  \n  ")).toEqual([]);
	});

	it("handles single line", () => {
		expect(parseClaudeExport("single memory")).toEqual(["single memory"]);
	});
});

describe("parseChatGptExport", () => {
	it("extracts content from objects", () => {
		const json = JSON.stringify([{ content: "fact one" }, { content: "fact two" }]);
		expect(parseChatGptExport(json)).toEqual(["fact one", "fact two"]);
	});

	it("skips entries without content", () => {
		const json = JSON.stringify([
			{ content: "valid" },
			{ other: "no content field" },
			{ content: "" },
		]);
		expect(parseChatGptExport(json)).toEqual(["valid"]);
	});

	it("returns empty array for empty array input", () => {
		expect(parseChatGptExport("[]")).toEqual([]);
	});

	it("throws on invalid JSON", () => {
		expect(() => parseChatGptExport("not json")).toThrow();
	});

	it("throws on non-array JSON", () => {
		expect(() => parseChatGptExport('{"key": "value"}')).toThrow("must be a JSON array");
	});
});
