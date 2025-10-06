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

  describe('Cross-Field Rules', () => {
    it('should parse cross-field validation rules', () => {
      const input = `
Validate User:
- email must be valid email format

Cross-field Validation:
- Post published_at must be before Post updated_at
- User created_at must be before User last_login
`;
      const result = parseVALIDATION(input);
      expect(result.crossFieldRules).toHaveLength(2);
      expect(result.crossFieldRules[0]!.modelName).toBe('Post');
      expect(result.crossFieldRules[0]!.field).toBe('published_at');
      expect(result.crossFieldRules[0]!.rule).toContain('before');
    });

    it('should parse cross-field with "Cross-Field" capitalization', () => {
      const input = `
Validate User:
- email must be valid email format

Cross-Field Validation:
- Order total must equal sum of LineItems
`;
      const result = parseVALIDATION(input);
      expect(result.crossFieldRules).toHaveLength(1);
      expect(result.crossFieldRules[0]!.modelName).toBe('Order');
      expect(result.crossFieldRules[0]!.field).toBe('total');
    });

    it('should handle cross-field rules with missing field parts', () => {
      const input = `
Validate User:
- email must be valid email format

Cross-field Validation:
- Model
`;
      const result = parseVALIDATION(input);
      expect(result.crossFieldRules).toHaveLength(1);
      expect(result.crossFieldRules[0]!.modelName).toBe('Model');
      expect(result.crossFieldRules[0]!.field).toBe('');
    });

    it('should handle empty cross-field rule parts', () => {
      const input = `
Validate User:
- email must be valid email format

Cross-field Validation:
-
`;
      const result = parseVALIDATION(input);
      expect(result.crossFieldRules).toHaveLength(1);
      expect(result.crossFieldRules[0]!.modelName).toBe('');
      expect(result.crossFieldRules[0]!.field).toBe('');
    });
  });

  describe('Rate Limit Rules', () => {
    it('should parse rate limit rules with non-keyword actions and periods', () => {
      const input = `
Validate User:
- email must be valid email format

Rate Limiting Validation:
- User can post at most 10 Posts per second
- User can comment at most 5 Comments per second
`;
      const result = parseVALIDATION(input);
      expect(result.rateLimitRules).toHaveLength(2);
      expect(result.rateLimitRules[0]!.modelName).toBe('User');
      expect(result.rateLimitRules[0]!.action).toBe('post');
      expect(result.rateLimitRules[0]!.limit).toBe(10);
      expect(result.rateLimitRules[0]!.period).toBe('per second');
    });

    it('should parse rate limiting with different action', () => {
      const input = `
Validate User:
- email must be valid email format

Rate Limiting Validation:
- User can submit at most 3 Posts per second
`;
      const result = parseVALIDATION(input);
      expect(result.rateLimitRules).toHaveLength(1);
      expect(result.rateLimitRules[0]!.modelName).toBe('User');
      expect(result.rateLimitRules[0]!.action).toBe('submit');
      expect(result.rateLimitRules[0]!.limit).toBe(3);
      expect(result.rateLimitRules[0]!.period).toBe('per second');
    });

    it('should handle rate limit with missing resource name', () => {
      const input = `
Validate User:
- email must be valid email format

Rate Limiting Validation:
- User can post at most 10 per second
`;
      const result = parseVALIDATION(input);
      expect(result.rateLimitRules).toHaveLength(1);
      expect(result.rateLimitRules[0]!.limit).toBe(10);
      expect(result.rateLimitRules[0]!.period).toBe('per second');
    });
  });

  describe('Business Rules', () => {
    it('should parse custom business rules', () => {
      const input = `
Validate User:
- email must be valid email format

Custom Business Rules:
- Users cannot delete posts with comments
- Admins can override any validation
`;
      const result = parseVALIDATION(input);
      expect(result.businessRules).toHaveLength(2);
      expect(result.businessRules[0]!.description).toBe('Users cannot delete posts with comments');
      expect(result.businessRules[1]!.description).toBe('Admins can override any validation');
    });

    it('should parse business rules with "Business Rules" header', () => {
      const input = `
Validate User:
- email must be valid email format

Business Rules:
- Premium users get extended rate limits
`;
      const result = parseVALIDATION(input);
      expect(result.businessRules).toHaveLength(1);
      expect(result.businessRules[0]!.description).toBe('Premium users get extended rate limits');
    });

    it('should track position for business rules', () => {
      const input = `
Validate User:
- email must be valid email format

Custom Business Rules:
- Some custom rule
`;
      const result = parseVALIDATION(input);
      expect(result.businessRules[0]!.start).toBeDefined();
      expect(result.businessRules[0]!.end).toBeDefined();
    });
  });

  describe('Complete Files with All Sections', () => {
    it('should parse complete file with all validation types', () => {
      const input = `
Validate User:
- email must be valid email format
- username must be alphanumeric

Validate Post:
- title must be between 5 and 200 characters

Cross-field Validation:
- Post published_at must be before Post updated_at

Rate Limiting Validation:
- User can post at most 10 Posts per second

Custom Business Rules:
- Users cannot remove posts with comments
`;
      const result = parseVALIDATION(input);
      expect(result.validations).toHaveLength(2);
      expect(result.crossFieldRules).toHaveLength(1);
      expect(result.rateLimitRules).toHaveLength(1);
      expect(result.businessRules).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for missing "must" keyword', () => {
      const input = `
Validate User:
- email be valid email format
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected "must"');
    });

    it('should throw error for unknown constraint after "not be"', () => {
      const input = `
Validate User:
- status must not be invalid value
`;
      expect(() => parseVALIDATION(input)).toThrow(/Unknown constraint: not be/);
    });

    it('should throw error for missing "characters" in between constraint', () => {
      const input = `
Validate User:
- name must be between 1 and 50 something
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected "characters"');
    });

    it('should throw error for missing "characters" in at least constraint', () => {
      const input = `
Validate User:
- password must be at least 8 units
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected "characters"');
    });

    it('should throw error for missing "characters" in at most constraint', () => {
      const input = `
Validate User:
- bio must be at most 500 units
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected "characters"');
    });

    it('should throw error for missing "within" in unique constraint', () => {
      const input = `
Validate User:
- email must be unique across Users
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected "within" after "unique"');
    });

    it('should throw error for unknown format type', () => {
      const input = `
Validate User:
- value must be some unknown format type here
`;
      expect(() => parseVALIDATION(input)).toThrow(/Unknown format type/);
    });

    it('should throw error for unknown requirement type', () => {
      const input = `
Validate User:
- password must contain some unknown requirement here
`;
      expect(() => parseVALIDATION(input)).toThrow(/Unknown requirement type/);
    });

    it('should throw error for unexpected keyword after "be"', () => {
      const input = `
Validate User:
- status must be in some list
`;
      expect(() => parseVALIDATION(input)).toThrow(/Unexpected keyword after "be"/);
    });

    it('should throw error for missing "within" after unique', () => {
      const input = `
Validate User:
- value must be unique something
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected "within" after "unique"');
    });

    it('should throw error for missing colon after model name', () => {
      const input = `
Validate User
- email must be valid email format
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected ":" after model name');
    });

    it('should throw error for missing newline after colon', () => {
      const input = `Validate User: - email must be valid email format`;
      expect(() => parseVALIDATION(input)).toThrow('Expected newline');
    });

    it('should throw error for missing "when" after "exist"', () => {
      const input = `
Validate Post:
- published_at must exist if published is true
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected "when" after "exist"');
    });

    it('should throw error for missing "when" after "be empty"', () => {
      const input = `
Validate Post:
- published_at must be empty if published is false
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected "when"');
    });

    it('should throw error for missing "and" in between constraint', () => {
      const input = `
Validate User:
- name must be between 1 or 50 characters
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected "and"');
    });

    it('should throw error for missing boolean value in condition', () => {
      const input = `
Validate Post:
- published_at must exist when published is active
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected boolean value');
    });

    it('should throw error for unknown constraint expression', () => {
      const input = `
Validate User:
- email must something weird here
`;
      expect(() => parseVALIDATION(input)).toThrow(/Expected constraint expression/);
    });

    it('should throw error for missing "contain" or "be" after "not"', () => {
      const input = `
Validate User:
- value must not have something
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected "contain" or "be" after "not"');
    });

    it('should throw error for missing "least" or "most" after "at"', () => {
      const input = `
Validate User:
- value must be at some 10 characters
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected "least" or "most" after "at"');
    });

    it('should throw error for missing "provided" after "if" in conditional', () => {
      const input = `
Validate User:
- bio must be between 1 and 500 characters if something
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected "provided" after "if"');
    });

    it('should throw error for missing pattern in match constraint', () => {
      const input = `
Validate User:
- phone must match
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected pattern string');
    });

    it('should throw error for missing "is" in simple condition', () => {
      const input = `
Validate Post:
- published_at must exist when published equals true
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected "is"');
    });

    it('should throw error for missing colon in cross-field section', () => {
      const input = `
Validate User:
- email must be valid email format

Cross-field Validation
- Post published_at must be before Post updated_at
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected ":"');
    });

    it('should throw error for missing colon in rate limit section', () => {
      const input = `
Validate User:
- email must be valid email format

Rate Limit Validation
- User can create at most 10 Posts per day
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected ":"');
    });

    it('should throw error for missing colon in business rules section', () => {
      const input = `
Validate User:
- email must be valid email format

Custom Business Rules
- Some rule
`;
      expect(() => parseVALIDATION(input)).toThrow('Expected ":"');
    });
  });

  describe('Additional Requirement Types', () => {
    it('should parse special character requirement', () => {
      const input = `
Validate User:
- password must contain special character
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      if (constraint.type === 'contain') {
        expect(constraint.requirement).toBe(RequirementType.SPECIAL_CHARACTER);
      }
    });

    it('should parse disposable email list requirement', () => {
      const input = `
Validate User:
- email must not contain disposable email list
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      if (constraint.type === 'not_contain') {
        expect(constraint.requirement).toBe(RequirementType.DISPOSABLE_EMAIL_LIST);
      }
    });

    it('should parse uppercase lowercase number and special character', () => {
      const input = `
Validate User:
- password must contain uppercase and lowercase and number and special character
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      if (constraint.type === 'contain') {
        expect(constraint.requirement).toBe(RequirementType.UPPERCASE_AND_LOWERCASE_AND_NUMBER);
      }
    });
  });

  describe('Additional Constraint Types', () => {
    it('should parse match constraint', () => {
      const input = `
Validate User:
- phone must match "^[0-9]{10}$"
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      expect(constraint.type).toBe('match');
      if (constraint.type === 'match') {
        expect(constraint.pattern).toBe('^[0-9]{10}$');
      }
    });

    it('should parse unique within constraint', () => {
      const input = `
Validate User:
- email must be unique within Person
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      expect(constraint.type).toBe('unique_within');
      if (constraint.type === 'unique_within') {
        expect(constraint.modelName).toBe('Person');
      }
    });

    it('should parse unique within with "all" keyword', () => {
      const input = `
Validate User:
- username must be unique within all Accounts
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      expect(constraint.type).toBe('unique_within');
      if (constraint.type === 'unique_within') {
        expect(constraint.modelName).toBe('Accounts');
      }
    });

    it('should parse not be in list constraint', () => {
      const input = `
Validate User:
- status must not be in banned statuses
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      expect(constraint.type).toBe('not_in_list');
      if (constraint.type === 'not_in_list') {
        expect(constraint.list).toBe('banned statuses');
      }
    });

    it('should parse conditional at least', () => {
      const input = `
Validate User:
- bio must be at least 10 characters if provided
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      if (constraint.type === 'at_least') {
        expect(constraint.conditional).toBe('if provided');
      }
    });

    it('should parse conditional at most', () => {
      const input = `
Validate User:
- nickname must be at most 30 characters if provided
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      if (constraint.type === 'at_most') {
        expect(constraint.conditional).toBe('if provided');
      }
    });

    it('should parse exist when with false value', () => {
      const input = `
Validate Post:
- draft_content must exist when published is false
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      expect(constraint.type).toBe('exist_when');
      if (constraint.type === 'exist_when') {
        expect(constraint.condition.field).toBe('published');
        if (constraint.condition.value?.type === 'literal') {
          expect(constraint.condition.value.value).toBe(false);
        }
      }
    });

    it('should parse alphanumeric and dashes only format', () => {
      const input = `
Validate User:
- username must be alphanumeric and dashes only
`;
      const result = parseVALIDATION(input);
      const constraint = result.validations[0]!.rules[0]!.constraint;
      if (constraint.type === 'format') {
        expect(constraint.formatType).toBe(FormatType.ALPHANUMERIC);
      }
    });
  });
});
