---
description: Validate DSL files in examples against grammar spec
---

Validate DSL files in the examples directory against the grammar specification.

Steps:

1. Read `docs/specs/dsl-grammar-spec.md` to understand the grammar
2. Find all `.dsl` files in `examples/`
3. Parse each file and check for syntax errors
4. Report any violations of the grammar rules
5. Suggest corrections for any errors found

If arg1 is provided, validate only that specific DSL file or example directory.

Example usage:

- `/validate-dsl` - Validate all DSL files
- `/validate-dsl examples/blog/schema/ddl.dsl` - Validate specific file
