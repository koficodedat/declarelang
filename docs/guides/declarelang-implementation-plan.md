# DeclareLang v0.1.0: Complete Implementation Plan

**Version**: 0.1.0 (Internal Development Release)  
**Target Release**: v1.0.0 (Feature-complete public release)  
**Timeline**: 10-12 weeks to v0.1.0

---

## 🎯 Version Strategy

### v0.1.0 (This Release)

- **Status**: Internal development, not production-ready
- **Purpose**: Core functionality validation, DSL refinement, developer experience testing
- **Scope**: Basic CRUD, essential DSL files, development tooling
- **Output**: Working prototype for feedback and iteration

### v1.0.0 (Future Release)

- **Status**: Production-ready, stable API
- **Purpose**: Full-featured backend framework for real-world use
- **Additional Features**:
  - Advanced relationships (many-to-many)
  - Full-text search
  - Background jobs
  - GraphQL support
  - Plugin system
  - Advanced caching

---

## 📝 DSL Grammar Updates (v0.1.0)

### Query Parameter Syntax (FIXED)

**Inconsistency Resolved**: All query parameters now follow `field as type/operation` pattern

**New Consistent Syntax**:

```dsl
Query parameters for Posts:
- published as boolean
- user id as number
- category id as number
- created at as date range
- title as text contains
- content as text contains
```

**Pattern Rules**:

1. **Type filters**: `field as type` (boolean, number, text)
2. **Range filters**: `field as date range` or `field as number range`
3. **Text search**: `field as text contains` (replaces "contains text")

**Migration from Old Syntax**:

```dsl
# ❌ Old (inconsistent):
- created at range
- title contains text

# ✅ New (consistent):
- created at as date range
- title as text contains
```

---

## 🎮 New Feature: DSL Playground (v0.1.0)

### Overview

Interactive web-based playground for writing and testing DSL syntax with real-time code generation preview.

### Tech Stack (Updated for 2025)

- **Framework**: SolidJS 1.8+ (instead of React - better performance)
- **Editor**: CodeMirror 6 (~300KB instead of Monaco's 5-10MB)
- **Styling**: Tailwind CSS
- **Build**: Vite 6
- **Deployment**: GitHub Pages / Vercel

### Why CodeMirror 6 + SolidJS?

**Performance Benefits**:

- CodeMirror 6: 90% smaller than Monaco (300KB vs 5-10MB)
- SolidJS: True reactivity, no virtual DOM overhead
- Proven by industry: Replit saw 70% mobile retention increase switching to CodeMirror
- Native ES6 modules, perfect for Vite

**Bundle Size Comparison**:

- Monaco Editor: ~5-10MB uncompressed
- CodeMirror 6: ~300KB core + modular additions
- Memory footprint: CodeMirror uses ~1/10th the memory

### Features

- **Live DSL Editor**: Syntax highlighting for all 9 DSL file types
- **Real-time Validation**: Instant error checking with helpful messages
- **Code Preview**: See generated TypeScript, SQL, and config files
- **Example Templates**: Pre-loaded blog, todo, e-commerce examples
- **Share Functionality**: Generate shareable links to DSL configurations
- **Mobile Support**: CodeMirror 6 has excellent mobile support

### Architecture

```
packages/playground/
├── src/
│   ├── components/
│   │   ├── Editor/          # CodeMirror 6-based DSL editor
│   │   │   ├── DSLEditor.tsx
│   │   │   ├── CodeMirrorSetup.ts
│   │   │   └── DSLLanguageMode.ts  # Custom DSL syntax
│   │   ├── Preview/         # Generated code viewer
│   │   │   ├── PreviewPanel.tsx
│   │   │   ├── SQLPreview.tsx
│   │   │   ├── TypeScriptPreview.tsx
│   │   │   └── ConfigPreview.tsx
│   │   ├── ErrorPanel/      # Validation errors
│   │   │   └── ErrorList.tsx
│   │   └── Examples/        # Template selector
│   │       └── TemplateSelector.tsx
│   ├── parser/              # Browser-compatible parser
│   │   ├── tokenizer.ts
│   │   ├── ddl-parser.ts
│   │   └── validator.ts
│   ├── generators/          # Lightweight generators for preview
│   │   ├── drizzle-preview.ts
│   │   ├── sql-preview.ts
│   │   └── types-preview.ts
│   ├── App.tsx              # Main app component
│   └── index.tsx
├── public/
│   └── examples/            # Pre-loaded DSL examples
├── package.json
└── vite.config.ts
```

### CodeMirror 6 Integration Example

```typescript
// src/components/Editor/DSLEditor.tsx
import { createSignal, onMount, onCleanup } from 'solid-js';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

export function DSLEditor(props: { initialValue?: string; onChange?: (value: string) => void }) {
  const [code, setCode] = createSignal(props.initialValue || '');
  let editorContainer: HTMLDivElement;
  let view: EditorView;

  onMount(() => {
    const startState = EditorState.create({
      doc: code(),
      extensions: [
        basicSetup,
        javascript(), // Temporary - will create custom DSL mode
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newCode = update.state.doc.toString();
            setCode(newCode);
            props.onChange?.(newCode);
          }
        }),
      ],
    });

    view = new EditorView({
      state: startState,
      parent: editorContainer,
    });
  });

  onCleanup(() => {
    view?.destroy();
  });

  return (
    <div class="editor-container">
      <div ref={editorContainer!} />
    </div>
  );
}
```

### Custom DSL Language Mode

```typescript
// src/components/Editor/DSLLanguageMode.ts
import { StreamLanguage } from '@codemirror/language';

const dslLanguage = StreamLanguage.define({
  token(stream) {
    // Model declarations
    if (stream.match(/^[A-Z][a-zA-Z0-9]*(\[.*?\])?:/)) {
      return 'keyword';
    }

    // Keywords
    if (stream.match(/^(has|as|belongs to|has many|where|is|and|or)/)) {
      return 'keyword';
    }

    // Types
    if (stream.match(/^(text|long text|number|decimal|boolean|timestamp|json|uuid)/)) {
      return 'type';
    }

    // Constraints
    if (stream.match(/^(unique|required|indexed)/)) {
      return 'modifier';
    }

    // Comments
    if (stream.match(/^#.*/)) {
      return 'comment';
    }

    stream.next();
    return null;
  },
});

export { dslLanguage };
```

### Package Configuration

```json
// packages/playground/package.json
{
  "name": "@declarelang/playground",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "solid-js": "^1.8.22",
    "codemirror": "^6.0.1",
    "@codemirror/state": "^6.4.1",
    "@codemirror/view": "^6.33.0",
    "@codemirror/lang-javascript": "^6.2.2",
    "@codemirror/theme-one-dark": "^6.1.2",
    "@codemirror/commands": "^6.6.2",
    "@codemirror/language": "^6.10.3"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vite-plugin-solid": "^2.10.2"
  }
}
```

### Vite Configuration

```typescript
// packages/playground/vite.config.ts
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  base: '/declarelang/', // For GitHub Pages
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: ['codemirror', '@codemirror/state', '@codemirror/view'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['solid-js', 'codemirror'],
  },
});
```

### Implementation Priority

- **Week 8**: Core playground with CodeMirror 6 + basic DSL syntax
- **Week 9**: Polish, examples, deployment pipeline
- **Goal**: Validate DSL syntax with community before v1.0.0

---

## 🛠️ Monorepo Structure (Vite-based)

```
declarelang/
├── packages/
│   ├── core/                 # Parser + AST (@declarelang/core)
│   │   ├── src/
│   │   │   ├── parser/
│   │   │   │   ├── tokenizer.ts
│   │   │   │   ├── registry.ts
│   │   │   │   ├── ddl-parser.ts
│   │   │   │   ├── dml-parser.ts
│   │   │   │   ├── auth-parser.ts
│   │   │   │   └── ...
│   │   │   ├── ast/
│   │   │   │   ├── types.ts
│   │   │   │   ├── builder.ts
│   │   │   │   └── validator.ts
│   │   │   ├── validators/
│   │   │   │   ├── symbol-table.ts
│   │   │   │   └── reference-validator.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── generators/          # Code generators (@declarelang/generators)
│   │   ├── src/
│   │   │   ├── drizzle/
│   │   │   │   ├── schema-generator.ts
│   │   │   │   └── types-generator.ts
│   │   │   ├── typescript/
│   │   │   │   └── types-generator.ts
│   │   │   ├── sql/
│   │   │   │   └── migration-generator.ts
│   │   │   ├── api/
│   │   │   │   └── routes-generator.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth-generator.ts
│   │   │   │   ├── validation-generator.ts
│   │   │   │   └── logging-generator.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── cli/                 # CLI tool (@declarelang/cli)
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── init.ts
│   │   │   │   ├── generate.ts
│   │   │   │   ├── dev.ts
│   │   │   │   ├── migrate.ts
│   │   │   │   └── validate.ts
│   │   │   ├── utils/
│   │   │   │   ├── config.ts
│   │   │   │   ├── logger.ts
│   │   │   │   └── file-watcher.ts
│   │   │   └── index.ts
│   │   ├── bin/
│   │   │   └── declarelang.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── runtime/             # Runtime utilities (@declarelang/runtime)
│   │   ├── src/
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── validation.ts
│   │   │   │   └── logging.ts
│   │   │   ├── database/
│   │   │   │   ├── connection.ts
│   │   │   │   └── migrations.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── templates/           # Project templates (@declarelang/templates)
│   │   ├── blog/
│   │   ├── todo/
│   │   ├── ecommerce/
│   │   └── package.json
│   │
│   └── playground/          # DSL Playground (NEW in v0.1.0)
│       ├── src/
│       │   ├── components/
│       │   │   ├── Editor/
│       │   │   ├── Preview/
│       │   │   ├── ErrorPanel/
│       │   │   └── Examples/
│       │   ├── parser/
│       │   ├── generators/
│       │   ├── App.tsx
│       │   └── index.tsx
│       ├── public/
│       │   └── examples/
│       ├── package.json
│       └── vite.config.ts
│
├── docs/
│   ├── specs/               # Technical specifications (from Project Knowledge)
│   │   ├── ast-types.ts
│   │   ├── dsl-grammar-spec.md
│   │   ├── type-mapping-spec.md
│   │   ├── migration-file-format-spec.md
│   │   ├── error-code-registry.md
│   │   └── cli-reference.md
│   └── guides/              # Implementation guides
│       ├── declarelang-implementation-plan.md (this file)
│       ├── github-setup-guide.md
│       └── getting-started.md
│
├── examples/
│   └── blog/                # Complete blog example (from Project Knowledge)
│       ├── schema/          # All 9 DSL files
│       │   ├── ddl.dsl
│       │   ├── dml.dsl
│       │   ├── auth.dsl
│       │   ├── validation.dsl
│       │   ├── api.dsl
│       │   ├── monitor.dsl
│       │   ├── log.dsl
│       │   ├── seed.dsl
│       │   └── security.dsl
│       └── README.md
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── release.yml
│   │   └── playground-deploy.yml
│   └── CODEOWNERS
│
├── .husky/
│   ├── pre-commit
│   └── pre-push
│
├── .changeset/
│   ├── config.json
│   └── README.md
│
├── scripts/                 # Build & utility scripts
│
├── package.json             # Root workspace config
├── pnpm-workspace.yaml
├── turbo.json               # Turborepo config
├── tsconfig.json            # Base TypeScript config
├── eslint.config.js         # ESLint flat config v9
├── .prettierrc
├── vitest.config.ts         # Workspace-level test config
├── CONTRIBUTING.md
└── README.md
```

---

## 🔧 Tooling & Development Setup

### Package Manager: pnpm (v9+)

**Why pnpm**:

- Fastest package manager (2025 benchmarks)
- Efficient disk usage (content-addressable store)
- Strict dependency resolution
- Native monorepo support
- Works seamlessly with Vite

### Build Tool: Vite 6

**Why Vite**:

- Lightning-fast HMR
- Native ES modules
- Excellent TypeScript support
- Zero-config for libraries
- Perfect for monorepos

**Configuration per package**:

```typescript
// packages/core/vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DeclareLangCore',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['typescript', 'zod'],
    },
    sourcemap: true,
    minify: false, // Keep readable for v0.1.0
  },
  plugins: [
    dts({
      include: ['src'],
      rollupTypes: true,
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/dist/**'],
    },
  },
});
```

### Testing: Vitest

**Why Vitest** (2025 standard):

- Native ESM & TypeScript support
- Vite-compatible (same config)
- Fastest test runner
- Jest-compatible API
- Better DX than Jest

**Workspace config**:

```typescript
// vitest.config.ts (root)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.config.*', '**/tests/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

### Linting: ESLint 9 (Flat Config)

**Configuration**:

```javascript
// eslint.config.js (root)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2024,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...tseslint.configs['recommended'].rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  prettier,
];
```

### Git Hooks: Husky 9 + lint-staged

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix --max-warnings=0", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

**Hooks**:

```bash
# .husky/pre-commit
pnpm lint-staged
pnpm test --run --changed

# .husky/pre-push
pnpm typecheck
pnpm test --run
pnpm build
```

### Versioning: Changesets

**Why Changesets**:

- Semantic versioning automation
- Independent package versions
- Automatic changelog generation
- GitHub integration
- Release automation

**Workflow**:

```bash
# After making changes
pnpm changeset add          # Create changeset
pnpm changeset version      # Bump versions
pnpm changeset publish      # Publish to npm
```

---

## 🚀 CI/CD Pipeline (GitHub Actions)

### Workflows Overview

1. **ci.yml** - Quality checks, tests, build
2. **release.yml** - Automatic releases via Changesets
3. **playground-deploy.yml** - Deploy playground to GitHub Pages

See `docs/guides/github-setup-guide.md` for complete workflow configurations.

---

## 🎯 v0.1.0 Implementation Timeline

### Week 1-2: Foundation & Parser

**Tasks**:

- ✅ Repository setup with monorepo structure
- ✅ Tooling configuration (ESLint, Prettier, Husky, etc.)
- ✅ CI/CD pipelines
- ⚙️ Tokenizer implementation
- ⚙️ DDL parser
- ⚙️ AST types
- ⚙️ Unit tests (90% coverage goal)

**Deliverable**: Parse blog example ddl.dsl with 0 errors

### Week 3-4: Complete Parsing

**Tasks**:

- ⚙️ Remaining parsers (DML, Auth, Validation, API, etc.)
- ⚙️ Symbol table & validation
- ⚙️ Reference resolution
- ⚙️ Error reporting with helpful messages
- ⚙️ Comprehensive unit tests

**Deliverable**: Valid AST from all 9 blog example DSL files

### Week 5-6: Code Generation

**Tasks**:

- ⚙️ Drizzle schema generator
- ⚙️ TypeScript types generator
- ⚙️ SQL migration generator
- ⚙️ Fastify API generator
- ⚙️ Middleware generators (auth, validation, logging)
- ⚙️ Integration tests

**Deliverable**: Generated code compiles, creates DB tables, working CRUD API

### Week 7-8: Runtime, CLI & Playground Foundation

**Tasks**:

- ⚙️ CLI commands (init, generate, dev, migrate)
- ⚙️ Migration system (apply, rollback)
- ⚙️ Database integration
- ⚙️ Dev server with hot reload
- ⚙️ **Playground setup**: CodeMirror 6 + SolidJS
- ⚙️ **Basic DSL syntax highlighting**
- ⚙️ **Live parsing and validation**

**Deliverable**: CLI works, dev workflow functional, playground foundation ready

### Week 9-10: Polish & Release

**Tasks**:

- ⚙️ **Playground completion**:
  - Code generation preview
  - Example templates
  - Share functionality
  - Mobile optimization
- ⚙️ **Playground deployment** to GitHub Pages
- ⚙️ Documentation site
- ⚙️ End-to-end testing
- ⚙️ Performance optimization
- ⚙️ v0.1.0 release

**Deliverable**: Production-ready v0.1.0 with deployed playground

---

## 📋 Development Workflow

### Using Claude Code + Claude AI

**Claude AI Project** (Architecture & Design):

- Review specifications in `docs/specs/`
- Discuss implementation approach
- Make architectural decisions
- Update documentation
- Design new features

**Claude Code** (Implementation):

- Read specs from `docs/specs/`
- Implement features following specs
- Write tests (TDD approach)
- Ensure type safety
- Run CI checks locally
- Iterate on code

**Handoff Pattern**:

```
1. Design in Claude AI → Update docs/specs/
2. Implement in Claude Code → Read updated specs
3. Review in Claude AI → Iterate
```

### Daily Development

```bash
# Start development mode (auto-rebuild on changes)
pnpm dev

# Run tests in watch mode
pnpm test --watch

# Type check
pnpm typecheck

# Lint & format
pnpm lint:fix
pnpm format

# Build specific package
pnpm --filter @declarelang/core build

# Run playground locally
pnpm --filter @declarelang/playground dev
```

### Making Changes

```bash
# 1. Create feature branch
git checkout -b feature/awesome-feature

# 2. Make changes (using Claude Code)

# 3. Add changeset
pnpm changeset add

# 4. Commit (husky runs pre-commit hooks)
git commit -m "feat: add awesome feature"

# 5. Push (husky runs pre-push hooks)
git push origin feature/awesome-feature

# 6. Create PR on GitHub
```

---

## 🎉 Success Metrics (v0.1.0)

### Functionality

- ✅ All 9 DSL files parse correctly
- ✅ Blog example generates working CRUD API
- ✅ Migrations create & apply successfully
- ✅ **Playground deployed and functional**
- ✅ Dev workflow smooth (< 3s regeneration)

### Quality

- ✅ Parser: >90% test coverage
- ✅ Generators: >85% test coverage
- ✅ Zero TypeScript errors in generated code
- ✅ All linting rules pass
- ✅ CI/CD pipeline fully automated

### Performance

- ✅ **Playground loads in <2s**
- ✅ **CodeMirror editing feels instant**
- ✅ **Bundle size <500KB for playground**
- ✅ Code generation <3s
- ✅ Hot reload <1s

### Developer Experience

- ✅ Clear error messages
- ✅ Fast feedback loops
- ✅ Comprehensive documentation
- ✅ Easy setup (<5 minutes)
- ✅ **Interactive playground for learning**

---

## 🚀 Getting Started

### For Contributors

```bash
# 1. Clone repository
git clone https://github.com/yourusername/declarelang.git
cd declarelang

# 2. Install dependencies
pnpm install

# 3. Build all packages
pnpm build

# 4. Run tests
pnpm test

# 5. Start development
pnpm dev
```

### For Claude Code

```bash
# Read specifications
cat docs/specs/dsl-grammar-spec.md
cat docs/specs/ast-types.ts

# Implement feature
# (Claude Code will use specs as context)

# Run tests
pnpm test

# Check types
pnpm typecheck
```

---

## 📚 Key Documents

### Specifications (docs/specs/)

- **dsl-grammar-spec.md** - Complete DSL syntax
- **ast-types.ts** - AST type definitions
- **type-mapping-spec.md** - Type system
- **migration-file-format-spec.md** - Migration structure
- **error-code-registry.md** - Error codes & messages
- **cli-reference.md** - CLI commands

### Guides (docs/guides/)

- **github-setup-guide.md** - Repository setup
- **declarelang-implementation-plan.md** - This document
- **getting-started.md** - Quick start guide

### Examples (examples/)

- **blog/** - Complete blog platform example (9 DSL files)

---

## 🔮 Future Enhancements (v1.0.0+)

### Planned Features

- Many-to-many relationships
- GraphQL support
- Background jobs
- Full-text search
- Real-time features (WebSockets)
- Multi-tenancy
- Plugin system
- Advanced caching
- Database introspection
- Blue-green deployments

### Playground Enhancements

- Collaborative editing
- Version history
- Export to GitHub
- Template marketplace
- AI-powered suggestions
- Database diagram visualization

---

**Version**: 0.1.0-alpha  
**Last Updated**: October 2025  
**Status**: Ready for Implementation 🚀  
**Next**: Follow `github-setup-guide.md` to create repository
