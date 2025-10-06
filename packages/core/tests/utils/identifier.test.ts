/**
 * Tests for identifier normalization utilities
 */

import { describe, it, expect } from 'vitest';
import { normalizeIdentifier, parseModelName } from '../../src/utils/identifier.js';

describe('normalizeIdentifier', () => {
  it('should convert spaces to underscores', () => {
    expect(normalizeIdentifier('user name')).toBe('user_name');
    expect(normalizeIdentifier('first name last name')).toBe('first_name_last_name');
    expect(normalizeIdentifier('created at')).toBe('created_at');
  });

  it('should convert hyphens to underscores', () => {
    expect(normalizeIdentifier('user-name')).toBe('user_name');
    expect(normalizeIdentifier('email-address')).toBe('email_address');
    expect(normalizeIdentifier('first-last-name')).toBe('first_last_name');
  });

  it('should convert mixed spaces and hyphens to underscores', () => {
    expect(normalizeIdentifier('user name-test')).toBe('user_name_test');
    expect(normalizeIdentifier('first-name last-name')).toBe('first_name_last_name');
  });

  it('should preserve underscores', () => {
    expect(normalizeIdentifier('user_name')).toBe('user_name');
    expect(normalizeIdentifier('created_at')).toBe('created_at');
  });

  it('should preserve case', () => {
    expect(normalizeIdentifier('UserName')).toBe('UserName');
    expect(normalizeIdentifier('APIKey')).toBe('APIKey');
  });

  it('should handle single character identifiers', () => {
    expect(normalizeIdentifier('x')).toBe('x');
    expect(normalizeIdentifier('A')).toBe('A');
  });

  it('should throw error if identifier is empty', () => {
    expect(() => normalizeIdentifier('')).toThrow('Identifier cannot be empty');
  });

  it('should throw error if identifier starts with digit', () => {
    expect(() => normalizeIdentifier('2fa enabled')).toThrow('must start with a letter');
    expect(() => normalizeIdentifier('123abc')).toThrow('must start with a letter');
  });

  it('should throw error if identifier exceeds 63 characters', () => {
    const longIdentifier = 'a'.repeat(64);
    expect(() => normalizeIdentifier(longIdentifier)).toThrow(
      'exceeds maximum length of 63 characters'
    );
  });

  it('should accept identifier with exactly 63 characters', () => {
    const exactLength = 'a'.repeat(63);
    expect(normalizeIdentifier(exactLength)).toBe(exactLength);
  });

  it('should throw error for invalid characters after normalization', () => {
    expect(() => normalizeIdentifier('user.name')).toThrow('contains invalid characters');
    expect(() => normalizeIdentifier('user@domain')).toThrow('contains invalid characters');
  });

  it('should handle multiple consecutive spaces/hyphens', () => {
    expect(normalizeIdentifier('user  name')).toBe('user_name');
    expect(normalizeIdentifier('user---name')).toBe('user_name');
    expect(normalizeIdentifier('user - - name')).toBe('user_name');
  });
});

describe('parseModelName', () => {
  describe('simple pluralization (suffix)', () => {
    it('should parse User[s]', () => {
      const result = parseModelName('User[s]');
      expect(result.singular).toBe('User');
      expect(result.plural).toBe('Users');
      expect(result.originalForm).toBe('User[s]');
    });

    it('should parse Post[s]', () => {
      const result = parseModelName('Post[s]');
      expect(result.singular).toBe('Post');
      expect(result.plural).toBe('Posts');
      expect(result.originalForm).toBe('Post[s]');
    });

    it('should parse Tag[s]', () => {
      const result = parseModelName('Tag[s]');
      expect(result.singular).toBe('Tag');
      expect(result.plural).toBe('Tags');
      expect(result.originalForm).toBe('Tag[s]');
    });

    it('should parse Comment[s]', () => {
      const result = parseModelName('Comment[s]');
      expect(result.singular).toBe('Comment');
      expect(result.plural).toBe('Comments');
      expect(result.originalForm).toBe('Comment[s]');
    });
  });

  describe('custom pluralization (singular|plural)', () => {
    it('should parse Categor[y|ies]', () => {
      const result = parseModelName('Categor[y|ies]');
      expect(result.singular).toBe('Category');
      expect(result.plural).toBe('Categories');
      expect(result.originalForm).toBe('Categor[y|ies]');
    });

    it('should parse Cit[y|ies]', () => {
      const result = parseModelName('Cit[y|ies]');
      expect(result.singular).toBe('City');
      expect(result.plural).toBe('Cities');
      expect(result.originalForm).toBe('Cit[y|ies]');
    });

    it('should parse Countr[y|ies]', () => {
      const result = parseModelName('Countr[y|ies]');
      expect(result.singular).toBe('Country');
      expect(result.plural).toBe('Countries');
      expect(result.originalForm).toBe('Countr[y|ies]');
    });
  });

  describe('irregular pluralization (|plural)', () => {
    it('should parse Person[|People]', () => {
      const result = parseModelName('Person[|People]');
      expect(result.singular).toBe('Person');
      expect(result.plural).toBe('People');
      expect(result.originalForm).toBe('Person[|People]');
    });

    it('should parse Child[|Children]', () => {
      const result = parseModelName('Child[|Children]');
      expect(result.singular).toBe('Child');
      expect(result.plural).toBe('Children');
      expect(result.originalForm).toBe('Child[|Children]');
    });

    it('should parse Goose[|Geese]', () => {
      const result = parseModelName('Goose[|Geese]');
      expect(result.singular).toBe('Goose');
      expect(result.plural).toBe('Geese');
      expect(result.originalForm).toBe('Goose[|Geese]');
    });
  });

  describe('no pluralization', () => {
    it('should handle model without brackets', () => {
      const result = parseModelName('User');
      expect(result.singular).toBe('User');
      expect(result.plural).toBe('User');
      expect(result.originalForm).toBe('User');
    });

    it('should handle single character model', () => {
      const result = parseModelName('X');
      expect(result.singular).toBe('X');
      expect(result.plural).toBe('X');
      expect(result.originalForm).toBe('X');
    });
  });

  describe('edge cases', () => {
    it('should handle empty suffix', () => {
      const result = parseModelName('Model[]');
      expect(result.singular).toBe('Model');
      expect(result.plural).toBe('Model');
      expect(result.originalForm).toBe('Model[]');
    });

    it('should handle multi-character suffix', () => {
      const result = parseModelName('Ox[en]');
      expect(result.singular).toBe('Ox');
      expect(result.plural).toBe('Oxen');
      expect(result.originalForm).toBe('Ox[en]');
    });

    it('should preserve case', () => {
      const result = parseModelName('APIKey[s]');
      expect(result.singular).toBe('APIKey');
      expect(result.plural).toBe('APIKeys');
    });

    it('should handle numbers in model name', () => {
      const result = parseModelName('User2[s]');
      expect(result.singular).toBe('User2');
      expect(result.plural).toBe('User2s');
    });

    it('should throw error for invalid format (multiple pipes)', () => {
      expect(() => parseModelName('Model[a|b|c]')).toThrow('Invalid pluralization format');
    });

    it('should handle underscores in model names', () => {
      const result = parseModelName('User_Role[s]');
      expect(result.singular).toBe('User_Role');
      expect(result.plural).toBe('User_Roles');
    });

    it('should handle hyphens in model names', () => {
      const result = parseModelName('User-Role[s]');
      expect(result.singular).toBe('User-Role');
      expect(result.plural).toBe('User-Roles');
    });
  });

  describe('normalizeIdentifier edge cases', () => {
    it('should handle single word identifiers', () => {
      expect(normalizeIdentifier('email')).toBe('email');
      expect(normalizeIdentifier('username')).toBe('username');
    });

    it('should handle identifiers with trailing spaces', () => {
      expect(normalizeIdentifier('user name ')).toBe('user_name');
    });

    it('should handle identifiers with leading spaces', () => {
      expect(normalizeIdentifier(' user name')).toBe('user_name');
    });

    it('should handle mixed case identifiers', () => {
      expect(normalizeIdentifier('UserName')).toBe('UserName');
      expect(normalizeIdentifier('user Name')).toBe('user_Name');
    });

    it('should handle identifiers with multiple words', () => {
      expect(normalizeIdentifier('this is a field name')).toBe('this_is_a_field_name');
    });

    it('should reject identifiers with special characters', () => {
      expect(() => normalizeIdentifier('user$name')).toThrow('contains invalid characters');
      expect(() => normalizeIdentifier('user#name')).toThrow('contains invalid characters');
      expect(() => normalizeIdentifier('user@name')).toThrow('contains invalid characters');
    });

    it('should handle identifier at exactly 63 characters after normalization', () => {
      // Create a string that will be exactly 63 chars after underscore conversion
      const longName = 'a'.repeat(60) + ' bc'; // 60 + 1 + 2 = 63 after conversion
      const normalized = normalizeIdentifier(longName);
      expect(normalized.length).toBe(63);
    });

    it('should reject identifier over 63 characters after normalization', () => {
      const longName = 'a'.repeat(61) + ' bc'; // 61 + 1 + 2 = 64 after conversion
      expect(() => normalizeIdentifier(longName)).toThrow('exceeds maximum length');
    });
  });

  describe('parseModelName edge cases', () => {
    it('should handle complex irregular plurals', () => {
      const result = parseModelName('Tooth[|Teeth]');
      expect(result.singular).toBe('Tooth');
      expect(result.plural).toBe('Teeth');
    });

    it('should handle models with only plural suffix change', () => {
      const result = parseModelName('Stor[y|ies]');
      expect(result.singular).toBe('Story');
      expect(result.plural).toBe('Stories');
    });

    it('should handle empty singular suffix with non-empty plural', () => {
      const result = parseModelName('Mouse[|Mice]');
      expect(result.singular).toBe('Mouse');
      expect(result.plural).toBe('Mice');
    });

    it('should preserve exact case in both forms', () => {
      const result = parseModelName('HTTPRequest[s]');
      expect(result.singular).toBe('HTTPRequest');
      expect(result.plural).toBe('HTTPRequests');
    });
  });
});
