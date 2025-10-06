---
description: Run tests for a specific DSL parser
---

Run Vitest tests for the {{arg1}} parser. If no argument provided, run all parser tests.

Steps:

1. If arg1 is provided, run tests matching that pattern (e.g., `ddl`, `dml`, `auth`)
2. If no arg1, run all tests in `packages/core/src/parser/**/*.test.ts`
3. Show coverage for the specific parser
4. If tests fail, analyze failures and suggest fixes

Example usage:

- `/test-parser ddl` - Run DDL parser tests
- `/test-parser` - Run all parser tests
