/**
 * Tests for DDL Parser
 * Covers grammar rules from DSL Grammar Specification v0.1.0
 */

import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../src/tokenizer/tokenizer.js';
import { DDLParser, ParseError } from '../../src/parsers/ddl-parser.js';
import {
  FieldType,
  FieldConstraint,
  RelationshipType,
  isFieldDefinition,
  isRelationshipDefinition,
} from '../../src/types/ast.js';

describe('DDLParser', () => {
  function parse(input: string) {
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const parser = new DDLParser(tokens);
    return parser.parse();
  }

  describe('Model Definition Parsing', () => {
    it('should parse a simple model with one field', () => {
      const input = `User:
- has email as text`;

      const ast = parse(input);

      expect(ast.models).toHaveLength(1);
      expect(ast.models[0]!.name.singular).toBe('User');
      expect(ast.models[0]!.name.plural).toBe('User');
      expect(ast.models[0]!.items).toHaveLength(1);

      const field = ast.models[0]!.items[0]!;
      expect(isFieldDefinition(field)).toBe(true);
      if (isFieldDefinition(field)) {
        expect(field.name).toBe('email');
        expect(field.type).toBe(FieldType.TEXT);
        expect(field.constraints).toEqual([]);
      }
    });

    it('should parse model with "has:" keyword', () => {
      const input = `User has:
- has email as text`;

      const ast = parse(input);

      expect(ast.models).toHaveLength(1);
      expect(ast.models[0]!.name.singular).toBe('User');
    });

    it('should parse model with simple pluralization', () => {
      const input = `User[s]:
- has email as text`;

      const ast = parse(input);

      expect(ast.models[0]!.name.singular).toBe('User');
      expect(ast.models[0]!.name.plural).toBe('Users');
      expect(ast.models[0]!.name.originalForm).toBe('User[s]');
    });

    it('should parse model with custom pluralization', () => {
      const input = `Categor[y|ies]:
- has name as text`;

      const ast = parse(input);

      expect(ast.models[0]!.name.singular).toBe('Category');
      expect(ast.models[0]!.name.plural).toBe('Categories');
      expect(ast.models[0]!.name.originalForm).toBe('Categor[y|ies]');
    });

    it('should parse model with irregular pluralization', () => {
      const input = `Person[|People]:
- has name as text`;

      const ast = parse(input);

      expect(ast.models[0]!.name.singular).toBe('Person');
      expect(ast.models[0]!.name.plural).toBe('People');
      expect(ast.models[0]!.name.originalForm).toBe('Person[|People]');
    });

    it('should parse multiple models', () => {
      const input = `User[s]:
- has email as text

Post[s]:
- has title as text`;

      const ast = parse(input);

      expect(ast.models).toHaveLength(2);
      expect(ast.models[0]!.name.singular).toBe('User');
      expect(ast.models[1]!.name.singular).toBe('Post');
    });
  });

  describe('Field Definition Parsing', () => {
    it('should parse all field types', () => {
      const input = `Test:
- has text_field as text
- has long_field as long text
- has number_field as number
- has decimal_field as decimal
- has boolean_field as boolean
- has timestamp_field as timestamp
- has json_field as json
- has uuid_field as uuid`;

      const ast = parse(input);
      const fields = ast.models[0]!.items.filter(isFieldDefinition);

      expect(fields).toHaveLength(8);
      expect(fields[0]!.type).toBe(FieldType.TEXT);
      expect(fields[1]!.type).toBe(FieldType.LONG_TEXT);
      expect(fields[2]!.type).toBe(FieldType.NUMBER);
      expect(fields[3]!.type).toBe(FieldType.DECIMAL);
      expect(fields[4]!.type).toBe(FieldType.BOOLEAN);
      expect(fields[5]!.type).toBe(FieldType.TIMESTAMP);
      expect(fields[6]!.type).toBe(FieldType.JSON);
      expect(fields[7]!.type).toBe(FieldType.UUID);
    });

    it('should parse fields with single constraint', () => {
      const input = `User:
- has email as unique text
- has username as required text
- has slug as indexed text`;

      const ast = parse(input);
      const fields = ast.models[0]!.items.filter(isFieldDefinition);

      expect(fields[0]!.constraints).toEqual([FieldConstraint.UNIQUE]);
      expect(fields[1]!.constraints).toEqual([FieldConstraint.REQUIRED]);
      expect(fields[2]!.constraints).toEqual([FieldConstraint.INDEXED]);
    });

    it('should parse fields with multiple constraints using "and"', () => {
      const input = `User:
- has email as unique text and required
- has username as unique and required text`;

      const ast = parse(input);
      const fields = ast.models[0]!.items.filter(isFieldDefinition);

      expect(fields[0]!.constraints).toEqual([FieldConstraint.UNIQUE, FieldConstraint.REQUIRED]);
      expect(fields[1]!.constraints).toEqual([FieldConstraint.UNIQUE, FieldConstraint.REQUIRED]);
    });

    it('should parse fields with multiple constraints using comma', () => {
      const input = `User:
- has email as unique text, required`;

      const ast = parse(input);
      const fields = ast.models[0]!.items.filter(isFieldDefinition);

      expect(fields[0]!.constraints).toEqual([FieldConstraint.UNIQUE, FieldConstraint.REQUIRED]);
    });

    it('should parse multi-word field names', () => {
      const input = `User:
- has first name as text
- has created at as timestamp
- has is active as boolean`;

      const ast = parse(input);
      const fields = ast.models[0]!.items.filter(isFieldDefinition);

      expect(fields[0]!.name).toBe('first_name');
      expect(fields[0]!.originalName).toBe('first name');
      expect(fields[1]!.name).toBe('created_at');
      expect(fields[1]!.originalName).toBe('created at');
      expect(fields[2]!.name).toBe('is_active');
      expect(fields[2]!.originalName).toBe('is active');
    });

    it('should normalize hyphens in field names', () => {
      const input = `User:
- has email-address as text
- has first-last-name as text`;

      const ast = parse(input);
      const fields = ast.models[0]!.items.filter(isFieldDefinition);

      expect(fields[0]!.name).toBe('email_address');
      expect(fields[1]!.name).toBe('first_last_name');
    });

    it('should handle constraints in any order', () => {
      const input = `User:
- has email as unique text and required
- has username as text and unique and required
- has slug as required unique text`;

      const ast = parse(input);
      const fields = ast.models[0]!.items.filter(isFieldDefinition);

      expect(fields[0]!.constraints).toContain(FieldConstraint.UNIQUE);
      expect(fields[0]!.constraints).toContain(FieldConstraint.REQUIRED);
      expect(fields[1]!.constraints).toContain(FieldConstraint.UNIQUE);
      expect(fields[1]!.constraints).toContain(FieldConstraint.REQUIRED);
      expect(fields[2]!.constraints).toContain(FieldConstraint.UNIQUE);
      expect(fields[2]!.constraints).toContain(FieldConstraint.REQUIRED);
    });
  });

  describe('Relationship Parsing', () => {
    it('should parse "has many" relationship', () => {
      const input = `User:
- has many Post`;

      const ast = parse(input);
      const relationship = ast.models[0]!.items[0]!;

      expect(isRelationshipDefinition(relationship)).toBe(true);
      if (isRelationshipDefinition(relationship)) {
        expect(relationship.type).toBe(RelationshipType.HAS_MANY);
        expect(relationship.targetModel).toBe('Post');
      }
    });

    it('should parse "many" shorthand relationship', () => {
      const input = `User:
- many Post`;

      const ast = parse(input);
      const relationship = ast.models[0]!.items[0]!;

      expect(isRelationshipDefinition(relationship)).toBe(true);
      if (isRelationshipDefinition(relationship)) {
        expect(relationship.type).toBe(RelationshipType.HAS_MANY);
        expect(relationship.targetModel).toBe('Post');
      }
    });

    it('should parse "belongs to" relationship', () => {
      const input = `Post:
- belongs to User`;

      const ast = parse(input);
      const relationship = ast.models[0]!.items[0]!;

      expect(isRelationshipDefinition(relationship)).toBe(true);
      if (isRelationshipDefinition(relationship)) {
        expect(relationship.type).toBe(RelationshipType.BELONGS_TO);
        expect(relationship.targetModel).toBe('User');
      }
    });

    it('should parse mixed fields and relationships', () => {
      const input = `Post:
- has title as text and required
- has content as long text
- belongs to User
- has many Comment`;

      const ast = parse(input);
      const items = ast.models[0]!.items;

      expect(items).toHaveLength(4);
      expect(isFieldDefinition(items[0]!)).toBe(true);
      expect(isFieldDefinition(items[1]!)).toBe(true);
      expect(isRelationshipDefinition(items[2]!)).toBe(true);
      expect(isRelationshipDefinition(items[3]!)).toBe(true);
    });
  });

  describe('Complete DDL Examples', () => {
    it('should parse the blog example from grammar spec', () => {
      const input = `User[s]:
- has email as unique text and required
- has username as unique text and required
- has created at as timestamp
- has many Post

Post[s]:
- has title as text and required
- has content as long text
- belongs to User
- has created at as timestamp`;

      const ast = parse(input);

      expect(ast.models).toHaveLength(2);

      // User model
      expect(ast.models[0]!.name.singular).toBe('User');
      expect(ast.models[0]!.name.plural).toBe('Users');
      expect(ast.models[0]!.items).toHaveLength(4);

      // Post model
      expect(ast.models[1]!.name.singular).toBe('Post');
      expect(ast.models[1]!.name.plural).toBe('Posts');
      expect(ast.models[1]!.items).toHaveLength(4);
    });

    it('should parse complex blog schema', () => {
      const input = `User[s]:
- has email as unique text and required
- has username as unique text and required
- has password as text and required
- has first name as text
- has last name as text
- has bio as long text
- has avatar url as text
- has role as text
- has is active as boolean
- has created at as timestamp
- has updated at as timestamp
- has many Post
- has many Comment

Post[s]:
- has title as text and required
- has slug as unique text and required
- has content as long text and required
- has excerpt as text
- has featured image as text
- has published as boolean
- has published at as timestamp
- has view count as number
- has created at as timestamp
- has updated at as timestamp
- belongs to User
- belongs to Category
- has many Comment
- has many Tag

Comment[s]:
- has content as text and required
- has is approved as boolean
- has created at as timestamp
- has updated at as timestamp
- belongs to User
- belongs to Post

Categor[y|ies]:
- has name as unique text and required
- has slug as unique text and required
- has description as long text
- has created at as timestamp
- has many Post

Tag[s]:
- has name as unique text and required
- has slug as unique text and required
- has created at as timestamp
- has many Post`;

      const ast = parse(input);

      expect(ast.models).toHaveLength(5);
      expect(ast.models[0]!.name.singular).toBe('User');
      expect(ast.models[1]!.name.singular).toBe('Post');
      expect(ast.models[2]!.name.singular).toBe('Comment');
      expect(ast.models[3]!.name.singular).toBe('Category');
      expect(ast.models[3]!.name.plural).toBe('Categories');
      expect(ast.models[4]!.name.singular).toBe('Tag');
    });
  });

  describe('Comments and Whitespace', () => {
    it('should ignore comments', () => {
      const input = `# This is a comment
User:
# Another comment
- has email as text # inline comment
- has name as text`;

      const ast = parse(input);

      expect(ast.models).toHaveLength(1);
      expect(ast.models[0]!.items).toHaveLength(2);
    });

    it('should handle extra newlines', () => {
      const input = `

User:

- has email as text

- has name as text


Post:

- has title as text

`;

      const ast = parse(input);

      expect(ast.models).toHaveLength(2);
      expect(ast.models[0]!.items).toHaveLength(2);
      expect(ast.models[1]!.items).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for empty input', () => {
      expect(() => parse('')).toThrow(ParseError);
      expect(() => parse('')).toThrow('Expected at least one model definition');
    });

    it('should throw error for model without colon', () => {
      expect(() => parse('User\n- has email as text')).toThrow(ParseError);
    });

    it('should throw error for model without fields', () => {
      expect(() => parse('User:\n')).toThrow(ParseError);
      expect(() => parse('User:\n')).toThrow('Model must have at least one field');
    });

    it('should throw error for field without "has" keyword', () => {
      expect(() => parse('User:\n- email as text')).toThrow(ParseError);
    });

    it('should throw error for field without "as" keyword', () => {
      expect(() => parse('User:\n- has email text')).toThrow(ParseError);
    });

    it('should throw error for field without type', () => {
      expect(() => parse('User:\n- has email as unique')).toThrow(ParseError);
    });

    it('should throw error for duplicate field types', () => {
      expect(() => parse('User:\n- has email as text text')).toThrow(ParseError);
      expect(() => parse('User:\n- has email as text text')).toThrow(
        'Field type already specified'
      );
    });

    it('should throw error for invalid type order (text long)', () => {
      expect(() => parse('User:\n- has bio as text long')).toThrow(ParseError);
    });

    it('should throw error for belongs_to without "to"', () => {
      expect(() => parse('Post:\n- belongs User')).toThrow(ParseError);
    });

    it('should throw error for has_many without "many"', () => {
      expect(() => parse('User:\n- has Post')).toThrow(ParseError);
    });

    it('should throw error for field name starting with digit', () => {
      expect(() => parse('User:\n- has 2fa enabled as boolean')).toThrow();
    });

    it('should throw error for field name exceeding 63 characters', () => {
      const longName = 'a'.repeat(64);
      expect(() => parse(`User:\n- has ${longName} as text`)).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should parse model with only relationships', () => {
      const input = `UserRole:
- belongs to User
- belongs to Role`;

      const ast = parse(input);

      expect(ast.models[0]!.items).toHaveLength(2);
      expect(ast.models[0]!.items.every(isRelationshipDefinition)).toBe(true);
    });

    it('should parse field with all three constraints', () => {
      const input = `User:
- has email as unique and required and indexed text`;

      const ast = parse(input);
      const field = ast.models[0]!.items[0]!;

      if (isFieldDefinition(field)) {
        expect(field.constraints).toHaveLength(3);
        expect(field.constraints).toContain(FieldConstraint.UNIQUE);
        expect(field.constraints).toContain(FieldConstraint.REQUIRED);
        expect(field.constraints).toContain(FieldConstraint.INDEXED);
      }
    });

    it('should preserve case in model names', () => {
      const input = `APIKey[s]:
- has key as text`;

      const ast = parse(input);

      expect(ast.models[0]!.name.singular).toBe('APIKey');
      expect(ast.models[0]!.name.plural).toBe('APIKeys');
    });

    it('should handle single character model names', () => {
      const input = `X:
- has value as text`;

      const ast = parse(input);

      expect(ast.models[0]!.name.singular).toBe('X');
    });

    it('should handle model names with numbers', () => {
      const input = `User2FA:
- has enabled as boolean`;

      const ast = parse(input);

      expect(ast.models[0]!.name.singular).toBe('User2FA');
    });

    it('should handle model names with underscores', () => {
      const input = `User_Role:
- has name as text`;

      const ast = parse(input);

      expect(ast.models[0]!.name.singular).toBe('User_Role');
    });

    it('should parse field with decimal type', () => {
      const input = `Product:
- has price as decimal`;

      const ast = parse(input);
      const field = ast.models[0]!.items[0]!;

      if (isFieldDefinition(field)) {
        expect(field.type).toBe(FieldType.DECIMAL);
      }
    });

    it('should parse field with json type', () => {
      const input = `Settings:
- has config as json`;

      const ast = parse(input);
      const field = ast.models[0]!.items[0]!;

      if (isFieldDefinition(field)) {
        expect(field.type).toBe(FieldType.JSON);
      }
    });

    it('should parse field with uuid type', () => {
      const input = `Session:
- has id as uuid`;

      const ast = parse(input);
      const field = ast.models[0]!.items[0]!;

      if (isFieldDefinition(field)) {
        expect(field.type).toBe(FieldType.UUID);
      }
    });

    it('should handle multiple relationships to same model', () => {
      const input = `Message:
- belongs to User
- belongs to User`;

      const ast = parse(input);

      expect(ast.models[0]!.items).toHaveLength(2);
      expect(ast.models[0]!.items.every(isRelationshipDefinition)).toBe(true);
    });

    it('should parse empty bracket pluralization', () => {
      const input = `Item[]:
- has value as text`;

      const ast = parse(input);

      expect(ast.models[0]!.name.singular).toBe('Item');
      expect(ast.models[0]!.name.plural).toBe('Item');
    });

    it('should parse constraints with mixed separators', () => {
      const input = `User:
- has email as unique, text and required`;

      const ast = parse(input);
      const field = ast.models[0]!.items[0]!;

      if (isFieldDefinition(field)) {
        expect(field.constraints).toContain(FieldConstraint.UNIQUE);
        expect(field.constraints).toContain(FieldConstraint.REQUIRED);
      }
    });

    it('should handle very long field names (within limit)', () => {
      const input = `Test:
- has this is a very long field name but still valid as text`;

      const ast = parse(input);
      const field = ast.models[0]!.items[0]!;

      if (isFieldDefinition(field)) {
        expect(field.name.length).toBeLessThanOrEqual(63);
        expect(field.name).toContain('_');
      }
    });

    it('should parse indexed constraint', () => {
      const input = `User:
- has email as indexed text`;

      const ast = parse(input);
      const field = ast.models[0]!.items[0]!;

      if (isFieldDefinition(field)) {
        expect(field.constraints).toContain(FieldConstraint.INDEXED);
      }
    });

    it('should handle newlines between fields', () => {
      const input = `User:
- has email as text


- has name as text`;

      const ast = parse(input);

      expect(ast.models[0]!.items).toHaveLength(2);
    });

    it('should parse model with trailing newlines', () => {
      const input = `User:
- has email as text


`;

      const ast = parse(input);

      expect(ast.models).toHaveLength(1);
      expect(ast.models[0]!.items).toHaveLength(1);
    });

    it('should handle windows-style line endings', () => {
      const input = 'User:\r\n- has email as text\r\n- has name as text';

      const ast = parse(input);

      expect(ast.models[0]!.items).toHaveLength(2);
    });

    it('should parse field with only type (no constraints)', () => {
      const input = `User:
- has bio as long text`;

      const ast = parse(input);
      const field = ast.models[0]!.items[0]!;

      if (isFieldDefinition(field)) {
        expect(field.type).toBe(FieldType.LONG_TEXT);
        expect(field.constraints).toHaveLength(0);
      }
    });

    it('should parse multiple models with different pluralizations', () => {
      const input = `User[s]:
- has name as text

Categor[y|ies]:
- has title as text

Person[|People]:
- has age as number`;

      const ast = parse(input);

      expect(ast.models).toHaveLength(3);
      expect(ast.models[0]!.name.plural).toBe('Users');
      expect(ast.models[1]!.name.plural).toBe('Categories');
      expect(ast.models[2]!.name.plural).toBe('People');
    });
  });

  describe('Additional Error Handling', () => {
    it('should throw error for missing field type', () => {
      expect(() => parse('User:\n- has email as unique')).toThrow(ParseError);
      expect(() => parse('User:\n- has email as unique')).toThrow('Expected field type');
    });

    it('should throw error for field starting with underscore', () => {
      expect(() => parse('User:\n- has _private as text')).toThrow();
    });

    it('should throw error for empty model name', () => {
      expect(() => parse(':\n- has field as text')).toThrow(ParseError);
    });

    it('should throw error for relationship without target', () => {
      expect(() => parse('User:\n- has many')).toThrow(ParseError);
    });

    it('should throw error for belongs to without target', () => {
      expect(() => parse('Post:\n- belongs to')).toThrow(ParseError);
    });

    it('should throw error for invalid pluralization bracket', () => {
      expect(() => parse('User[a|b|c]:\n- has name as text')).toThrow();
    });
  });
});
