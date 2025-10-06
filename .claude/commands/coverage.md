---
description: Check test coverage and identify gaps
---

Run test coverage and analyze gaps.

Steps:

1. Run `pnpm test:coverage`
2. Analyze the coverage report
3. Identify files below 80% threshold (lines, functions, statements) or 75% (branches)
4. List specific uncovered lines/functions
5. Suggest what tests to add to improve coverage

If arg1 is provided, focus on coverage for that specific package or file.

Example usage:

- `/coverage` - Full coverage report
- `/coverage packages/core` - Coverage for core package only
