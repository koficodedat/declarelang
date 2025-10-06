# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DeclareLang is a type-safe DSL compiler that generates production-ready CRUD backends with PostgreSQL, Drizzle ORM, and Fastify. The project parses 9 different DSL files (ddl, dml, auth, validation, api, monitor, log, seed, security) and generates TypeScript code for database schemas, API routes, middleware, and configuration.

**Status**: v0.1.0 Alpha (Internal Development)

## Development Commands

### Build and Development

```bash
pnpm install              # Install dependencies (requires pnpm 9+)
pnpm build               # Build all packages via Turbo
pnpm dev                 # Watch mode for all packages (parallel)
```

### Testing

```bash
pnpm test                # Run tests with Vitest
pnpm test:watch          # Watch mode
pnpm test:ui             # Vitest UI
pnpm test:coverage       # Generate coverage report (80% threshold)
```

### Code Quality

```bash
pnpm typecheck           # Type check all packages (runs after build)
pnpm lint                # ESLint check
pnpm lint:fix            # Auto-fix linting issues
pnpm format              # Format with Prettier
pnpm format:check        # Check formatting
```

### Single Test Files

```bash
# Run specific test file
pnpm vitest path/to/file.test.ts

# Run in watch mode
pnpm vitest path/to/file.test.ts --watch
```

### Package-Specific Work

```bash
# Work within a specific package
cd packages/core
pnpm dev                 # Watch mode for this package
pnpm test                # Run tests for this package
pnpm typecheck           # Type check this package
```

## Architecture

### Monorepo Structure

The project uses **pnpm workspaces + Turbo** for monorepo management:

- **packages/core**: Parser and AST (tokenizer + recursive descent parsers for 9 DSL types)
- **packages/generators**: Code generators (Drizzle schema, Fastify routes, middleware)
- **packages/cli**: CLI tool (`framework` command)
- **packages/runtime**: Runtime utilities (DB connection, migration runner)
- **packages/playground**: Interactive web playground (CodeMirror 6 editor)
- **packages/templates**: Project templates (blog, todo, ecommerce)

### Build Dependencies

Turbo tasks have specific dependency chains:

- `build` depends on `^build` (builds dependencies first)
- `test` depends on `build` (needs compiled code)
- `typecheck` depends on `^build` (needs type declarations)
- `dev` is persistent (watch mode)

### DSL Processing Pipeline

```
DSL Files → Tokenizer → Parser → AST → Symbol Table → Generators → TypeScript/SQL
```

1. **Tokenizer**: Converts DSL text to tokens
2. **Parser**: Recursive descent parsers for each DSL type (DDL, DML, AUTH, etc.)
3. **Symbol Table**: Resolves cross-file references (models, fields, relationships)
4. **Generators**: Produce Drizzle schemas, Fastify routes, Zod validators, SQL migrations

### Key Parsing Rules

- **Case sensitivity**: Keywords case-insensitive, identifiers preserve case
- **Identifiers**: Spaces/hyphens → underscores, must start with letter, max 63 chars
- **Relationships**: Always use singular form (`belongs to User`, NOT `belongs to Users`)
- **Time expressions**: Full words only (`5 minutes ago`, NOT `5 mins ago`)
- **Query parameters** (v0.1.0): Consistent `field as type` syntax

## Critical Implementation Details

### DSL Grammar Specification

The complete formal grammar is in `docs/specs/dsl-grammar-spec.md`. Key ambiguities resolved in v0.1.0:

1. **Query parameter syntax** now requires "as" keyword consistently:

   ```dsl
   # Correct
   - published as boolean
   - created_at as date range
   - title as text contains
   ```

2. **Model pluralization** uses bracket syntax:

   ```dsl
   User[s]:              # singular: User, plural: Users
   Categor[y|ies]:       # singular: Category, plural: Categories
   Person[|People]:      # singular: Person, plural: People
   ```

3. **Relationship resolution**: References must use singular form exactly as declared

### Test Coverage Requirements

Vitest coverage thresholds (configured in `vitest.config.ts`):

- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

### Pre-commit Hooks

Git hooks via Husky:

- **pre-commit**: Runs `lint-staged` (ESLint + Prettier on changed files)
- **pre-push**: Runs `pnpm typecheck && pnpm vitest run` (allows "No test files found")

## Documentation Reference

When implementing features, reference these specs in `docs/specs/`:

- **dsl-grammar-spec.md**: Complete EBNF grammar for all 9 DSL types
- **cli-reference.md**: CLI commands (`framework init|generate|dev|migrate|validate|check`)
- **type-mapping-spec.md**: DSL types → PostgreSQL/TypeScript/Zod mapping
- **migration-file-format-spec.md**: Migration file structure and breaking change detection
- **error-code-registry.md**: Standardized error codes and messages

Implementation plan is in `docs/guides/declarelang-implementation-plan.md`.

## Tech Stack

- **Language**: TypeScript (strict mode, ES2022 target)
- **Build**: Vite 6 + vite-plugin-dts
- **Testing**: Vitest (with UI and coverage)
- **Linting**: ESLint 9 + typescript-eslint
- **Formatting**: Prettier
- **Monorepo**: pnpm workspaces + Turbo
- **Hooks**: Husky + lint-staged

## Current Development Workflow

This project is designed for implementation with Claude Code:

1. Read relevant spec files in `docs/specs/` before implementing features
2. Follow the grammar specification precisely (v0.1.0 rules)
3. Ensure type safety throughout (strict TypeScript)
4. Write tests for all new functionality (80% coverage target)
5. Run `pnpm typecheck` and `pnpm test` before committing (enforced by pre-push hook)

## Important Constraints

- **Node.js**: Requires 20+
- **pnpm**: Requires 9+ (specified in `package.json` engines)
- **Database**: PostgreSQL only for v0.1.0
- **Case conversion**: All identifiers with spaces/hyphens convert to underscores
- **Max identifier length**: 63 characters
- **CLI command name**: `framework` (not `declarelang`)
