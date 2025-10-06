/**
 * SECURITY Parser for DeclareLang
 * Implements recursive descent parsing based on DSL Grammar Specification v0.1.0
 *
 * Grammar:
 * security_file ::= constraints_section? enforce_section? password_rules_section? data_protection_section? api_security_section?
 * constraints_section ::= "Constraints:" newline constraint_rule+
 * enforce_section ::= "Enforce:" newline enforce_rule+
 * password_rules_section ::= "Password Rules:" newline password_rule+
 * data_protection_section ::= "Data Protection:" newline protection_rule+
 * api_security_section ::= "API Security:" newline api_security_rule+
 */

import { Token, TokenType, Position } from '../types/token.js';
import {
  SECURITYFile,
  ConstraintRule,
  EnforceRule,
  PasswordRule,
  DataProtectionRule,
  APISecurityRule,
} from '../types/ast.js';
import { ParseError } from './ddl-parser.js';

/**
 * SECURITY Parser
 */
export class SECURITYParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    // Filter out comments for parsing
    this.tokens = tokens.filter((t) => t.type !== TokenType.COMMENT);
  }

  /**
   * Parse SECURITY file
   */
  parse(): SECURITYFile {
    // Handle empty file
    if (this.isAtEnd() || this.tokens.length === 0) {
      const emptyPos: Position = { line: 1, column: 1, offset: 0 };
      return {
        constraints: [],
        enforce: [],
        passwordRules: [],
        dataProtection: [],
        apiSecurity: [],
        start: emptyPos,
        end: emptyPos,
      };
    }

    const start = this.currentToken().start;
    this.skipNewlines();

    const constraints: ConstraintRule[] = [];
    const enforce: EnforceRule[] = [];
    const passwordRules: PasswordRule[] = [];
    const dataProtection: DataProtectionRule[] = [];
    const apiSecurity: APISecurityRule[] = [];

    while (!this.isAtEnd()) {
      const token = this.currentToken();

      if (token.type === TokenType.CONSTRAINTS) {
        constraints.push(...this.parseConstraintsSection());
      } else if (token.type === TokenType.ENFORCE) {
        enforce.push(...this.parseEnforceSection());
      } else if (token.type === TokenType.PASSWORD) {
        passwordRules.push(...this.parsePasswordRulesSection());
      } else if (
        token.type === TokenType.DATA ||
        (token.type === TokenType.IDENTIFIER && token.value.toLowerCase() === 'data')
      ) {
        dataProtection.push(...this.parseDataProtectionSection());
      } else if (token.type === TokenType.IDENTIFIER && token.value.toLowerCase() === 'api') {
        apiSecurity.push(...this.parseAPISecuritySection());
      } else {
        // Skip unknown section
        this.advance();
      }

      this.skipNewlines();
    }

    const end = this.current > 0 ? this.previousToken().end : start;

    return {
      constraints,
      enforce,
      passwordRules,
      dataProtection,
      apiSecurity,
      start,
      end,
    };
  }

  /**
   * Parse Constraints section
   */
  private parseConstraintsSection(): ConstraintRule[] {
    const start = this.currentToken().start;

    // Expect "Constraints:"
    if (this.currentToken().type !== TokenType.CONSTRAINTS) {
      throw new ParseError('Expected "Constraints"', this.currentToken().start);
    }
    this.advance();

    if (this.currentToken().type !== TokenType.COLON) {
      throw new ParseError('Expected ":" after "Constraints"', this.currentToken().start);
    }
    this.advance();

    this.expect(TokenType.NEWLINE, 'Expected newline after "Constraints:"');
    this.skipNewlines();

    const rules: ConstraintRule[] = [];

    while (!this.isAtEnd() && this.currentToken().type === TokenType.DASH) {
      rules.push(this.parseConstraintRule());
      this.skipNewlines();
    }

    if (rules.length === 0) {
      throw new ParseError('Expected at least one constraint rule', start);
    }

    return rules;
  }

  /**
   * Parse a single constraint rule
   */
  private parseConstraintRule(): ConstraintRule {
    const start = this.currentToken().start;

    // Expect "-"
    this.expect(TokenType.DASH, 'Expected "-"');

    // Read the full constraint statement until newline
    const description = this.readUntilNewline();

    const end = this.previousToken().end;

    return {
      description,
      start,
      end,
    };
  }

  /**
   * Parse Enforce section
   */
  private parseEnforceSection(): EnforceRule[] {
    const start = this.currentToken().start;

    // Expect "Enforce:"
    if (this.currentToken().type !== TokenType.ENFORCE) {
      throw new ParseError('Expected "Enforce"', this.currentToken().start);
    }
    this.advance();

    if (this.currentToken().type !== TokenType.COLON) {
      throw new ParseError('Expected ":" after "Enforce"', this.currentToken().start);
    }
    this.advance();

    this.expect(TokenType.NEWLINE, 'Expected newline after "Enforce:"');
    this.skipNewlines();

    const rules: EnforceRule[] = [];

    while (!this.isAtEnd() && this.currentToken().type === TokenType.DASH) {
      rules.push(this.parseEnforceRule());
      this.skipNewlines();
    }

    if (rules.length === 0) {
      throw new ParseError('Expected at least one enforce rule', start);
    }

    return rules;
  }

  /**
   * Parse a single enforce rule
   */
  private parseEnforceRule(): EnforceRule {
    const start = this.currentToken().start;

    // Expect "-"
    this.expect(TokenType.DASH, 'Expected "-"');

    // Read the full enforcement statement until newline
    const description = this.readUntilNewline();

    const end = this.previousToken().end;

    return {
      description,
      start,
      end,
    };
  }

  /**
   * Parse Password Rules section
   */
  private parsePasswordRulesSection(): PasswordRule[] {
    const start = this.currentToken().start;

    // Expect "Password"
    if (this.currentToken().type !== TokenType.PASSWORD) {
      throw new ParseError('Expected "Password"', this.currentToken().start);
    }
    this.advance();

    // Expect "Rules:"
    if (
      this.currentToken().type === TokenType.RULES ||
      (this.currentToken().type === TokenType.IDENTIFIER &&
        this.currentToken().value.toLowerCase() === 'rules')
    ) {
      this.advance();
    } else {
      throw new ParseError('Expected "Rules" after "Password"', this.currentToken().start);
    }

    if (this.currentToken().type !== TokenType.COLON) {
      throw new ParseError('Expected ":" after "Password Rules"', this.currentToken().start);
    }
    this.advance();

    this.expect(TokenType.NEWLINE, 'Expected newline after "Password Rules:"');
    this.skipNewlines();

    const rules: PasswordRule[] = [];

    while (!this.isAtEnd() && this.currentToken().type === TokenType.DASH) {
      rules.push(this.parsePasswordRule());
      this.skipNewlines();
    }

    if (rules.length === 0) {
      throw new ParseError('Expected at least one password rule', start);
    }

    return rules;
  }

  /**
   * Parse a single password rule
   */
  private parsePasswordRule(): PasswordRule {
    const start = this.currentToken().start;

    // Expect "-"
    this.expect(TokenType.DASH, 'Expected "-"');

    // Read the full password rule statement until newline
    const description = this.readUntilNewline();

    // Extract field (usually "password" or "password reset tokens")
    const field = description.split(' must')[0] || 'password';
    const requirement = description.split(' must ').slice(1).join(' must ') || description;

    const end = this.previousToken().end;

    return {
      description,
      field,
      requirement,
      start,
      end,
    };
  }

  /**
   * Parse Data Protection section
   */
  private parseDataProtectionSection(): DataProtectionRule[] {
    const start = this.currentToken().start;

    // Expect "Data"
    if (this.currentToken().type === TokenType.DATA) {
      this.advance();
    } else if (
      this.currentToken().type === TokenType.IDENTIFIER &&
      this.currentToken().value.toLowerCase() === 'data'
    ) {
      this.advance();
    } else {
      throw new ParseError('Expected "Data"', this.currentToken().start);
    }

    // Expect "Protection:"
    if (
      this.currentToken().type === TokenType.PROTECTION ||
      (this.currentToken().type === TokenType.IDENTIFIER &&
        this.currentToken().value.toLowerCase() === 'protection')
    ) {
      this.advance();
    } else {
      throw new ParseError('Expected "Protection" after "Data"', this.currentToken().start);
    }

    if (this.currentToken().type !== TokenType.COLON) {
      throw new ParseError('Expected ":" after "Data Protection"', this.currentToken().start);
    }
    this.advance();

    this.expect(TokenType.NEWLINE, 'Expected newline after "Data Protection:"');
    this.skipNewlines();

    const rules: DataProtectionRule[] = [];

    while (!this.isAtEnd() && this.currentToken().type === TokenType.DASH) {
      rules.push(this.parseDataProtectionRule());
      this.skipNewlines();
    }

    if (rules.length === 0) {
      throw new ParseError('Expected at least one data protection rule', start);
    }

    return rules;
  }

  /**
   * Parse a single data protection rule
   */
  private parseDataProtectionRule(): DataProtectionRule {
    const start = this.currentToken().start;

    // Expect "-"
    this.expect(TokenType.DASH, 'Expected "-"');

    // Read the full protection statement until newline
    const description = this.readUntilNewline();

    // Extract subject (e.g., "user email", "user data")
    const subject = description.split(' must')[0] || description;
    const requirement = description.split(' must ').slice(1).join(' must ') || description;

    const end = this.previousToken().end;

    return {
      description,
      subject,
      requirement,
      start,
      end,
    };
  }

  /**
   * Parse API Security section
   */
  private parseAPISecuritySection(): APISecurityRule[] {
    const start = this.currentToken().start;

    // Expect "API"
    if (
      !(
        this.currentToken().type === TokenType.IDENTIFIER &&
        this.currentToken().value.toLowerCase() === 'api'
      )
    ) {
      throw new ParseError('Expected "API"', this.currentToken().start);
    }
    this.advance();

    // Expect "Security:"
    if (
      this.currentToken().type === TokenType.SECURITY ||
      (this.currentToken().type === TokenType.IDENTIFIER &&
        this.currentToken().value.toLowerCase() === 'security')
    ) {
      this.advance();
    } else {
      throw new ParseError('Expected "Security" after "API"', this.currentToken().start);
    }

    if (this.currentToken().type !== TokenType.COLON) {
      throw new ParseError('Expected ":" after "API Security"', this.currentToken().start);
    }
    this.advance();

    this.expect(TokenType.NEWLINE, 'Expected newline after "API Security:"');
    this.skipNewlines();

    const rules: APISecurityRule[] = [];

    while (!this.isAtEnd() && this.currentToken().type === TokenType.DASH) {
      rules.push(this.parseAPISecurityRule());
      this.skipNewlines();
    }

    if (rules.length === 0) {
      throw new ParseError('Expected at least one API security rule', start);
    }

    return rules;
  }

  /**
   * Parse a single API security rule
   */
  private parseAPISecurityRule(): APISecurityRule {
    const start = this.currentToken().start;

    // Expect "-"
    this.expect(TokenType.DASH, 'Expected "-"');

    // Read the full API security statement until newline
    const description = this.readUntilNewline();

    // Extract scope (e.g., "all endpoints", "all responses")
    const scope = description.split(' must')[0] || description;
    const requirement = description.split(' must ').slice(1).join(' must ') || description;

    const end = this.previousToken().end;

    return {
      description,
      scope,
      requirement,
      start,
      end,
    };
  }

  /**
   * Read all tokens until newline and return as string
   */
  private readUntilNewline(): string {
    const parts: string[] = [];

    while (
      !this.isAtEnd() &&
      this.currentToken().type !== TokenType.NEWLINE &&
      this.currentToken().type !== TokenType.EOF
    ) {
      parts.push(this.currentToken().value);
      this.advance();
    }

    return parts.join(' ');
  }

  /**
   * Helper methods
   */

  private currentToken(): Token {
    const token = this.tokens[this.current] || this.tokens[this.tokens.length - 1];
    if (!token) {
      throw new ParseError('Unexpected end of input', { line: 1, column: 1, offset: 0 });
    }
    return token;
  }

  private previousToken(): Token {
    const token = this.tokens[this.current - 1];
    if (!token) {
      throw new ParseError('No previous token', { line: 1, column: 1, offset: 0 });
    }
    return token;
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.currentToken().type === TokenType.EOF;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previousToken();
  }

  private expect(type: TokenType, message: string): Token {
    if (this.currentToken().type !== type) {
      throw new ParseError(message, this.currentToken().start);
    }
    return this.advance();
  }

  private skipNewlines(): void {
    while (!this.isAtEnd() && this.currentToken().type === TokenType.NEWLINE) {
      this.advance();
    }
  }
}
