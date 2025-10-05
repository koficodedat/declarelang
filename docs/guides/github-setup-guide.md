# DeclareLang v0.1.0 - GitHub Repository Setup Guide

Complete guide for setting up the DeclareLang monorepo with 2025 best practices, including file organization and dual Claude workflow.

---

## 📋 Prerequisites

```bash
# Node.js 20+ (LTS) or 22 (Latest)
node -v  # Should be >= 20.0.0

# pnpm 9+
npm install -g pnpm@latest
pnpm -v  # Should be >= 9.0.0

# Git
git --version

# Claude Code (for implementation)
# Claude AI Project (for design & architecture discussions)
```

---

## 🚀 Initial Repository Setup

### 1. Create GitHub Repository

```bash
# Using GitHub CLI (recommended)
gh repo create declarelang \
  --public \
  --description "Type-safe DSL for generating CRUD backends" \
  --gitignore Node \
  --license MIT \
  --clone

cd declarelang

# Or manual: Create on github.com, then:
# git clone https://github.com/yourusername/declarelang.git
# cd declarelang
```

### 2. Initialize pnpm Workspace

```bash
# Initialize package.json
pnpm init

# Create workspace config
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
EOF

# Create directory structure
mkdir -p packages/{core,generators,cli,runtime,templates,playground}
mkdir -p .github/workflows
mkdir -p docs/{specs,guides,examples}
mkdir -p examples/blog
mkdir -p scripts
```

---

## 📁 File Organization from Project Knowledge

### Copy Project Knowledge Files to Repository

```bash
# 1. Core Specifications → docs/specs/
mkdir -p docs/specs
cp ast-types.ts docs/specs/
cp dsl-grammar-spec.md docs/specs/
cp type-mapping-spec.md docs/specs/
cp migration-file-format-spec.md docs/specs/
cp error-code-registry.md docs/specs/
cp cli-reference.md docs/specs/

# 2. Blog Example → examples/blog/schema/
mkdir -p examples/blog/schema
cp ddl.dsl examples/blog/schema/
cp dml.dsl examples/blog/schema/
cp auth.dsl examples/blog/schema/
cp validation.dsl examples/blog/schema/
cp api.dsl examples/blog/schema/
cp monitor.dsl examples/blog/schema/
cp log.dsl examples/blog/schema/
cp seed.dsl examples/blog/schema/
cp security.dsl examples/blog/schema/
cp README.md examples/blog/  # Blog example overview

# 3. Implementation Plan → docs/guides/
mkdir -p docs/guides
cp declarelang-implementation-plan.md docs/guides/

# 4. This setup guide → docs/guides/
cp github-setup-guide.md docs/guides/

# Note: implementation-ready-summary.md is DELETED (redundant with implementation-plan)
```

### Final docs/ Structure

```
docs/
├── specs/                          # Technical specifications
│   ├── ast-types.ts
│   ├── dsl-grammar-spec.md
│   ├── type-mapping-spec.md
│   ├── migration-file-format-spec.md
│   ├── error-code-registry.md
│   └── cli-reference.md
├── guides/                         # Implementation & setup guides
│   ├── declarelang-implementation-plan.md
│   ├── github-setup-guide.md
│   └── getting-started.md          # To be created
└── examples/                       # Code examples (link to ../examples/)

examples/
└── blog/                           # Complete blog example
    ├── schema/                     # All 9 DSL files
    │   ├── ddl.dsl
    │   ├── dml.dsl
    │   ├── auth.dsl
    │   ├── validation.dsl
    │   ├── api.dsl
    │   ├── monitor.dsl
    │   ├── log.dsl
    │   ├── seed.dsl
    │   └── security.dsl
    ├── README.md                   # Example overview
    └── .gitkeep                    # For generated/ folder
```

---

## ⚙️ Root Configuration Files

### package.json

```json
{
  "name": "declarelang",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Type-safe DSL for generating CRUD backends with PostgreSQL, Drizzle, and Fastify",
  "keywords": ["dsl", "crud", "backend", "code-generation", "typescript", "drizzle", "fastify"],
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/declarelang.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/declarelang/issues"
  },
  "homepage": "https://github.com/yourusername/declarelang#readme",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.11.0",
  "scripts": {
    "dev": "pnpm --parallel --filter './packages/*' dev",
    "build": "turbo run build",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "typecheck": "turbo run typecheck",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "clean": "turbo run clean && rm -rf node_modules",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "pnpm build && changeset publish",
    "prepare": "husky"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.1",
    "@types/node": "^22.5.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "@vitest/coverage-v8": "^2.0.5",
    "@vitest/ui": "^2.0.5",
    "eslint": "^9.9.0",
    "eslint-config-prettier": "^9.1.0",
    "husky": "^9.1.4",
    "lint-staged": "^15.2.9",
    "prettier": "^3.3.3",
    "turbo": "^2.1.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vite-plugin-dts": "^4.0.3",
    "vitest": "^2.0.5"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,

    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "allowSyntheticDefaultImports": true,

    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    "composite": true,
    "incremental": true
  },
  "exclude": ["node_modules", "dist", ".turbo", "**/coverage"]
}
```

### eslint.config.js (Flat Config v9)

```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.config.{js,ts}',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
  prettier,
];
```

### .prettierrc

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "bracketSameLine": false
}
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.turbo/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.*',
        '**/tests/**',
        '**/*.test.*',
        '**/*.spec.*',
      ],
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

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": false
    },
    "lint": {
      "dependsOn": [],
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

## 🪝 Git Hooks Setup

### Initialize Husky

```bash
pnpm exec husky init
```

### .husky/pre-commit

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
```

### .husky/pre-push

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm typecheck
pnpm test --run
```

### lint-staged Configuration (in package.json)

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix --max-warnings=0", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

---

## 📄 GitHub Actions Workflows

### .github/workflows/ci.yml

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Code Quality
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm format:check

  test:
    name: Test (Node ${{ matrix.node }})
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node: [20, 22]

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: matrix.node == 22
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [quality, test]

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: packages/*/dist
          retention-days: 7
```

### .github/workflows/release.yml

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

permissions:
  contents: write
  packages: write
  pull-requests: write
  id-token: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Create Release PR or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
          commit: 'chore: release packages'
          title: 'chore: release packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### .github/workflows/playground-deploy.yml

```yaml
name: Deploy Playground

on:
  push:
    branches: [main]
    paths:
      - 'packages/playground/**'

  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to GitHub Pages
    runs-on: ubuntu-latest

    permissions:
      contents: read
      pages: write
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build playground
        run: pnpm --filter @declarelang/playground build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: packages/playground/dist

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

---

## 📦 Package Configurations

### packages/core/package.json

```json
{
  "name": "@declarelang/core",
  "version": "0.1.0",
  "type": "module",
  "description": "DeclareLang core parser and AST",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build && tsc --project tsconfig.build.json",
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.5.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vite-plugin-dts": "^4.0.3",
    "vitest": "^2.0.5"
  }
}
```

### packages/playground/package.json

```json
{
  "name": "@declarelang/playground",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "description": "Interactive DSL playground for DeclareLang",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
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
    "@types/node": "^22.5.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vite-plugin-solid": "^2.10.2"
  }
}
```

### packages/playground/vite.config.ts

```typescript
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  base: '/declarelang/', // Adjust for GitHub Pages
  build: {
    target: 'esnext',
    sourcemap: true,
  },
});
```

---

## 🔒 Additional Configuration Files

### .gitignore

```
# Dependencies
node_modules/
.pnp.*
.yarn/*

# Build outputs
dist/
build/
.turbo/
*.tsbuildinfo

# Testing
coverage/
.nyc_output/

# Environment
.env
.env.local
.env.*.local

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Misc
.cache/
tmp/
temp/
```

### .nvmrc

```
22
```

### .npmrc

```
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=false
```

### CONTRIBUTING.md

````markdown
# Contributing to DeclareLang

## Development Setup

1. Fork and clone the repo
2. Install dependencies: `pnpm install`
3. Create a branch: `git checkout -b feat/amazing-feature`

## Development Workflow

### Using Claude Code (Primary for Implementation)

```bash
# Start Claude Code in the repo
claude-code

# Claude Code will:
# - Read docs/specs/ for technical details
# - Implement features following specs
# - Run tests automatically
# - Ensure type safety
```
````

### Using Claude AI Project (Architecture & Design)

- Use for architectural decisions
- Design discussions
- Specification clarifications
- Documentation updates

## Making Changes

1. **Write tests first** (TDD encouraged)
2. **Implement feature** following specs in `docs/specs/`
3. **Ensure tests pass**: `pnpm test`
4. **Check types**: `pnpm typecheck`
5. **Lint**: `pnpm lint:fix`

## Committing

We use Conventional Commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test changes
- `chore:` Build/tooling changes

Create a changeset:

```bash
pnpm changeset add
```

## Pull Requests

1. Update documentation
2. Add tests for new features
3. Ensure CI passes
4. Request review

## Questions?

Open an issue or start a discussion!

```

### LICENSE (MIT)

```

MIT License

Copyright (c) 2025 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

````

---

## 🔗 Connecting to Claude AI Project

### Method 1: Git Operations (Manual)

```bash
# After creating repo and initial setup
git add .
git commit -m "chore: initial project setup"
git push origin main

# Share repo link in Claude AI conversation
# Claude can then read public files via web
````

### Method 2: Claude Desktop Integration (Recommended)

```bash
# If using Claude Desktop with MCP (Model Context Protocol)
# Enable file system access for the repo directory
# Claude can then read/write files directly

# Add to Claude Desktop config (~/.claude/config.json):
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/declarelang"]
    }
  }
}
```

### Workflow: Claude AI + Claude Code

**Claude AI Project** (Architecture & Design):

- Review specifications
- Discuss implementation approach
- Make architectural decisions
- Update documentation

**Claude Code** (Implementation):

- Read specs from `docs/specs/`
- Implement features
- Write tests
- Ensure type safety
- Run CI checks locally

**Handoff Pattern**:

```
1. Discuss design in Claude AI → Update docs/specs/
2. Implement in Claude Code → Read updated specs
3. Review results in Claude AI → Iterate
```

---

## ✅ Verification Checklist

```bash
# 1. Install works
pnpm install

# 2. Build works
pnpm build

# 3. Tests pass
pnpm test

# 4. Linting works
pnpm lint

# 5. Type checking works
pnpm typecheck

# 6. Git hooks work
git add .
git commit -m "test: verify hooks"  # Should run lint-staged

# 7. CI config valid
gh workflow view ci  # If using GitHub CLI

# 8. Changesets work
pnpm changeset add
```

---

## 🚀 First Commit

```bash
# After all setup
git add .
git commit -m "chore: initial project setup

- Configure monorepo with pnpm workspaces
- Setup TypeScript, ESLint, Prettier
- Add Vitest for testing
- Configure Husky and lint-staged
- Setup GitHub Actions CI/CD
- Add Changesets for versioning
- Configure Turbo for builds
- Organize Project Knowledge files
- Add CodeMirror 6 + SolidJS playground
- Document Claude AI + Claude Code workflow"

git push origin main
```

---

## 📚 Next Steps

1. **Setup CodeCov**: Visit codecov.io, connect GitHub repo
2. **Enable GitHub Pages**: For playground deployment
3. **Configure npm**: Add `NPM_TOKEN` secret for releases
4. **Create Packages**: Start implementing parser, generators, CLI
5. **Write Tests**: Aim for >80% coverage from day 1
6. **Document**: Add JSDoc comments, update README
7. **Examples**: Build out blog example project

---

**Version**: 0.1.0  
**Last Updated**: October 2025  
**Status**: Ready to Code! 🎉
