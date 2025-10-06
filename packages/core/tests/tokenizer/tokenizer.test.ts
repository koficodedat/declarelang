/**
 * Tokenizer tests
 * Tests based on DSL Grammar Specification v0.1.0
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../src/tokenizer/tokenizer.js';
import { TokenType, TokenizerError } from '../../src/types/token.js';

describe('Tokenizer', () => {
  describe('Basic token recognition', () => {
    it('should tokenize keywords (case-insensitive)', () => {
      const tokenizer = new Tokenizer('HAS has Has');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(4); // 3 tokens + EOF
      expect(tokens[0]!.type).toBe(TokenType.HAS);
      expect(tokens[1]!.type).toBe(TokenType.HAS);
      expect(tokens[2]!.type).toBe(TokenType.HAS);
      expect(tokens[3]!.type).toBe(TokenType.EOF);
    });

    it('should tokenize identifiers', () => {
      const tokenizer = new Tokenizer('user email username');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(4); // 3 identifiers + EOF
      expect(tokens[0]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0]!.value).toBe('user');
      expect(tokens[1]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1]!.value).toBe('email');
      expect(tokens[2]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2]!.value).toBe('username');
    });

    it('should tokenize numbers', () => {
      const tokenizer = new Tokenizer('123 456.78 0');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(4); // 3 numbers + EOF
      expect(tokens[0]!.type).toBe(TokenType.NUMBER);
      expect(tokens[0]!.value).toBe('123');
      expect(tokens[1]!.type).toBe(TokenType.NUMBER);
      expect(tokens[1]!.value).toBe('456.78');
      expect(tokens[2]!.type).toBe(TokenType.NUMBER);
      expect(tokens[2]!.value).toBe('0');
    });

    it('should tokenize string literals with double quotes', () => {
      const tokenizer = new Tokenizer('"hello world" "test"');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3); // 2 strings + EOF
      expect(tokens[0]!.type).toBe(TokenType.STRING);
      expect(tokens[0]!.value).toBe('hello world');
      expect(tokens[1]!.type).toBe(TokenType.STRING);
      expect(tokens[1]!.value).toBe('test');
    });

    it('should tokenize string literals with single quotes', () => {
      const tokenizer = new Tokenizer("'hello world' 'test'");
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3); // 2 strings + EOF
      expect(tokens[0]!.type).toBe(TokenType.STRING);
      expect(tokens[0]!.value).toBe('hello world');
      expect(tokens[1]!.type).toBe(TokenType.STRING);
      expect(tokens[1]!.value).toBe('test');
    });

    it('should handle escape sequences in strings', () => {
      const tokenizer = new Tokenizer('"line1\\nline2" "tab\\there"');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.value).toBe('line1\nline2');
      expect(tokens[1]!.value).toBe('tab\there');
    });
  });

  describe('Identifier conversion rules', () => {
    it('should convert hyphens to underscores in single identifiers', () => {
      const tokenizer = new Tokenizer('user-name first-name');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0]!.value).toBe('user_name');
      expect(tokens[1]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1]!.value).toBe('first_name');
    });

    it('should preserve underscores', () => {
      const tokenizer = new Tokenizer('user_name created_at');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.value).toBe('user_name');
      expect(tokens[1]!.value).toBe('created_at');
    });

    it('should tokenize space-separated words as separate identifiers', () => {
      const tokenizer = new Tokenizer('user name created time');
      const tokens = tokenizer.tokenize();

      // Tokenizer produces separate tokens; parser will merge them based on context
      expect(tokens).toHaveLength(5); // user, name, created, time, EOF
      expect(tokens[0]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0]!.value).toBe('user');
      expect(tokens[1]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1]!.value).toBe('name');
      expect(tokens[2]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2]!.value).toBe('created');
      expect(tokens[3]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[3]!.value).toBe('time');
    });

    it('should handle mixed hyphens and underscores', () => {
      const tokenizer = new Tokenizer('user-id email_address');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.value).toBe('user_id');
      expect(tokens[1]!.value).toBe('email_address');
    });

    it('should error on identifiers exceeding 63 characters', () => {
      const longIdentifier = 'a'.repeat(64);
      const tokenizer = new Tokenizer(longIdentifier);

      expect(() => tokenizer.tokenize()).toThrow(TokenizerError);
      try {
        tokenizer.tokenize();
      } catch (error) {
        expect(error).toBeInstanceOf(TokenizerError);
        expect((error as Error).message).toMatch(/exceeds maximum length/);
      }
    });

    it('should accept identifiers with exactly 63 characters', () => {
      const identifier = 'a'.repeat(63);
      const tokenizer = new Tokenizer(identifier);
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0]!.value).toHaveLength(63);
    });
  });

  describe('Keyword recognition', () => {
    it('should recognize data type keywords', () => {
      const tokenizer = new Tokenizer('text long number decimal boolean timestamp json uuid');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.TEXT);
      expect(tokens[1]!.type).toBe(TokenType.LONG);
      expect(tokens[2]!.type).toBe(TokenType.NUMBER_TYPE);
      expect(tokens[3]!.type).toBe(TokenType.DECIMAL);
      expect(tokens[4]!.type).toBe(TokenType.BOOLEAN_TYPE);
      expect(tokens[5]!.type).toBe(TokenType.TIMESTAMP);
      expect(tokens[6]!.type).toBe(TokenType.JSON);
      expect(tokens[7]!.type).toBe(TokenType.UUID);
    });

    it('should recognize constraint keywords', () => {
      const tokenizer = new Tokenizer('unique required indexed');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.UNIQUE);
      expect(tokens[1]!.type).toBe(TokenType.REQUIRED);
      expect(tokens[2]!.type).toBe(TokenType.INDEXED);
    });

    it('should recognize time unit keywords', () => {
      const tokenizer = new Tokenizer(
        'minute minutes hour hours day days week weeks month months year years ago now'
      );
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.MINUTE);
      expect(tokens[1]!.type).toBe(TokenType.MINUTES);
      expect(tokens[2]!.type).toBe(TokenType.HOUR);
      expect(tokens[3]!.type).toBe(TokenType.HOURS);
      expect(tokens[4]!.type).toBe(TokenType.DAY);
      expect(tokens[5]!.type).toBe(TokenType.DAYS);
      expect(tokens[6]!.type).toBe(TokenType.WEEK);
      expect(tokens[7]!.type).toBe(TokenType.WEEKS);
      expect(tokens[8]!.type).toBe(TokenType.MONTH);
      expect(tokens[9]!.type).toBe(TokenType.MONTHS);
      expect(tokens[10]!.type).toBe(TokenType.YEAR);
      expect(tokens[11]!.type).toBe(TokenType.YEARS);
      expect(tokens[12]!.type).toBe(TokenType.AGO);
      expect(tokens[13]!.type).toBe(TokenType.NOW);
    });

    it('should recognize boolean values', () => {
      const tokenizer = new Tokenizer('true false TRUE FALSE');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.TRUE);
      expect(tokens[1]!.type).toBe(TokenType.FALSE);
      expect(tokens[2]!.type).toBe(TokenType.TRUE);
      expect(tokens[3]!.type).toBe(TokenType.FALSE);
    });
  });

  describe('Symbol recognition', () => {
    it('should tokenize colons', () => {
      const tokenizer = new Tokenizer(':');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.COLON);
    });

    it('should tokenize commas', () => {
      const tokenizer = new Tokenizer(',');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.COMMA);
    });

    it('should tokenize dots', () => {
      const tokenizer = new Tokenizer('.');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.DOT);
    });

    it('should tokenize dashes', () => {
      const tokenizer = new Tokenizer('- -');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.DASH);
      expect(tokens[1]!.type).toBe(TokenType.DASH);
    });

    it('should tokenize brackets', () => {
      const tokenizer = new Tokenizer('[ ] ( )');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.LBRACKET);
      expect(tokens[1]!.type).toBe(TokenType.RBRACKET);
      expect(tokens[2]!.type).toBe(TokenType.LPAREN);
      expect(tokens[3]!.type).toBe(TokenType.RPAREN);
    });

    it('should tokenize pipes', () => {
      const tokenizer = new Tokenizer('|');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.PIPE);
    });
  });

  describe('Newline handling', () => {
    it('should tokenize newlines', () => {
      const tokenizer = new Tokenizer('user\npost');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(4); // identifier, newline, identifier, EOF
      expect(tokens[0]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1]!.type).toBe(TokenType.NEWLINE);
      expect(tokens[2]!.type).toBe(TokenType.IDENTIFIER);
    });

    it('should track line numbers correctly', () => {
      const tokenizer = new Tokenizer('user\npost\ncomment');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.start.line).toBe(1);
      expect(tokens[1]!.start.line).toBe(1); // newline is on line 1
      expect(tokens[2]!.start.line).toBe(2);
      expect(tokens[3]!.start.line).toBe(2); // newline is on line 2
      expect(tokens[4]!.start.line).toBe(3);
    });
  });

  describe('Comment handling', () => {
    it('should tokenize comments', () => {
      const tokenizer = new Tokenizer('# This is a comment');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.COMMENT);
      expect(tokens[0]!.value).toContain('This is a comment');
    });

    it('should handle comments at end of line', () => {
      const tokenizer = new Tokenizer('user # inline comment');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1]!.type).toBe(TokenType.COMMENT);
    });

    it('should handle multiple comments', () => {
      const tokenizer = new Tokenizer('# comment 1\n# comment 2');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.COMMENT);
      expect(tokens[1]!.type).toBe(TokenType.NEWLINE);
      expect(tokens[2]!.type).toBe(TokenType.COMMENT);
    });
  });

  describe('Whitespace handling', () => {
    it('should skip spaces and tabs', () => {
      const tokenizer = new Tokenizer('user    \t  post');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3); // 2 identifiers + EOF
      expect(tokens[0]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1]!.type).toBe(TokenType.IDENTIFIER);
    });

    it('should preserve newlines', () => {
      const tokenizer = new Tokenizer('user  \n  post');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(4); // identifier, newline, identifier, EOF
      expect(tokens[1]!.type).toBe(TokenType.NEWLINE);
    });
  });

  describe('Position tracking', () => {
    it('should track positions correctly', () => {
      const tokenizer = new Tokenizer('user post');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.start.line).toBe(1);
      expect(tokens[0]!.start.column).toBe(1);
      expect(tokens[0]!.start.offset).toBe(0);

      expect(tokens[1]!.start.line).toBe(1);
      expect(tokens[1]!.start.column).toBe(6);
      expect(tokens[1]!.start.offset).toBe(5);
    });

    it('should track positions across lines', () => {
      const tokenizer = new Tokenizer('user\npost');
      const tokens = tokenizer.tokenize();

      expect(tokens[2]!.start.line).toBe(2);
      expect(tokens[2]!.start.column).toBe(1);
    });
  });

  describe('Real-world DSL examples', () => {
    it('should tokenize DDL model definition', () => {
      const input = `User[s]:
- has email as unique text and required`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      // User, [, s, ], :, newline, -, has, email, as, unique, text, and, required, EOF
      expect(tokens.length).toBeGreaterThan(10);
      expect(tokens[0]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0]!.value).toBe('User');
      expect(tokens[1]!.type).toBe(TokenType.LBRACKET);
      expect(tokens[6]!.type).toBe(TokenType.DASH);
      expect(tokens[7]!.type).toBe(TokenType.HAS);
    });

    it('should tokenize DML query definition', () => {
      const input = 'Query for Post:\n- recent posts where created at is after 7 days ago';
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.QUERY);
      expect(tokens[1]!.type).toBe(TokenType.FOR);
      expect(tokens[2]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2]!.value).toBe('Post');

      // "created" and "at" will be separate tokens (parser will merge them)
      // Note: "at" is a keyword (TokenType.AT), not an identifier
      const createdToken = tokens.find(
        (t) => t.type === TokenType.IDENTIFIER && t.value === 'created'
      );
      expect(createdToken).toBeDefined();
      expect(createdToken?.value).toBe('created');

      const atTokenIndex =
        tokens.findIndex((t) => t.type === TokenType.IDENTIFIER && t.value === 'created') + 1;
      expect(tokens[atTokenIndex]!.type).toBe(TokenType.AT);
    });

    it('should tokenize API query parameters (v0.1.0 syntax)', () => {
      const input = '- published as boolean\n- created at as date range';
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      // First line: -, published, as, boolean
      expect(tokens[0]!.type).toBe(TokenType.DASH);
      expect(tokens[1]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1]!.value).toBe('published');
      expect(tokens[2]!.type).toBe(TokenType.AS);
      expect(tokens[3]!.type).toBe(TokenType.BOOLEAN_TYPE);
    });

    it('should tokenize relationship definitions', () => {
      const input = '- belongs to User\n- has many Post';
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.DASH);
      expect(tokens[1]!.type).toBe(TokenType.BELONGS);
      expect(tokens[2]!.type).toBe(TokenType.TO);
      expect(tokens[3]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[3]!.value).toBe('User');
    });

    it('should tokenize time expressions', () => {
      const input = '5 minutes ago';
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.NUMBER);
      expect(tokens[0]!.value).toBe('5');
      expect(tokens[1]!.type).toBe(TokenType.MINUTES);
      expect(tokens[2]!.type).toBe(TokenType.AGO);
    });
  });

  describe('Error handling', () => {
    it('should throw error on unterminated string', () => {
      const tokenizer = new Tokenizer('"unterminated');

      try {
        tokenizer.tokenize();
        expect.fail('Should have thrown TokenizerError');
      } catch (error) {
        expect(error).toBeInstanceOf(TokenizerError);
        expect((error as Error).message).toMatch(/Unterminated string/);
      }
    });

    it('should throw error on unexpected character', () => {
      const tokenizer = new Tokenizer('user @ post');

      expect(() => tokenizer.tokenize()).toThrow(TokenizerError);
      expect(() => tokenizer.tokenize()).toThrow(/Unexpected character/);
    });

    it('should include position in error', () => {
      const tokenizer = new Tokenizer('user @');

      try {
        tokenizer.tokenize();
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(TokenizerError);
        expect((error as TokenizerError).position).toBeDefined();
        expect((error as TokenizerError).position.column).toBe(6);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty input', () => {
      const tokenizer = new Tokenizer('');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1); // Only EOF
      expect(tokens[0]!.type).toBe(TokenType.EOF);
    });

    it('should handle only whitespace', () => {
      const tokenizer = new Tokenizer('   \t  ');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1); // Only EOF
      expect(tokens[0]!.type).toBe(TokenType.EOF);
    });

    it('should handle only newlines', () => {
      const tokenizer = new Tokenizer('\n\n\n');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(4); // 3 newlines + EOF
      expect(tokens[0]!.type).toBe(TokenType.NEWLINE);
      expect(tokens[1]!.type).toBe(TokenType.NEWLINE);
      expect(tokens[2]!.type).toBe(TokenType.NEWLINE);
    });

    it('should handle identifiers with underscores', () => {
      // Grammar specifies identifiers must start with letter
      // Let's test valid underscores only
      const tokenizer = new Tokenizer('user_id post_count');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.value).toBe('user_id');
      expect(tokens[1]!.value).toBe('post_count');
    });

    it('should handle consecutive symbols', () => {
      const tokenizer = new Tokenizer('[]():|,.-');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.LBRACKET);
      expect(tokens[1]!.type).toBe(TokenType.RBRACKET);
      expect(tokens[2]!.type).toBe(TokenType.LPAREN);
      expect(tokens[3]!.type).toBe(TokenType.RPAREN);
      expect(tokens[4]!.type).toBe(TokenType.COLON);
      expect(tokens[5]!.type).toBe(TokenType.PIPE);
      expect(tokens[6]!.type).toBe(TokenType.COMMA);
      expect(tokens[7]!.type).toBe(TokenType.DOT);
      expect(tokens[8]!.type).toBe(TokenType.DASH);
    });
  });

  describe('Number edge cases', () => {
    it('should handle leading zeros', () => {
      const tokenizer = new Tokenizer('007 0.0 00.5');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.NUMBER);
      expect(tokens[0]!.value).toBe('007');
      expect(tokens[1]!.type).toBe(TokenType.NUMBER);
      expect(tokens[1]!.value).toBe('0.0');
      expect(tokens[2]!.type).toBe(TokenType.NUMBER);
      expect(tokens[2]!.value).toBe('00.5');
    });

    it('should handle very large numbers', () => {
      const tokenizer = new Tokenizer('999999999999 123456789.987654321');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.NUMBER);
      expect(tokens[0]!.value).toBe('999999999999');
      expect(tokens[1]!.type).toBe(TokenType.NUMBER);
      expect(tokens[1]!.value).toBe('123456789.987654321');
    });

    it('should handle decimal-only numbers', () => {
      const tokenizer = new Tokenizer('0.5 0.123 0.0');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.value).toBe('0.5');
      expect(tokens[1]!.value).toBe('0.123');
      expect(tokens[2]!.value).toBe('0.0');
    });

    it('should tokenize trailing dot as separate symbol', () => {
      const tokenizer = new Tokenizer('123.');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.NUMBER);
      expect(tokens[0]!.value).toBe('123');
      expect(tokens[1]!.type).toBe(TokenType.DOT);
    });

    it('should tokenize multiple dots separately', () => {
      const tokenizer = new Tokenizer('1.2.3');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.NUMBER);
      expect(tokens[0]!.value).toBe('1.2');
      expect(tokens[1]!.type).toBe(TokenType.DOT);
      expect(tokens[2]!.type).toBe(TokenType.NUMBER);
      expect(tokens[2]!.value).toBe('3');
    });
  });

  describe('String edge cases', () => {
    it('should handle unicode and emoji in strings', () => {
      const tokenizer = new Tokenizer('"hello 👋" "日本語" "café"');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.STRING);
      expect(tokens[0]!.value).toBe('hello 👋');
      expect(tokens[1]!.type).toBe(TokenType.STRING);
      expect(tokens[1]!.value).toBe('日本語');
      expect(tokens[2]!.type).toBe(TokenType.STRING);
      expect(tokens[2]!.value).toBe('café');
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      const tokenizer = new Tokenizer(`"${longString}"`);
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.STRING);
      expect(tokens[0]!.value).toHaveLength(1000);
    });

    it('should handle all escape sequences', () => {
      const tokenizer = new Tokenizer('"newline\\ntab\\tcarriage\\r\\\\backslash\\"quote"');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.value).toBe('newline\ntab\tcarriage\r\\backslash"quote');
    });

    it('should handle escaped quotes correctly', () => {
      const tokenizer = new Tokenizer('"He said \\"hello\\""');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.value).toBe('He said "hello"');
    });

    it('should handle empty strings', () => {
      const tokenizer = new Tokenizer('"" \'\'');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.STRING);
      expect(tokens[0]!.value).toBe('');
      expect(tokens[1]!.type).toBe(TokenType.STRING);
      expect(tokens[1]!.value).toBe('');
    });

    it('should handle strings with only whitespace', () => {
      const tokenizer = new Tokenizer('"   " "\\t\\n"');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.value).toBe('   ');
      expect(tokens[1]!.value).toBe('\t\n');
    });

    it('should error on unterminated string with EOF', () => {
      const tokenizer = new Tokenizer('"no closing quote');

      try {
        tokenizer.tokenize();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TokenizerError);
        expect((error as Error).message).toMatch(/Unterminated string/);
      }
    });
  });

  describe('Identifier edge cases', () => {
    it('should handle all-uppercase identifiers', () => {
      const tokenizer = new Tokenizer('USER EMAIL_ADDRESS');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0]!.value).toBe('USER');
      expect(tokens[1]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1]!.value).toBe('EMAIL_ADDRESS');
    });

    it('should handle mixed-case identifiers', () => {
      const tokenizer = new Tokenizer('userId UserName user_Email');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.value).toBe('userId');
      expect(tokens[1]!.value).toBe('UserName');
      expect(tokens[2]!.value).toBe('user_Email');
    });

    it('should handle consecutive underscores', () => {
      const tokenizer = new Tokenizer('user__id post___count');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.value).toBe('user__id');
      expect(tokens[1]!.value).toBe('post___count');
    });

    it('should handle consecutive hyphens converted to underscores', () => {
      const tokenizer = new Tokenizer('user--id post---count');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.value).toBe('user__id');
      expect(tokens[1]!.value).toBe('post___count');
    });

    it('should handle identifiers with trailing underscore', () => {
      const tokenizer = new Tokenizer('user_ post_count_');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.value).toBe('user_');
      expect(tokens[1]!.value).toBe('post_count_');
    });

    it('should handle identifiers with numbers', () => {
      const tokenizer = new Tokenizer('user1 post2id field3_name');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.value).toBe('user1');
      expect(tokens[1]!.value).toBe('post2id');
      expect(tokens[2]!.value).toBe('field3_name');
    });

    it('should handle identifiers at various lengths near limit', () => {
      const id61 = 'a'.repeat(61);
      const id62 = 'a'.repeat(62);
      const id63 = 'a'.repeat(63);

      const tokenizer = new Tokenizer(`${id61} ${id62} ${id63}`);
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.value).toHaveLength(61);
      expect(tokens[1]!.value).toHaveLength(62);
      expect(tokens[2]!.value).toHaveLength(63);
    });
  });

  describe('Comment edge cases', () => {
    it('should handle comment at end of file without newline', () => {
      const tokenizer = new Tokenizer('user # comment at EOF');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1]!.type).toBe(TokenType.COMMENT);
      expect(tokens[2]!.type).toBe(TokenType.EOF);
    });

    it('should handle multiple hash symbols in comment', () => {
      const tokenizer = new Tokenizer('# ## ### comment with hashes');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.COMMENT);
      expect(tokens[0]!.value).toContain('## ###');
    });

    it('should handle comments with special characters', () => {
      const tokenizer = new Tokenizer('# @#$%^&*() special chars');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.COMMENT);
      expect(tokens[0]!.value).toContain('@#$%^&*()');
    });

    it('should handle comment with unicode', () => {
      const tokenizer = new Tokenizer('# 日本語 comment 👋');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.COMMENT);
      expect(tokens[0]!.value).toContain('日本語');
      expect(tokens[0]!.value).toContain('👋');
    });

    it('should handle empty comment', () => {
      const tokenizer = new Tokenizer('#\nuser');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.COMMENT);
      expect(tokens[0]!.value).toBe('#');
      expect(tokens[1]!.type).toBe(TokenType.NEWLINE);
      expect(tokens[2]!.type).toBe(TokenType.IDENTIFIER);
    });
  });

  describe('Multi-word keyword edge cases', () => {
    it('should handle partial multi-word keywords', () => {
      const tokenizer = new Tokenizer('belongs User');
      const tokens = tokenizer.tokenize();

      // "belongs" alone is a keyword, "User" is identifier
      expect(tokens[0]!.type).toBe(TokenType.BELONGS);
      expect(tokens[1]!.type).toBe(TokenType.IDENTIFIER);
    });

    it('should correctly match "has many" as multi-word keyword', () => {
      const tokenizer = new Tokenizer('has many Post');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.HAS);
      expect(tokens[1]!.type).toBe(TokenType.MANY);
      expect(tokens[2]!.type).toBe(TokenType.IDENTIFIER);
    });

    it('should correctly match "belongs to" as multi-word keyword', () => {
      const tokenizer = new Tokenizer('belongs to User');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.BELONGS);
      expect(tokens[1]!.type).toBe(TokenType.TO);
      expect(tokens[2]!.type).toBe(TokenType.IDENTIFIER);
    });

    it('should correctly match "long text" as multi-word keyword', () => {
      const tokenizer = new Tokenizer('has content as long text');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.HAS);
      expect(tokens[1]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2]!.type).toBe(TokenType.AS);
      expect(tokens[3]!.type).toBe(TokenType.LONG);
      expect(tokens[4]!.type).toBe(TokenType.TEXT);
    });

    it('should handle "is not" multi-word keyword', () => {
      const tokenizer = new Tokenizer('value is not empty');
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1]!.type).toBe(TokenType.IS);
      expect(tokens[2]!.type).toBe(TokenType.NOT);
      expect(tokens[3]!.type).toBe(TokenType.EMPTY);
    });
  });

  describe('Complex scenarios', () => {
    it('should tokenize complete DDL model definition', () => {
      const input = `User[s]:
- has email as unique text and required
- has username as unique text and required
- has created_at as timestamp
- has many Post

Post[s]:
- has title as text and required
- has content as long text
- belongs to User`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      // Verify key tokens are present
      const types = tokens.map((t) => t.type);
      expect(types).toContain(TokenType.IDENTIFIER); // User, Post
      expect(types).toContain(TokenType.LBRACKET);
      expect(types).toContain(TokenType.HAS);
      expect(types).toContain(TokenType.AS);
      expect(types).toContain(TokenType.UNIQUE);
      expect(types).toContain(TokenType.TEXT);
      expect(types).toContain(TokenType.REQUIRED);
      expect(types).toContain(TokenType.MANY);
      expect(types).toContain(TokenType.BELONGS);
      expect(types).toContain(TokenType.TO);
      expect(types).toContain(TokenType.EOF);
    });

    it('should tokenize all token types in one line', () => {
      const input = 'User[s]: - has email as "text" 123 # comment';
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens[0]!.type).toBe(TokenType.IDENTIFIER); // User
      expect(tokens[1]!.type).toBe(TokenType.LBRACKET);
      expect(tokens[2]!.type).toBe(TokenType.IDENTIFIER); // s
      expect(tokens[3]!.type).toBe(TokenType.RBRACKET);
      expect(tokens[4]!.type).toBe(TokenType.COLON);
      expect(tokens[5]!.type).toBe(TokenType.DASH);
      expect(tokens[6]!.type).toBe(TokenType.HAS);
      expect(tokens[7]!.type).toBe(TokenType.IDENTIFIER); // email
      expect(tokens[8]!.type).toBe(TokenType.AS);
      expect(tokens[9]!.type).toBe(TokenType.STRING);
      expect(tokens[10]!.type).toBe(TokenType.NUMBER);
      expect(tokens[11]!.type).toBe(TokenType.COMMENT);
    });

    it('should handle mixed newlines (LF, CRLF)', () => {
      const input = 'user\npost\r\ncomment';
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const newlines = tokens.filter((t) => t.type === TokenType.NEWLINE);
      expect(newlines).toHaveLength(2);
    });

    it('should tokenize DML query with time expression', () => {
      const input = 'Query for Post:\n- recent where created at is after 7 days ago';
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const types = tokens.map((t) => t.type);
      expect(types).toContain(TokenType.QUERY);
      expect(types).toContain(TokenType.FOR);
      expect(types).toContain(TokenType.WHERE);
      expect(types).toContain(TokenType.IS);
      expect(types).toContain(TokenType.AFTER);
      expect(types).toContain(TokenType.NUMBER);
      expect(types).toContain(TokenType.DAYS);
      expect(types).toContain(TokenType.AGO);
    });

    it('should tokenize auth rules', () => {
      const input = 'Rules for Post:\n- authenticated users can create any Post';
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const types = tokens.map((t) => t.type);
      expect(types).toContain(TokenType.RULES);
      expect(types).toContain(TokenType.FOR);
      expect(types).toContain(TokenType.AUTHENTICATED);
      expect(types).toContain(TokenType.USERS);
      expect(types).toContain(TokenType.CAN);
      expect(types).toContain(TokenType.CREATE);
      expect(types).toContain(TokenType.ANY);
    });

    it('should handle stress test with many tokens', () => {
      const parts: string[] = [];
      for (let i = 0; i < 100; i++) {
        parts.push(`field${i}`);
      }
      const input = parts.join(' ');
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(101); // 100 identifiers + EOF
      expect(tokens.every((t, i) => i === 100 || t.type === TokenType.IDENTIFIER)).toBe(true);
    });
  });
});
