export interface CaptureTemplate {
	name: string;
	description: string;
	template: string;
}

export const captureTemplates: Record<string, CaptureTemplate> = {
	decision: {
		name: "Decision",
		description: "Record a decision with context and alternatives",
		template: "Decided [what] because [why]. Alternatives considered: [list]. Decided by: [who].",
	},
	person: {
		name: "Person",
		description: "Capture information about a person",
		template: "[Name] — [role/relationship]. Key context: [notes]. Contact: [info].",
	},
	insight: {
		name: "Insight",
		description: "Record a realization or insight",
		template: "Realized [what] while [context]. Implication: [so what].",
	},
	meeting: {
		name: "Meeting",
		description: "Summarize a meeting",
		template: "Met with [who] on [topic]. Key points: [list]. Action items: [list].",
	},
};
