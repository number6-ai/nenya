## ADDED Requirements

### Requirement: Claude memory import
The system SHALL expose `POST /api/v1/import/claude` accepting a plain text body (the Claude memory export). It SHALL split the text into individual memories by newline, skip empty lines, and call `MemoryService.remember()` for each entry. It SHALL return a JSON summary with the count of imported memories and any errors.

#### Scenario: Import Claude memories
- **WHEN** a client sends `POST /api/v1/import/claude` with a text body containing 5 non-empty lines
- **THEN** the server creates 5 memories and returns `{ "imported": 5, "errors": [] }`

#### Scenario: Import with some failures
- **WHEN** a client sends a Claude export and 2 out of 5 memories fail to process
- **THEN** the server returns `{ "imported": 3, "errors": [...] }` with error details for the 2 failures

#### Scenario: Empty import
- **WHEN** a client sends `POST /api/v1/import/claude` with an empty body
- **THEN** the server returns `{ "imported": 0, "errors": [] }`

### Requirement: ChatGPT memory import
The system SHALL expose `POST /api/v1/import/chatgpt` accepting a JSON body (the ChatGPT memory export). The export format is a JSON array of objects. Each object has at minimum a string field that contains the memory content. The system SHALL extract the content from each entry and call `MemoryService.remember()` for each. It SHALL return a JSON summary with the count of imported memories and any errors.

#### Scenario: Import ChatGPT memories
- **WHEN** a client sends `POST /api/v1/import/chatgpt` with a JSON array of 3 memory objects
- **THEN** the server creates 3 memories and returns `{ "imported": 3, "errors": [] }`

#### Scenario: Import with some failures
- **WHEN** a client sends a ChatGPT export and 1 out of 3 memories fails to process
- **THEN** the server returns `{ "imported": 2, "errors": [...] }` with error details

#### Scenario: Empty array
- **WHEN** a client sends `POST /api/v1/import/chatgpt` with `[]`
- **THEN** the server returns `{ "imported": 0, "errors": [] }`

### Requirement: Claude import parser
The Claude import parser SHALL be a standalone function that takes a plain text string and returns an array of non-empty trimmed strings, one per memory.

#### Scenario: Parse multiline text
- **WHEN** the parser receives `"memory one\n\nmemory two\n  \nmemory three\n"`
- **THEN** it returns `["memory one", "memory two", "memory three"]`

### Requirement: ChatGPT import parser
The ChatGPT import parser SHALL be a standalone function that takes a JSON string, parses it as an array, and extracts the content string from each object. It SHALL skip entries without valid content.

#### Scenario: Parse valid JSON array
- **WHEN** the parser receives `[{"content":"fact one"},{"content":"fact two"}]`
- **THEN** it returns `["fact one", "fact two"]`

#### Scenario: Skip entries without content
- **WHEN** the parser receives `[{"content":"valid"},{"other":"no content field"},{"content":""}]`
- **THEN** it returns `["valid"]`
