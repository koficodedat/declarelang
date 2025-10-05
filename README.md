# DeclareLang

[![CI](https://github.com/yourusername/declarelang/workflows/CI/badge.svg)](https://github.com/yourusername/declarelang/actions)
[![codecov](https://codecov.io/gh/yourusername/declarelang/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/declarelang)
[![npm version](https://badge.fury.io/js/%40declarelang%2Fcore.svg)](https://www.npmjs.com/package/@declarelang/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Type-safe DSL for generating production-ready CRUD backends with PostgreSQL, Drizzle, and Fastify

**Status**: v0.1.0 Alpha (Internal Development)

[🎮 Try the Playground](https://yourusername.github.io/declarelang) | [📚 Documentation](./docs) | [💬 Discussions](https://github.com/yourusername/declarelang/discussions)

---

## What is DeclareLang?

DeclareLang lets you define your backend using simple, readable DSL files. Write your schema once, get a complete CRUD API with authentication, validation, logging, and monitoring.

**Input** (9 DSL files):

```
schema/
├── ddl.dsl        # Database schema
├── dml.dsl        # Queries & mutations
├── auth.dsl       # Authorization rules
├── validation.dsl # Input validation
├── api.dsl        # API configuration
├── monitor.dsl    # Observability
├── log.dsl        # Logging rules
├── seed.dsl       # Initial data
└── security.dsl   # Security constraints
```

**Output**: Complete TypeScript backend

- 🗄️ PostgreSQL schema via Drizzle ORM
- 🚀 Fastify REST API with full CRUD
- 🔒 JWT authentication & role-based authorization
- ✅ Zod validation schemas
- 📊 Built-in logging & monitoring
- 🔄 Database migration system

---

## Quick Start

### Install

```bash
npm install -g @declarelang/cli
```

### Create Project

```bash
declarelang init my-blog --template blog
cd my-blog
```

### Define Schema

```dsl
# schema/ddl.dsl
User[s]:
- has email as unique text and required
- has username as unique text and required
- has password as text and required
- has many Post

Post[s]:
- has title as text and required
- has content as long text and required
- has published as boolean
- belongs to User
```

### Generate & Run

```bash
declarelang generate
declarelang dev --auto-migrate

# API now running at http://localhost:3000
# GET    /posts
# POST   /posts
# GET    /posts/:id
# PUT    /posts/:id
# DELETE /posts/:id
```

---

## Features

### ✨ Declarative Schema

- Natural, readable syntax
- Single source of truth for your entire backend
- No boilerplate code to write

### 🎯 Type-Safe

- Generated TypeScript types for models
- End-to-end type safety from DB to API
- Zod schemas for runtime validation

### 🔒 Security Built-In

- JWT authentication
- Role-based access control
- Field-level permissions
- SQL injection protection
- XSS prevention

### 📊 Production-Ready

- Structured logging with request tracing
- Prometheus-compatible metrics
- Error tracking
- Performance monitoring

### 🔄 Migration System

- Automatic migration generation from DSL changes
- Safe rollbacks
- Breaking change detection
- Data migration support

### 🚀 Developer Experience

- Hot reload in development
- Helpful error messages
- Interactive playground
- Comprehensive documentation

---

## Example

See the complete [blog platform example](./examples/blog) with all 9 DSL files demonstrating:

- User authentication & roles
- Post CRUD with categories & tags
- Comment moderation
- View tracking
- Rate limiting
- Audit logging

---

## Architecture

```
DSL Files → Parser → AST → Generators → Production Code
```

**Parsers** (packages/core):

- Tokenizer + recursive descent parsers for each DSL
- Symbol table for cross-file reference resolution
- Comprehensive error reporting

**Generators** (packages/generators):

- Drizzle schema & TypeScript types
- Fastify routes & handlers
- Auth, validation, logging middleware
- SQL migrations

**Runtime** (packages/runtime):

- Database connection & query execution
- Migration runner
- Request/response middleware

**CLI** (packages/cli):

- Project initialization
- Code generation
- Development server
- Migration management

---

## Documentation

- [Getting Started](./docs/guides/getting-started.md)
- [DSL Grammar Specification](./docs/specs/dsl-grammar-spec.md)
- [CLI Reference](./docs/specs/cli-reference.md)
- [Type Mapping](./docs/specs/type-mapping-spec.md)
- [Migration Guide](./docs/specs/migration-file-format-spec.md)
- [Error Codes](./docs/specs/error-code-registry.md)

---

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+

### Setup

```bash
git clone https://github.com/yourusername/declarelang.git
cd declarelang
pnpm install
pnpm build
pnpm test
```

### Workflow

```bash
pnpm dev              # Watch mode for all packages
pnpm test:watch       # Run tests in watch mode
pnpm typecheck        # Type check all packages
pnpm lint:fix         # Fix linting issues
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## Packages

| Package                                          | Version                                                      | Description       |
| ------------------------------------------------ | ------------------------------------------------------------ | ----------------- |
| [@declarelang/core](./packages/core)             | ![npm](https://img.shields.io/npm/v/@declarelang/core)       | Parser & AST      |
| [@declarelang/generators](./packages/generators) | ![npm](https://img.shields.io/npm/v/@declarelang/generators) | Code generators   |
| [@declarelang/cli](./packages/cli)               | ![npm](https://img.shields.io/npm/v/@declarelang/cli)        | CLI tool          |
| [@declarelang/runtime](./packages/runtime)       | ![npm](https://img.shields.io/npm/v/@declarelang/runtime)    | Runtime utilities |

---

## Roadmap

### v0.1.0 (Current)

- ✅ Core DSL parsing
- ✅ Code generation (Drizzle, TypeScript, SQL)
- ✅ Basic CRUD operations
- ✅ Development workflow
- 🚧 Interactive playground

### v1.0.0 (Target: Q1 2026)

- Many-to-many relationships
- Full-text search
- GraphQL support
- Background jobs
- Advanced caching
- Plugin system

---

## Tech Stack

- **Language**: TypeScript
- **Parser**: Custom recursive descent
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **API Framework**: Fastify
- **Validation**: Zod
- **Testing**: Vitest
- **Build**: Vite 6
- **Monorepo**: pnpm workspaces + Turbo

---

## Community

- [GitHub Discussions](https://github.com/yourusername/declarelang/discussions)
- [Issues](https://github.com/yourusername/declarelang/issues)
- [Discord](https://discord.gg/declarelang) (Coming soon)

---

## License

MIT © [Your Name](https://github.com/yourusername)

---

## Acknowledgments

Inspired by:

- Prisma's declarative schema
- Django's batteries-included philosophy
- Rails' convention over configuration

Built with modern tools:

- Drizzle ORM for type-safe database access
- Fastify for high-performance APIs
- CodeMirror 6 for the playground editor
