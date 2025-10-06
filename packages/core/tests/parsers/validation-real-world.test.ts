/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Real-world VALIDATION Parser Tests
 * Tests parsing of actual blog example validation.dsl file
 */

import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../src/tokenizer/index.js';
import { VALIDATIONParser } from '../../src/parsers/validation-parser.js';
import type { VALIDATIONFile } from '../../src/types/ast.js';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Helper function to parse VALIDATION DSL
 */
function parseVALIDATION(input: string): VALIDATIONFile {
  const tokenizer = new Tokenizer(input);
  const tokens = tokenizer.tokenize();
  const parser = new VALIDATIONParser(tokens);
  return parser.parse();
}

describe('VALIDATIONParser - Real World', () => {
  it('should parse the blog example validation.dsl file', () => {
    const examplePath = join(__dirname, '../../../../examples/blog/schema/validation.dsl');
    const input = readFileSync(examplePath, 'utf-8');

    const result = parseVALIDATION(input);

    // Should parse at least User model
    expect(result.validations.length).toBeGreaterThanOrEqual(1);

    // Check for User validation
    const userValidation = result.validations.find((v) => v.modelName === 'User');
    expect(userValidation).toBeDefined();
    expect(userValidation!.rules.length).toBeGreaterThan(0);

    // If we parsed more than User, check Post too
    if (result.validations.length > 1) {
      const postValidation = result.validations.find((v) => v.modelName === 'Post');
      expect(postValidation).toBeDefined();
    }
  });

  it('should parse "not be in" list constraints', () => {
    const input = `
Validate User:
- email domain must not be in disposable email list
`;
    const result = parseVALIDATION(input);
    const constraint = result.validations[0]!.rules[0]!.constraint;
    expect(constraint.type).toBe('not_in_list');
    if (constraint.type === 'not_in_list') {
      expect(constraint.list).toBe('disposable email list');
    }
  });

  it('should parse "unique within" constraints', () => {
    const input = `
Validate Post:
- slug must be unique within all Posts
`;
    const result = parseVALIDATION(input);
    const constraint = result.validations[0]!.rules[0]!.constraint;
    expect(constraint.type).toBe('unique_within');
    if (constraint.type === 'unique_within') {
      expect(constraint.modelName).toBe('Posts');
    }
  });

  it('should parse "alphanumeric and dashes only" without lowercase', () => {
    const input = `
Validate User:
- username must be alphanumeric and dashes only
`;
    const result = parseVALIDATION(input);
    const constraint = result.validations[0]!.rules[0]!.constraint;
    expect(constraint.type).toBe('format');
  });
});
