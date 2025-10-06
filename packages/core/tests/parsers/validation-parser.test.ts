/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * VALIDATION Parser Tests
 * Comprehensive test coverage for VALIDATION.DSL parser
 */

import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../src/tokenizer/index.js';
import { VALIDATIONParser } from '../../src/parsers/validation-parser.js';
import { FormatType, RequirementType, type VALIDATIONFile } from '../../src/types/ast.js';

/**
 * Helper function to parse VALIDATION DSL
 */
function parseVALIDATION(input: string): VALIDATIONFile {
  const tokenizer = new Tokenizer(input);
  const tokens = tokenizer.tokenize();
  const parser = new VALIDATIONParser(tokens);
  return parser.parse();
}

describe('VALIDATIONParser', () => {
  describe('Basic Validation Definitions', () => {
    it('should parse single validation definition', () => {
      const input = `
Validate User:
- email must be valid email format
`;
      const result = parseVALIDATION(input);
      expect(result.validations).toHaveLength(1);
      expect(result.validations[0]!.modelName).toBe('User');
      expect(result.validations[0]!.rules).toHaveLength(1);
      expect(result.validations[0]!.rules[0]!.field).toBe('email');
    });

    it('should parse multiple rules for one model', () => {
      const input = `
Validate User:
- email must be valid email format
- username must be alphanumeric
- password must be at least 8 characters
`;
      const result = parseVALIDATION(input);
      expect(result.validations[0]!.rules).toHaveLength(3);
    });

    it('should parse multiple model validations', () => {
      const input = `
Validate User:
- email must be valid email format

Validate Post:
- title must be between 5 and 200 characters
`;
      const result = parseVALIDATION(input);
      expect(result.validations).toHaveLength(2);
      expect(result.validations[0]!.modelName).toBe('User');
      expect(result.validations[1]!.modelName).toBe('Post');
    });
  });

  describe('Format Type Constraints', () => {
    it('should parse valid email format', () => {
      const input = `
Validate User:
- email must be valid email format
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      expect(constraint.type).toBe('format');
      if (constraint.type === 'format') {
        expect(constraint.formatType).toBe(FormatType.VALID_EMAIL_FORMAT);
      }
    });

    it('should parse valid url', () => {
      const input = `
Validate User:
- avatar url must be valid url
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      if (constraint.type === 'format') {
        expect(constraint.formatType).toBe(FormatType.VALID_URL);
      }
    });

    it('should parse alphanumeric', () => {
      const input = `
Validate User:
- username must be alphanumeric
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      if (constraint.type === 'format') {
        expect(constraint.formatType).toBe(FormatType.ALPHANUMERIC);
      }
    });

    it('should parse lowercase alphanumeric and dashes', () => {
      const input = `
Validate Post:
- slug must be lowercase alphanumeric and dashes only
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      if (constraint.type === 'format') {
        expect(constraint.formatType).toBe(FormatType.LOWERCASE_ALPHANUMERIC_AND_DASHES);
      }
    });
  });

  describe('Length Constraints', () => {
    it('should parse between constraint', () => {
      const input = `
Validate Post:
- title must be between 5 and 200 characters
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      expect(constraint.type).toBe('between');
      if (constraint.type === 'between') {
        expect(constraint.min).toBe(5);
        expect(constraint.max).toBe(200);
        expect(constraint.unit).toBe('characters');
      }
    });

    it('should parse at least constraint', () => {
      const input = `
Validate User:
- password must be at least 8 characters
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      expect(constraint.type).toBe('at_least');
      if (constraint.type === 'at_least') {
        expect(constraint.value).toBe(8);
        expect(constraint.unit).toBe('characters');
      }
    });

    it('should parse at most constraint', () => {
      const input = `
Validate User:
- bio must be at most 500 characters
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      expect(constraint.type).toBe('at_most');
      if (constraint.type === 'at_most') {
        expect(constraint.value).toBe(500);
        expect(constraint.unit).toBe('characters');
      }
    });

    it('should parse conditional length constraints', () => {
      const input = `
Validate User:
- first name must be between 1 and 50 characters if provided
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      if (constraint.type === 'between') {
        expect(constraint.conditional).toBe('if provided');
      }
    });
  });

  describe('Content Constraints', () => {
    it('should parse contain uppercase and lowercase and number', () => {
      const input = `
Validate User:
- password must contain uppercase and lowercase and number
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      expect(constraint.type).toBe('contain');
      if (constraint.type === 'contain') {
        expect(constraint.requirement).toBe(RequirementType.UPPERCASE_AND_LOWERCASE_AND_NUMBER);
      }
    });

    it('should parse not contain profanity', () => {
      const input = `
Validate Post:
- title must not contain profanity
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      expect(constraint.type).toBe('not_contain');
      if (constraint.type === 'not_contain') {
        expect(constraint.requirement).toBe(RequirementType.PROFANITY);
      }
    });

    it('should parse not contain spam keywords', () => {
      const input = `
Validate Comment:
- content must not contain spam keywords
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      if (constraint.type === 'not_contain') {
        expect(constraint.requirement).toBe(RequirementType.SPAM_KEYWORDS);
      }
    });

    it('should parse not contain malicious links', () => {
      const input = `
Validate Comment:
- content must not contain malicious links
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      if (constraint.type === 'not_contain') {
        expect(constraint.requirement).toBe(RequirementType.MALICIOUS_LINKS);
      }
    });
  });

  describe('Conditional Constraints', () => {
    it('should parse exist when constraint', () => {
      const input = `
Validate Post:
- published at must exist when published is true
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      expect(constraint.type).toBe('exist_when');
      if (constraint.type === 'exist_when') {
        expect(constraint.condition.field).toBe('published');
        expect(constraint.condition.value?.type).toBe('literal');
      }
    });

    it('should parse be empty when constraint', () => {
      const input = `
Validate Post:
- published at must be empty when published is false
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      expect(constraint.type).toBe('be_empty_when');
    });
  });

  describe('Multi-word Fields', () => {
    it('should normalize multi-word field names', () => {
      const input = `
Validate User:
- first name must be between 1 and 50 characters
`;
      const result = parseVALIDATION(input);
      expect(result.validations[0]!.rules[0]!.field).toBe('first_name');
      expect(result.validations[0]!.rules[0]!.originalField).toBe('first name');
    });

    it('should handle multi-word field with hyphens', () => {
      const input = `
Validate User:
- avatar-url must be valid url
`;
      const result = parseVALIDATION(input);
      expect(result.validations[0]!.rules[0]!.field).toBe('avatar_url');
    });
  });

  describe('Complete Validation File', () => {
    it('should parse complete validation file', () => {
      const input = `
Validate User:
- email must be valid email format
- username must be between 3 and 30 characters
- password must be at least 8 characters

Validate Post:
- title must be between 5 and 200 characters
- slug must be lowercase alphanumeric and dashes only
- content must not contain profanity
`;
      const result = parseVALIDATION(input);
      expect(result.validations).toHaveLength(2);
      expect(result.validations[0]!.rules).toHaveLength(3);
      expect(result.validations[1]!.rules).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty validation file', () => {
      const input = ``;
      const result = parseVALIDATION(input);
      expect(result.validations).toHaveLength(0);
      expect(result.crossFieldRules).toHaveLength(0);
      expect(result.rateLimitRules).toHaveLength(0);
      expect(result.businessRules).toHaveLength(0);
    });

    it('should handle whitespace and newlines', () => {
      const input = `

Validate User:

- email must be valid email format


`;
      const result = parseVALIDATION(input);
      expect(result.validations).toHaveLength(1);
      expect(result.validations[0]!.rules).toHaveLength(1);
    });

    it('should preserve original field names', () => {
      const input = `
Validate User:
- Email Address must be valid email format
`;
      const result = parseVALIDATION(input);
      expect(result.validations[0]!.rules[0]!.field).toBe('Email_Address');
      expect(result.validations[0]!.rules[0]!.originalField).toBe('Email Address');
    });

    it('should handle model names with mixed case', () => {
      const input = `
Validate BlogPost:
- title must be between 5 and 100 characters
`;
      const result = parseVALIDATION(input);
      expect(result.validations[0]!.modelName).toBe('BlogPost');
    });

    it('should handle multiple validations with different models', () => {
      const input = `
Validate User:
- email must be valid email format

Validate Post:
- title must be between 5 and 200 characters

Validate Comment:
- content must not contain profanity
`;
      const result = parseVALIDATION(input);
      expect(result.validations).toHaveLength(3);
      expect(result.validations[0]!.modelName).toBe('User');
      expect(result.validations[1]!.modelName).toBe('Post');
      expect(result.validations[2]!.modelName).toBe('Comment');
    });

    it('should handle field with numbers in name', () => {
      const input = `
Validate User:
- address1 must be between 1 and 100 characters
`;
      const result = parseVALIDATION(input);
      expect(result.validations[0]!.rules[0]!.field).toBe('address1');
    });

    it('should handle min and max boundary values', () => {
      const input = `
Validate Post:
- title must be between 1 and 999999 characters
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      if (constraint.type === 'between') {
        expect(constraint.min).toBe(1);
        expect(constraint.max).toBe(999999);
      }
    });

    it('should handle single character field names', () => {
      const input = `
Validate User:
- x must be between 1 and 10 characters
`;
      const result = parseVALIDATION(input);
      expect(result.validations[0]!.rules[0]!.field).toBe('x');
    });
  });

  describe('Position Tracking', () => {
    it('should track position for validation definitions', () => {
      const input = `
Validate User:
- email must be valid email format
`;
      const result = parseVALIDATION(input);
      expect(result.validations[0]!.start).toBeDefined();
      expect(result.validations[0]!.end).toBeDefined();
    });

    it('should track position for validation rules', () => {
      const input = `
Validate User:
- email must be valid email format
`;
      const result = parseVALIDATION(input);
      expect(result.validations[0]!.rules[0]!.start).toBeDefined();
      expect(result.validations[0]!.rules[0]!.end).toBeDefined();
    });
  });

  describe('Additional Format Types', () => {
    it('should parse all format types correctly', () => {
      const input = `
Validate User:
- email must be valid email format
- website must be valid url
- username must be alphanumeric
- slug must be lowercase alphanumeric and dashes only
`;
      const result = parseVALIDATION(input);
      expect(result.validations[0]!.rules).toHaveLength(4);

      const rules = result.validations[0]!.rules;
      expect(rules[0]!.constraint.type).toBe('format');
      expect(rules[1]!.constraint.type).toBe('format');
      expect(rules[2]!.constraint.type).toBe('format');
      expect(rules[3]!.constraint.type).toBe('format');
    });
  });

  describe('Mixed Constraint Types', () => {
    it('should handle model with multiple constraint types', () => {
      const input = `
Validate User:
- email must be valid email format
- username must be between 3 and 30 characters
- password must contain uppercase and lowercase and number
- bio must be at most 500 characters
`;
      const result = parseVALIDATION(input);
      expect(result.validations[0]!.rules).toHaveLength(4);

      const rules = result.validations[0]!.rules;
      expect(rules[0]!.constraint.type).toBe('format');
      expect(rules[1]!.constraint.type).toBe('between');
      expect(rules[2]!.constraint.type).toBe('contain');
      expect(rules[3]!.constraint.type).toBe('at_most');
    });
  });

  describe('Field Name Normalization', () => {
    it('should normalize field names with spaces', () => {
      const input = `
Validate User:
- first name must be between 1 and 50 characters
- last name must be between 1 and 50 characters
- phone number must be between 10 and 15 characters
`;
      const result = parseVALIDATION(input);
      expect(result.validations[0]!.rules[0]!.field).toBe('first_name');
      expect(result.validations[0]!.rules[1]!.field).toBe('last_name');
      expect(result.validations[0]!.rules[2]!.field).toBe('phone_number');
    });

    it('should normalize field names with hyphens', () => {
      const input = `
Validate User:
- social-security-number must be between 9 and 11 characters
`;
      const result = parseVALIDATION(input);
      expect(result.validations[0]!.rules[0]!.field).toBe('social_security_number');
    });
  });
});
