export function parseChatGptExport(json: string): string[] {
	const entries = JSON.parse(json) as unknown[];

	if (!Array.isArray(entries)) {
		throw new Error("ChatGPT export must be a JSON array");
	}

	return entries
		.filter(
			(entry): entry is Record<string, unknown> =>
				entry !== null && typeof entry === "object" && "content" in entry,
		)
		.map((entry) => String(entry.content).trim())
		.filter((content) => content.length > 0);
}
