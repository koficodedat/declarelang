---
description: Hook that runs when user submits a prompt
---

# Auto-suggest relevant context

If the user mentions:

- "parser" or "tokenizer" → Remind to check `docs/specs/dsl-grammar-spec.md`
- "generator" or "codegen" → Remind to check `docs/specs/type-mapping-spec.md`
- "migration" → Remind to check `docs/specs/migration-file-format-spec.md`
- "CLI" → Remind to check `docs/specs/cli-reference.md`
- "error" → Remind to check `docs/specs/error-code-registry.md`

If the user mentions implementing a feature:

- Suggest running `/impl-spec <feature>`
- Remind about 80% test coverage requirement
- Remind about pre-push hooks (typecheck + tests)

If the user asks about testing:

- Suggest `/test-parser` for parser tests
- Suggest `/coverage` for coverage analysis
