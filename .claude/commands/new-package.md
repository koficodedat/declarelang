---
description: Create a new package in the monorepo
---

Create a new package following the monorepo structure.

Steps:

1. Create directory: `packages/{{arg1}}`
2. Add package.json with correct name, scripts, and dependencies
3. Add tsconfig.json and vite.config.ts
4. Create src/ directory with index.ts
5. Add to pnpm-workspace.yaml if needed
6. Update Turbo configuration if needed
7. Run `pnpm install` to link the package

Example usage:

- `/new-package validators` - Create @declarelang/validators package
