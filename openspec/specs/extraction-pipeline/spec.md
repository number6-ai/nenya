### Requirement: ExtractionService class with LLM provider injection
The system SHALL implement an `ExtractionService` class that accepts an `LlmProvider` as a constructor argument.

#### Scenario: Service instantiation
- **WHEN** creating a new `ExtractionService` with an LLM provider
- **THEN** the service is ready to extract metadata from text content

### Requirement: Extract metadata from content
The system SHALL provide an `extract(content: string)` method that uses the LLM provider's `generateStructured()` to extract structured metadata from raw text. The method SHALL return an object containing type, entities, actionItems, and summary.

#### Scenario: Extract from meeting notes
- **WHEN** calling `extract("Met with Sarah about the Q4 roadmap. She wants to prioritize mobile. Action: draft mobile spec by Friday.")`
- **THEN** the system returns an object with type "meeting", entities (Sarah as person, Q4 roadmap as topic), actionItems ["draft mobile spec by Friday"], and a one-line summary

#### Scenario: Extract from simple thought
- **WHEN** calling `extract("I think we should use Postgres for this project")`
- **THEN** the system returns type "thought", entities (Postgres as tool), empty actionItems, and a summary

### Requirement: Extraction output schema
The system SHALL define a Zod schema for the extraction output with the following fields: `type` (string), `entities` (array of objects with `name: string` and `type: string`), `actionItems` (array of strings), and `summary` (string).

#### Scenario: Schema validates correct output
- **WHEN** the LLM returns valid structured output matching the schema
- **THEN** the output is parsed and returned as a typed object

#### Scenario: Schema rejects invalid output
- **WHEN** the LLM returns output missing required fields
- **THEN** the LLM provider's validation throws an error (handled by the provider's retry/error logic)

### Requirement: Type classification against known types
The system SHALL validate the extracted type against the `type_definitions` table. If the extracted type does not exist in type_definitions with category "memory", it SHALL fall back to "thought".

#### Scenario: Valid extracted type
- **WHEN** extraction returns type "decision" and "decision" exists in type_definitions
- **THEN** the type "decision" is used as-is

#### Scenario: Invalid extracted type fallback
- **WHEN** extraction returns type "brainstorm" and "brainstorm" does not exist in type_definitions
- **THEN** the type falls back to "thought"

### Requirement: Entity type classification
The system SHALL instruct the LLM to classify each extracted entity as one of the types defined in `type_definitions` with category "entity". The extraction prompt SHALL include the list of valid entity types.

#### Scenario: Entity type extraction
- **WHEN** extracting from "Sarah from Acme Corp mentioned using React"
- **THEN** entities include Sarah (person), Acme Corp (organization), React (tool)

#### Scenario: Unknown entity type fallback
- **WHEN** the LLM classifies an entity with a type not in type_definitions
- **THEN** the entity type falls back to "topic"
