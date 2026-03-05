### Requirement: pnpm workspace monorepo
The project SHALL use pnpm workspaces with a root `pnpm-workspace.yaml` defining two packages: `packages/core` and `packages/web`.

#### Scenario: Workspace resolution
- **WHEN** running `pnpm install` from the repository root
- **THEN** dependencies for both `packages/core` and `packages/web` are installed and workspace links are resolved

### Requirement: TypeScript configuration
The project SHALL have a root `tsconfig.json` with shared compiler options and per-package `tsconfig.json` files that extend it. Target SHALL be ES2022 with ESM module resolution.

#### Scenario: Type checking passes on empty project
- **WHEN** running `pnpm --filter @nenya/core exec tsc --noEmit`
- **THEN** the command exits with code 0

### Requirement: Biome linting
The project SHALL use Biome for linting and formatting with a root `biome.json` configuration.

#### Scenario: Lint passes on scaffolded code
- **WHEN** running `pnpm lint` from the root
- **THEN** Biome reports no errors or warnings

### Requirement: Vitest testing
The `packages/core` package SHALL use Vitest as the test runner with a `vitest.config.ts` configuration file.

#### Scenario: Test runner executes
- **WHEN** running `pnpm --filter @nenya/core test`
- **THEN** Vitest runs and reports results (0 tests is acceptable for scaffolding)

### Requirement: Package naming convention
The core package SHALL be named `@nenya/core` and the web package SHALL be named `@nenya/web` in their respective `package.json` files.

#### Scenario: Package names are correct
- **WHEN** reading `packages/core/package.json`
- **THEN** the `name` field is `@nenya/core`

### Requirement: Web package placeholder
The `packages/web` package SHALL exist as a minimal placeholder with only a `package.json` and a `README.md` noting it is reserved for the frontend.

#### Scenario: Web package exists but is empty
- **WHEN** listing files in `packages/web/`
- **THEN** only `package.json` and `README.md` exist
