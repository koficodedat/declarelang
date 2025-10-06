/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * AUTH Parser Tests
 * Comprehensive test coverage for AUTH.DSL parser
 */

import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../src/tokenizer/index.js';
import { AUTHParser } from '../../src/parsers/auth-parser.js';
import {
  SubjectType,
  CRUDAction,
  TargetModifier,
  FieldAction,
  type AUTHFile,
} from '../../src/types/ast.js';

/**
 * Helper function to parse AUTH DSL
 */
function parseAUTH(input: string): AUTHFile {
  const tokenizer = new Tokenizer(input);
  const tokens = tokenizer.tokenize();
  const parser = new AUTHParser(tokens);
  return parser.parse();
}

describe('AUTHParser', () => {
  describe('Role Definitions', () => {
    it('should parse single role', () => {
      const input = `
Roles:
- admin
`;
      const result = parseAUTH(input);
      expect(result.roles).toHaveLength(1);
      expect(result.roles[0]!.name).toBe('admin');
      expect(result.roles[0]!.originalName).toBe('admin');
    });

    it('should parse multiple roles', () => {
      const input = `
Roles:
- admin
- author
- user
- guest
`;
      const result = parseAUTH(input);
      expect(result.roles).toHaveLength(4);
      expect(result.roles.map((r) => r.name)).toEqual(['admin', 'author', 'user', 'guest']);
    });

    it('should normalize role names with spaces', () => {
      const input = `
Roles:
- super admin
- content editor
`;
      const result = parseAUTH(input);
      expect(result.roles).toHaveLength(2);
      expect(result.roles[0]!.name).toBe('super_admin');
      expect(result.roles[0]!.originalName).toBe('super admin');
      expect(result.roles[1]!.name).toBe('content_editor');
      expect(result.roles[1]!.originalName).toBe('content editor');
    });

    it('should normalize role names with hyphens', () => {
      const input = `
Roles:
- super-admin
- content-editor
`;
      const result = parseAUTH(input);
      expect(result.roles).toHaveLength(2);
      expect(result.roles[0]!.name).toBe('super_admin');
      expect(result.roles[1]!.name).toBe('content_editor');
    });
  });

  describe('Model Rules - Basic Permissions', () => {
    it('should parse permission with anyone subject', () => {
      const input = `
Roles:

Rules for Post:
- anyone can read Posts
`;
      const result = parseAUTH(input);
      expect(result.modelRules).toHaveLength(1);
      const rules = result.modelRules[0]!;
      expect(rules.modelName).toBe('Post');
      expect(rules.permissions).toHaveLength(1);

      const perm = rules.permissions[0]!;
      expect(perm.subject.type).toBe(SubjectType.ANYONE);
      expect(perm.action).toBe(CRUDAction.READ);
      expect(perm.target.modelName).toBe('Post');
      expect(perm.target.modifier).toBe(TargetModifier.NONE);
    });

    it('should parse permission with authenticated users subject', () => {
      const input = `
Roles:

Rules for Post:
- authenticated users can create Posts
`;
      const result = parseAUTH(input);
      const perm = result.modelRules[0]!.permissions[0]!;
      expect(perm.subject.type).toBe(SubjectType.AUTHENTICATED_USERS);
      expect(perm.action).toBe(CRUDAction.CREATE);
    });

    it('should parse permission with users subject', () => {
      const input = `
Roles:

Rules for Post:
- users can edit own Posts
`;
      const result = parseAUTH(input);
      const perm = result.modelRules[0]!.permissions[0]!;
      expect(perm.subject.type).toBe(SubjectType.USERS);
      expect(perm.action).toBe(CRUDAction.EDIT);
      expect(perm.target.modifier).toBe(TargetModifier.OWN);
    });

    it('should parse permission with role subject', () => {
      const input = `
Roles:
- admin

Rules for Post:
- admins can delete any Post
`;
      const result = parseAUTH(input);
      const perm = result.modelRules[0]!.permissions[0]!;
      expect(perm.subject.type).toBe(SubjectType.ROLE);
      if (perm.subject.type === SubjectType.ROLE) {
        expect(perm.subject.roleName).toBe('admin');
      }
      expect(perm.action).toBe(CRUDAction.DELETE);
      expect(perm.target.modifier).toBe(TargetModifier.ANY);
    });
  });

  describe('Model Rules - CRUD Actions', () => {
    it('should parse create action', () => {
      const input = `
Roles:

Rules for Post:
- authenticated users can create Posts
`;
      const result = parseAUTH(input);
      expect(result.modelRules[0]!.permissions[0]!.action).toBe(CRUDAction.CREATE);
    });

    it('should parse read action', () => {
      const input = `
Roles:

Rules for Post:
- anyone can read Posts
`;
      const result = parseAUTH(input);
      expect(result.modelRules[0]!.permissions[0]!.action).toBe(CRUDAction.READ);
    });

    it('should parse edit action', () => {
      const input = `
Roles:

Rules for Post:
- users can edit own Posts
`;
      const result = parseAUTH(input);
      expect(result.modelRules[0]!.permissions[0]!.action).toBe(CRUDAction.EDIT);
    });

    it('should parse update action', () => {
      const input = `
Roles:

Rules for Post:
- users can update own Posts
`;
      const result = parseAUTH(input);
      expect(result.modelRules[0]!.permissions[0]!.action).toBe(CRUDAction.UPDATE);
    });

    it('should parse delete action', () => {
      const input = `
Roles:
- admin

Rules for Post:
- admins can delete any Post
`;
      const result = parseAUTH(input);
      expect(result.modelRules[0]!.permissions[0]!.action).toBe(CRUDAction.DELETE);
    });
  });

  describe('Model Rules - Target Modifiers', () => {
    it('should parse target without modifier (default NONE)', () => {
      const input = `
Roles:

Rules for Post:
- anyone can read Posts
`;
      const result = parseAUTH(input);
      const target = result.modelRules[0]!.permissions[0]!.target;
      expect(target.modifier).toBe(TargetModifier.NONE);
      expect(target.modelName).toBe('Post');
    });

    it('should parse own modifier', () => {
      const input = `
Roles:

Rules for Post:
- users can edit own Posts
`;
      const result = parseAUTH(input);
      const target = result.modelRules[0]!.permissions[0]!.target;
      expect(target.modifier).toBe(TargetModifier.OWN);
      expect(target.modelName).toBe('Post');
    });

    it('should parse any modifier', () => {
      const input = `
Roles:
- admin

Rules for Post:
- admins can delete any Post
`;
      const result = parseAUTH(input);
      const target = result.modelRules[0]!.permissions[0]!.target;
      expect(target.modifier).toBe(TargetModifier.ANY);
      expect(target.modelName).toBe('Post');
    });
  });

  describe('Model Rules - Conditions', () => {
    it('should parse permission with simple where clause', () => {
      const input = `
Roles:

Rules for Post:
- anyone can read Posts where published is true
`;
      const result = parseAUTH(input);
      const perm = result.modelRules[0]!.permissions[0]!;
      expect(perm.condition).toBeDefined();
      expect(perm.condition?.conditions).toHaveLength(1);
      expect(perm.condition?.conditions[0]!.field).toBe('published');
      expect(perm.condition?.conditions[0]!.operator).toBe('is');
      expect(perm.condition?.conditions[0]!.value?.type).toBe('literal');
    });

    it('should parse permission with multiple where conditions', () => {
      const input = `
Roles:

Rules for Post:
- users can edit own Posts where published is false and status equals "draft"
`;
      const result = parseAUTH(input);
      const perm = result.modelRules[0]!.permissions[0]!;
      expect(perm.condition).toBeDefined();
      expect(perm.condition?.conditions).toHaveLength(2);
      expect(perm.condition?.conditions[0]!.field).toBe('published');
      expect(perm.condition?.conditions[1]!.field).toBe('status');
    });

    it('should parse permission with time-based condition', () => {
      const input = `
Roles:

Rules for Post:
- users can read Posts where created_at is after 7 days ago
`;
      const result = parseAUTH(input);
      const perm = result.modelRules[0]!.permissions[0]!;
      expect(perm.condition).toBeDefined();
      expect(perm.condition?.conditions[0]!.value?.type).toBe('time');
    });
  });

  describe('Model Rules - Multiple Models', () => {
    it('should parse rules for multiple models', () => {
      const input = `
Roles:
- admin
- user

Rules for Post:
- users can create Posts
- admins can delete any Post

Rules for Comment:
- users can create Comments
- users can edit own Comments
`;
      const result = parseAUTH(input);
      expect(result.modelRules).toHaveLength(2);
      expect(result.modelRules[0]!.modelName).toBe('Post');
      expect(result.modelRules[0]!.permissions).toHaveLength(2);
      expect(result.modelRules[1]!.modelName).toBe('Comment');
      expect(result.modelRules[1]!.permissions).toHaveLength(2);
    });

    it('should parse rules with many permissions per model', () => {
      const input = `
Roles:
- admin
- author
- user

Rules for Post:
- users can read Posts where published is true
- authenticated users can create Posts
- authors can edit own Posts
- admins can edit any Post
- admins can delete any Post
`;
      const result = parseAUTH(input);
      expect(result.modelRules).toHaveLength(1);
      expect(result.modelRules[0]!.permissions).toHaveLength(5);
    });
  });

  describe('Field Rules - Basic Field Permissions', () => {
    it('should parse can edit field permission', () => {
      const input = `
Roles:
- admin

Field Rules for User:
- admins can edit role
`;
      const result = parseAUTH(input);
      expect(result.fieldRules).toHaveLength(1);
      expect(result.fieldRules[0]!.modelName).toBe('User');
      expect(result.fieldRules[0]!.permissions).toHaveLength(1);

      const perm = result.fieldRules[0]!.permissions[0]!;
      expect(perm.action).toBe(FieldAction.EDIT);
      expect(perm.fieldName).toBe('role');
      expect(perm.allowed).toBe(true);
      expect(perm.subject.type).toBe(SubjectType.ROLE);
    });

    it('should parse cannot edit field permission', () => {
      const input = `
Roles:

Field Rules for User:
- users cannot edit role
`;
      const result = parseAUTH(input);
      const perm = result.fieldRules[0]!.permissions[0]!;
      expect(perm.action).toBe(FieldAction.EDIT);
      expect(perm.fieldName).toBe('role');
      expect(perm.allowed).toBe(false);
      expect(perm.subject.type).toBe(SubjectType.USERS);
    });

    it('should parse can read field permission', () => {
      const input = `
Roles:

Field Rules for User:
- users can read email
`;
      const result = parseAUTH(input);
      const perm = result.fieldRules[0]!.permissions[0]!;
      expect(perm.action).toBe(FieldAction.READ);
      expect(perm.fieldName).toBe('email');
      expect(perm.allowed).toBe(true);
    });

    it('should parse cannot read field permission', () => {
      const input = `
Roles:

Field Rules for User:
- users cannot read password
`;
      const result = parseAUTH(input);
      const perm = result.fieldRules[0]!.permissions[0]!;
      expect(perm.action).toBe(FieldAction.READ);
      expect(perm.fieldName).toBe('password');
      expect(perm.allowed).toBe(false);
    });

    it('should parse can set field permission', () => {
      const input = `
Roles:
- admin

Field Rules for User:
- admins can set role
`;
      const result = parseAUTH(input);
      const perm = result.fieldRules[0]!.permissions[0]!;
      expect(perm.action).toBe(FieldAction.SET);
      expect(perm.fieldName).toBe('role');
      expect(perm.allowed).toBe(true);
    });

    it('should parse cannot set field permission', () => {
      const input = `
Roles:

Field Rules for User:
- users cannot set role
`;
      const result = parseAUTH(input);
      const perm = result.fieldRules[0]!.permissions[0]!;
      expect(perm.action).toBe(FieldAction.SET);
      expect(perm.fieldName).toBe('role');
      expect(perm.allowed).toBe(false);
    });
  });

  describe('Field Rules - Field Subjects', () => {
    it('should parse field rule with anyone subject', () => {
      const input = `
Roles:

Field Rules for Post:
- anyone can read title
`;
      const result = parseAUTH(input);
      const perm = result.fieldRules[0]!.permissions[0]!;
      expect(perm.subject.type).toBe(SubjectType.ANYONE);
    });

    it('should parse field rule with authenticated users subject', () => {
      const input = `
Roles:

Field Rules for Post:
- authenticated users can read content
`;
      const result = parseAUTH(input);
      const perm = result.fieldRules[0]!.permissions[0]!;
      expect(perm.subject.type).toBe(SubjectType.AUTHENTICATED_USERS);
    });

    it('should parse field rule with users subject', () => {
      const input = `
Roles:

Field Rules for User:
- users can edit email
`;
      const result = parseAUTH(input);
      const perm = result.fieldRules[0]!.permissions[0]!;
      expect(perm.subject.type).toBe(SubjectType.USERS);
    });

    it('should parse field rule with role subject', () => {
      const input = `
Roles:
- admin

Field Rules for User:
- admins can edit role
`;
      const result = parseAUTH(input);
      const perm = result.fieldRules[0]!.permissions[0]!;
      expect(perm.subject.type).toBe(SubjectType.ROLE);
      if (perm.subject.type === SubjectType.ROLE) {
        expect(perm.subject.roleName).toBe('admin');
      }
    });
  });

  describe('Field Rules - Multiple Fields and Models', () => {
    it('should parse multiple field permissions for one model', () => {
      const input = `
Roles:
- admin

Field Rules for User:
- users cannot edit role
- admins can edit role
- users can edit email
- users cannot read password
`;
      const result = parseAUTH(input);
      expect(result.fieldRules).toHaveLength(1);
      expect(result.fieldRules[0]!.permissions).toHaveLength(4);
    });

    it('should parse field rules for multiple models', () => {
      const input = `
Roles:
- admin

Field Rules for User:
- users cannot edit role
- admins can edit role

Field Rules for Post:
- users can edit title
- users cannot edit published
`;
      const result = parseAUTH(input);
      expect(result.fieldRules).toHaveLength(2);
      expect(result.fieldRules[0]!.modelName).toBe('User');
      expect(result.fieldRules[0]!.permissions).toHaveLength(2);
      expect(result.fieldRules[1]!.modelName).toBe('Post');
      expect(result.fieldRules[1]!.permissions).toHaveLength(2);
    });
  });

  describe('Field Rules - Field Name Normalization', () => {
    it('should normalize field names with spaces', () => {
      const input = `
Roles:

Field Rules for User:
- users can edit first name
`;
      const result = parseAUTH(input);
      const perm = result.fieldRules[0]!.permissions[0]!;
      expect(perm.fieldName).toBe('first_name');
    });

    it('should normalize field names with hyphens', () => {
      const input = `
Roles:

Field Rules for User:
- users can edit first-name
`;
      const result = parseAUTH(input);
      const perm = result.fieldRules[0]!.permissions[0]!;
      expect(perm.fieldName).toBe('first_name');
    });

    it('should handle multi-word field names', () => {
      const input = `
Roles:

Field Rules for Post:
- users can edit very long field name here
`;
      const result = parseAUTH(input);
      const perm = result.fieldRules[0]!.permissions[0]!;
      expect(perm.fieldName).toBe('very_long_field_name_here');
    });
  });

  describe('Complete AUTH File', () => {
    it('should parse complete AUTH file with all sections', () => {
      const input = `
Roles:
- admin
- author
- user
- guest

Rules for Post:
- authenticated users can create Posts
- users can edit own Posts where published is false
- admins can delete any Post
- anyone can read Posts where published is true

Field Rules for User:
- users cannot edit role
- admins can edit role
`;
      const result = parseAUTH(input);

      expect(result.roles).toHaveLength(4);
      expect(result.modelRules).toHaveLength(1);
      expect(result.modelRules[0]!.permissions).toHaveLength(4);
      expect(result.fieldRules).toHaveLength(1);
      expect(result.fieldRules[0]!.permissions).toHaveLength(2);
    });

    it('should parse AUTH file with only roles', () => {
      const input = `
Roles:
- admin
- user
`;
      const result = parseAUTH(input);
      expect(result.roles).toHaveLength(2);
      expect(result.modelRules).toHaveLength(0);
      expect(result.fieldRules).toHaveLength(0);
    });

    it('should parse AUTH file with roles and model rules only', () => {
      const input = `
Roles:
- admin

Rules for Post:
- admins can delete any Post
`;
      const result = parseAUTH(input);
      expect(result.roles).toHaveLength(1);
      expect(result.modelRules).toHaveLength(1);
      expect(result.fieldRules).toHaveLength(0);
    });

    it('should parse AUTH file with roles and field rules only', () => {
      const input = `
Roles:
- admin

Field Rules for User:
- admins can edit role
`;
      const result = parseAUTH(input);
      expect(result.roles).toHaveLength(1);
      expect(result.modelRules).toHaveLength(0);
      expect(result.fieldRules).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty roles section', () => {
      const input = `
Roles:

Rules for Post:
- anyone can read Posts
`;
      const result = parseAUTH(input);
      expect(result.roles).toHaveLength(0);
      expect(result.modelRules).toHaveLength(1);
    });

    it('should handle role names with numbers', () => {
      const input = `
Roles:
- admin123
- user1
`;
      const result = parseAUTH(input);
      expect(result.roles).toHaveLength(2);
      expect(result.roles[0]!.name).toBe('admin123');
      expect(result.roles[1]!.name).toBe('user1');
    });

    it('should handle model names with multiple words', () => {
      const input = `
Roles:

Rules for Blog Post:
- anyone can read Blog Posts
`;
      const result = parseAUTH(input);
      expect(result.modelRules[0]!.modelName).toBe('Blog Post');
      expect(result.modelRules[0]!.permissions[0]!.target.modelName).toBe('Blog Post');
    });

    it('should handle pluralized role names correctly', () => {
      const input = `
Roles:
- admin

Rules for Post:
- admins can delete any Post
`;
      const result = parseAUTH(input);
      const perm = result.modelRules[0]!.permissions[0]!;
      expect(perm.subject.type).toBe(SubjectType.ROLE);
      if (perm.subject.type === SubjectType.ROLE) {
        expect(perm.subject.roleName).toBe('admin');
      }
    });

    it('should handle long role names within 63 character limit', () => {
      const input = `
Roles:
- very_long_role_name_that_is_exactly_sixty_three_characters_long
`;
      const result = parseAUTH(input);
      expect(result.roles).toHaveLength(1);
      expect(result.roles[0]!.name.length).toBeLessThanOrEqual(63);
    });

    it('should handle complex nested conditions', () => {
      const input = `
Roles:

Rules for Post:
- users can read Posts where published is true and created_at is after 30 days ago
`;
      const result = parseAUTH(input);
      const perm = result.modelRules[0]!.permissions[0]!;
      expect(perm.condition?.conditions).toHaveLength(2);
      expect(perm.condition?.conditions[0]!.field).toBe('published');
      expect(perm.condition?.conditions[1]!.field).toBe('created_at');
    });

    it('should handle permissions with all comparison operators', () => {
      const input = `
Roles:

Rules for Post:
- users can read Posts where title contains "test"
- users can read Posts where status equals "published"
- users can read Posts where title matches "pattern"
- users can read Posts where title starts with "Hello"
- users can read Posts where title ends with "World"
`;
      const result = parseAUTH(input);
      expect(result.modelRules[0]!.permissions).toHaveLength(5);
      expect(result.modelRules[0]!.permissions[0]!.condition?.conditions[0]!.operator).toBe(
        'contains'
      );
      expect(result.modelRules[0]!.permissions[1]!.condition?.conditions[0]!.operator).toBe(
        'equals'
      );
      expect(result.modelRules[0]!.permissions[2]!.condition?.conditions[0]!.operator).toBe(
        'matches'
      );
      expect(result.modelRules[0]!.permissions[3]!.condition?.conditions[0]!.operator).toBe(
        'starts_with'
      );
      expect(result.modelRules[0]!.permissions[4]!.condition?.conditions[0]!.operator).toBe(
        'ends_with'
      );
    });

    it('should handle whitespace and newlines gracefully', () => {
      const input = `

Roles:
- admin


Rules for Post:

- admins can delete any Post


Field Rules for User:

- admins can edit role

`;
      const result = parseAUTH(input);
      expect(result.roles).toHaveLength(1);
      expect(result.modelRules).toHaveLength(1);
      expect(result.fieldRules).toHaveLength(1);
    });

    it('should preserve original names for display', () => {
      const input = `
Roles:
- Super Admin
- Content Editor

Rules for Blog Post:
- Super Admins can delete any Blog Post
`;
      const result = parseAUTH(input);
      expect(result.roles[0]!.name).toBe('Super_Admin');
      expect(result.roles[0]!.originalName).toBe('Super Admin');
      expect(result.roles[1]!.name).toBe('Content_Editor');
      expect(result.roles[1]!.originalName).toBe('Content Editor');
    });
  });

  describe('Position Information', () => {
    it('should track position for role definitions', () => {
      const input = `
Roles:
- admin
`;
      const result = parseAUTH(input);
      expect(result.roles[0]!.start).toBeDefined();
      expect(result.roles[0]!.end).toBeDefined();
    });

    it('should track position for permission rules', () => {
      const input = `
Roles:

Rules for Post:
- anyone can read Posts
`;
      const result = parseAUTH(input);
      expect(result.modelRules[0]!.start).toBeDefined();
      expect(result.modelRules[0]!.end).toBeDefined();
      expect(result.modelRules[0]!.permissions[0]!.start).toBeDefined();
      expect(result.modelRules[0]!.permissions[0]!.end).toBeDefined();
    });

    it('should track position for field rules', () => {
      const input = `
Roles:

Field Rules for User:
- users can edit email
`;
      const result = parseAUTH(input);
      expect(result.fieldRules[0]!.start).toBeDefined();
      expect(result.fieldRules[0]!.end).toBeDefined();
      expect(result.fieldRules[0]!.permissions[0]!.start).toBeDefined();
      expect(result.fieldRules[0]!.permissions[0]!.end).toBeDefined();
    });
  });
});
