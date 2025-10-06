/**
 * SECURITY Parser Tests
 * Comprehensive test coverage for SECURITY.DSL parser
 */

import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../src/tokenizer/tokenizer.js';
import { SECURITYParser } from '../../src/parsers/security-parser.js';
import { SECURITYFile } from '../../src/types/ast.js';

/**
 * Helper function to parse SECURITY DSL
 */
function parseSecurity(input: string): SECURITYFile {
  const tokenizer = new Tokenizer(input);
  const tokens = tokenizer.tokenize();
  const parser = new SECURITYParser(tokens);
  return parser.parse();
}

describe('SECURITYParser', () => {
  describe('Constraints Section', () => {
    it('should parse basic constraints', () => {
      const input = `
Constraints:
- all password fields must be hashed with bcrypt
- all queries must use parameterized statements
- all timestamps must be UTC
`;

      const result = parseSecurity(input);

      expect(result.constraints).toHaveLength(3);
      expect(result.constraints[0].description).toBe(
        'all password fields must be hashed with bcrypt'
      );
      expect(result.constraints[1].description).toBe(
        'all queries must use parameterized statements'
      );
      expect(result.constraints[2].description).toBe('all timestamps must be UTC');
    });

    it('should parse constraints with minimum rounds', () => {
      const input = `
Constraints:
- all password fields must have minimum 12 rounds
`;

      const result = parseSecurity(input);

      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].description).toContain('minimum 12 rounds');
    });

    it('should parse constraints with indexes', () => {
      const input = `
Constraints:
- all foreign keys must have indexes
`;

      const result = parseSecurity(input);

      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].description).toContain('have indexes');
    });

    it('should parse constraints with sanitization', () => {
      const input = `
Constraints:
- all user input must be sanitized
`;

      const result = parseSecurity(input);

      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].description).toContain('sanitized');
    });

    it('should parse constraints with rate limiting', () => {
      const input = `
Constraints:
- all auth endpoints must have rate limiting
`;

      const result = parseSecurity(input);

      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].description).toContain('rate limiting');
    });

    it('should parse constraints with soft deletes', () => {
      const input = `
Constraints:
- all DELETE operations must be soft deletes for Posts and Comments
`;

      const result = parseSecurity(input);

      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].description).toContain('soft deletes');
      expect(result.constraints[0].description).toContain('Posts and Comments');
    });
  });

  describe('Enforce Section', () => {
    it('should parse prohibitions', () => {
      const input = `
Enforce:
- no raw SQL in generated code
- no eval or dynamic code execution
- no credentials in logs
- no sensitive data in error responses
`;

      const result = parseSecurity(input);

      expect(result.enforce).toHaveLength(4);
      expect(result.enforce[0].description).toBe('no raw SQL in generated code');
      expect(result.enforce[1].description).toBe('no eval or dynamic code execution');
      expect(result.enforce[2].description).toBe('no credentials in logs');
      expect(result.enforce[3].description).toBe('no sensitive data in error responses');
    });

    it('should parse enforcement requirements', () => {
      const input = `
Enforce:
- JWT tokens must expire within 24 hours
- sessions must be HttpOnly and Secure
- CORS must be explicitly configured in api.dsl
`;

      const result = parseSecurity(input);

      expect(result.enforce).toHaveLength(3);
      expect(result.enforce[0].description).toContain('JWT tokens must expire');
      expect(result.enforce[1].description).toContain('HttpOnly and Secure');
      expect(result.enforce[2].description).toContain('explicitly configured');
    });
  });

  describe('Password Rules Section', () => {
    it('should parse password rules', () => {
      const input = `
Password Rules:
- password must not be logged
- password must not be in responses
- password reset tokens must expire within 1 hour
- failed login attempts must be rate limited
`;

      const result = parseSecurity(input);

      expect(result.passwordRules).toHaveLength(4);
      expect(result.passwordRules[0].description).toBe('password must not be logged');
      expect(result.passwordRules[0].field).toBe('password');
      expect(result.passwordRules[0].requirement).toContain('not be logged');

      expect(result.passwordRules[2].description).toContain('password reset tokens');
      expect(result.passwordRules[2].field).toBe('password reset tokens');
      expect(result.passwordRules[2].requirement).toContain('expire within 1 hour');
    });

    it('should parse password not logged rule', () => {
      const input = `
Password Rules:
- password must not be logged
`;

      const result = parseSecurity(input);

      expect(result.passwordRules).toHaveLength(1);
      expect(result.passwordRules[0].field).toBe('password');
      expect(result.passwordRules[0].requirement).toContain('not be logged');
    });

    it('should parse password reset token expiry', () => {
      const input = `
Password Rules:
- password reset tokens must expire within 1 hour
`;

      const result = parseSecurity(input);

      expect(result.passwordRules).toHaveLength(1);
      expect(result.passwordRules[0].field).toBe('password reset tokens');
      expect(result.passwordRules[0].requirement).toContain('expire within 1 hour');
    });
  });

  describe('Data Protection Section', () => {
    it('should parse data protection rules', () => {
      const input = `
Data Protection:
- user email must be unique and validated
- user data must not be exposed in error messages
- session tokens must be regenerated on privilege change
`;

      const result = parseSecurity(input);

      expect(result.dataProtection).toHaveLength(3);
      expect(result.dataProtection[0].description).toBe('user email must be unique and validated');
      expect(result.dataProtection[0].subject).toBe('user email');
      expect(result.dataProtection[0].requirement).toContain('unique and validated');

      expect(result.dataProtection[1].subject).toBe('user data');
      expect(result.dataProtection[1].requirement).toContain('not be exposed');

      expect(result.dataProtection[2].subject).toBe('session tokens');
      expect(result.dataProtection[2].requirement).toContain('regenerated');
    });
  });

  describe('API Security Section', () => {
    it('should parse API security rules', () => {
      const input = `
API Security:
- all endpoints must validate content type
- all responses must not expose stack traces
- all file uploads must validate file type and size
- SQL injection protection must be enforced
- XSS protection must be enabled
`;

      const result = parseSecurity(input);

      expect(result.apiSecurity).toHaveLength(5);
      expect(result.apiSecurity[0].description).toBe('all endpoints must validate content type');
      expect(result.apiSecurity[0].scope).toBe('all endpoints');
      expect(result.apiSecurity[0].requirement).toContain('validate content type');

      expect(result.apiSecurity[1].scope).toBe('all responses');
      expect(result.apiSecurity[1].requirement).toContain('not expose stack traces');

      expect(result.apiSecurity[2].scope).toBe('all file uploads');
      expect(result.apiSecurity[2].requirement).toContain('validate file type and size');

      expect(result.apiSecurity[3].description).toContain('SQL injection');
      expect(result.apiSecurity[4].description).toContain('XSS protection');
    });
  });

  describe('Complete File', () => {
    it('should parse complete security file', () => {
      const input = `
Constraints:
- all password fields must be hashed with bcrypt
- all password fields must have minimum 12 rounds
- all queries must use parameterized statements
- all timestamps must be UTC
- all foreign keys must have indexes
- all user input must be sanitized
- all auth endpoints must have rate limiting
- all DELETE operations must be soft deletes for Posts and Comments

Enforce:
- no raw SQL in generated code
- no eval or dynamic code execution
- no credentials in logs
- no sensitive data in error responses
- JWT tokens must expire within 24 hours
- sessions must be HttpOnly and Secure
- CORS must be explicitly configured in api.dsl

Password Rules:
- password must not be logged
- password must not be in responses
- password reset tokens must expire within 1 hour
- failed login attempts must be rate limited

Data Protection:
- user email must be unique and validated
- user data must not be exposed in error messages
- session tokens must be regenerated on privilege change

API Security:
- all endpoints must validate content type
- all responses must not expose stack traces
- all file uploads must validate file type and size
- SQL injection protection must be enforced
- XSS protection must be enabled
`;

      const result = parseSecurity(input);

      expect(result.constraints).toHaveLength(8);
      expect(result.enforce).toHaveLength(7);
      expect(result.passwordRules).toHaveLength(4);
      expect(result.dataProtection).toHaveLength(3);
      expect(result.apiSecurity).toHaveLength(5);
    });
  });

  describe('Partial Files', () => {
    it('should parse file with only constraints', () => {
      const input = `
Constraints:
- all password fields must be hashed with bcrypt
- all queries must use parameterized statements
`;

      const result = parseSecurity(input);

      expect(result.constraints).toHaveLength(2);
      expect(result.enforce).toHaveLength(0);
      expect(result.passwordRules).toHaveLength(0);
      expect(result.dataProtection).toHaveLength(0);
      expect(result.apiSecurity).toHaveLength(0);
    });

    it('should parse file with only enforce rules', () => {
      const input = `
Enforce:
- no raw SQL in generated code
- no credentials in logs
`;

      const result = parseSecurity(input);

      expect(result.constraints).toHaveLength(0);
      expect(result.enforce).toHaveLength(2);
    });

    it('should parse file with only password rules', () => {
      const input = `
Password Rules:
- password must not be logged
- password must not be in responses
`;

      const result = parseSecurity(input);

      expect(result.passwordRules).toHaveLength(2);
      expect(result.constraints).toHaveLength(0);
      expect(result.enforce).toHaveLength(0);
    });

    it('should parse file with multiple sections in different orders', () => {
      const input = `
Password Rules:
- password must not be logged

Data Protection:
- user email must be unique and validated

Constraints:
- all password fields must be hashed with bcrypt

API Security:
- all endpoints must validate content type

Enforce:
- no raw SQL in generated code
`;

      const result = parseSecurity(input);

      expect(result.constraints).toHaveLength(1);
      expect(result.enforce).toHaveLength(1);
      expect(result.passwordRules).toHaveLength(1);
      expect(result.dataProtection).toHaveLength(1);
      expect(result.apiSecurity).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file', () => {
      const input = '';
      const result = parseSecurity(input);

      expect(result.constraints).toHaveLength(0);
      expect(result.enforce).toHaveLength(0);
      expect(result.passwordRules).toHaveLength(0);
      expect(result.dataProtection).toHaveLength(0);
      expect(result.apiSecurity).toHaveLength(0);
    });

    it('should handle file with only comments', () => {
      const input = `
# This is a comment
# Another comment
`;
      const result = parseSecurity(input);

      expect(result.constraints).toHaveLength(0);
      expect(result.enforce).toHaveLength(0);
    });

    it('should handle extra newlines between sections', () => {
      const input = `
Constraints:
- all password fields must be hashed with bcrypt


Enforce:
- no raw SQL in generated code


Password Rules:
- password must not be logged
`;

      const result = parseSecurity(input);

      expect(result.constraints).toHaveLength(1);
      expect(result.enforce).toHaveLength(1);
      expect(result.passwordRules).toHaveLength(1);
    });

    it('should handle rules with complex descriptions', () => {
      const input = `
Constraints:
- all DELETE operations must be soft deletes for Posts and Comments and Articles
`;

      const result = parseSecurity(input);

      expect(result.constraints).toHaveLength(1);
      expect(result.constraints[0].description).toContain('Posts and Comments and Articles');
    });

    it('should handle multi-word field names', () => {
      const input = `
Password Rules:
- password reset tokens must expire within 1 hour
- failed login attempts must be rate limited
`;

      const result = parseSecurity(input);

      expect(result.passwordRules).toHaveLength(2);
      expect(result.passwordRules[0].field).toBe('password reset tokens');
      expect(result.passwordRules[1].field).toBe('failed login attempts');
    });
  });

  describe('Error Handling', () => {
    it('should throw on missing colon after Constraints', () => {
      const input = `
Constraints
- all password fields must be hashed with bcrypt
`;

      expect(() => parseSecurity(input)).toThrow('Expected ":" after "Constraints"');
    });

    it('should throw on missing rules after Constraints header', () => {
      const input = `
Constraints:

Enforce:
- no raw SQL in generated code
`;

      expect(() => parseSecurity(input)).toThrow('Expected at least one constraint rule');
    });

    it('should throw on missing colon after Enforce', () => {
      const input = `
Enforce
- no raw SQL in generated code
`;

      expect(() => parseSecurity(input)).toThrow('Expected ":" after "Enforce"');
    });

    it('should throw on missing rules after Enforce header', () => {
      const input = `
Enforce:

Constraints:
- all password fields must be hashed with bcrypt
`;

      expect(() => parseSecurity(input)).toThrow('Expected at least one enforce rule');
    });

    it('should throw on missing "Rules" after "Password"', () => {
      const input = `
Password:
- password must not be logged
`;

      expect(() => parseSecurity(input)).toThrow('Expected "Rules" after "Password"');
    });

    it('should throw on missing colon after Password Rules', () => {
      const input = `
Password Rules
- password must not be logged
`;

      expect(() => parseSecurity(input)).toThrow('Expected ":" after "Password Rules"');
    });

    it('should throw on missing rules after Password Rules header', () => {
      const input = `
Password Rules:

Constraints:
- all password fields must be hashed with bcrypt
`;

      expect(() => parseSecurity(input)).toThrow('Expected at least one password rule');
    });

    it('should throw on missing "Protection" after "Data"', () => {
      const input = `
Data:
- user email must be unique and validated
`;

      expect(() => parseSecurity(input)).toThrow('Expected "Protection" after "Data"');
    });

    it('should throw on missing colon after Data Protection', () => {
      const input = `
Data Protection
- user email must be unique and validated
`;

      expect(() => parseSecurity(input)).toThrow('Expected ":" after "Data Protection"');
    });

    it('should throw on missing rules after Data Protection header', () => {
      const input = `
Data Protection:

Constraints:
- all password fields must be hashed with bcrypt
`;

      expect(() => parseSecurity(input)).toThrow('Expected at least one data protection rule');
    });

    it('should throw on missing "Security" after "API"', () => {
      const input = `
API:
- all endpoints must validate content type
`;

      expect(() => parseSecurity(input)).toThrow('Expected "Security" after "API"');
    });

    it('should throw on missing colon after API Security', () => {
      const input = `
API Security
- all endpoints must validate content type
`;

      expect(() => parseSecurity(input)).toThrow('Expected ":" after "API Security"');
    });

    it('should throw on missing rules after API Security header', () => {
      const input = `
API Security:

Constraints:
- all password fields must be hashed with bcrypt
`;

      expect(() => parseSecurity(input)).toThrow('Expected at least one API security rule');
    });
  });

  describe('Position Tracking', () => {
    it('should track positions for constraint rules', () => {
      const input = `
Constraints:
- all password fields must be hashed with bcrypt
`;

      const result = parseSecurity(input);

      expect(result.constraints[0].start).toBeDefined();
      expect(result.constraints[0].end).toBeDefined();
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });
  });
});
