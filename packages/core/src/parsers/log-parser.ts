/**
 * Parser for LOG.DSL
 * Implements recursive descent parsing based on DSL Grammar Specification v0.1.0
 *
 * Grammar:
 * log_file ::= log_def+ audit_def+ level_def+ exclude_def?
 *
 * log_def ::= "Log for" scope ":" newline log_item+
 * scope ::= "all mutations" | model_name
 * log_item ::= "-" field newline
 *            | "-" action "with" detail newline
 * detail ::= "full data" | "changed fields only" | field "only"
 *          | field "and" field
 *
 * audit_def ::= "Audit for" model_name ":" newline audit_item+
 * audit_item ::= "-" "who" action newline
 *              | "-" "when" event newline
 *              | "-" identifier newline
 *
 * level_def ::= "Log level" level "for:" newline level_condition+
 * level ::= "debug" | "info" | "warning" | "error"
 * level_condition ::= "-" description newline
 *
 * exclude_def ::= "Exclude from logs:" newline exclude_item+
 * exclude_item ::= "-" identifier newline
 */

import { Token, TokenType } from '../types/token.js';
import {
  LOGFile,
  LogDefinition,
  LogScope,
  LogItem,
  LogDetail,
  AuditDefinition,
  AuditItem,
  LogLevelDefinition,
  LogLevel,
  LogLevelCondition,
  ExcludeDefinition,
  ModelName,
  ThresholdUnit,
} from '../types/ast.js';
import { ParseError } from './ddl-parser.js';
import { parseModelName } from '../utils/identifier.js';

export class LOGParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    // Filter out comments but keep newlines
    this.tokens = tokens.filter((t) => t.type !== TokenType.COMMENT);
  }

  /**
   * Main parse method
   */
  parse(): LOGFile {
    const start = this.currentToken().start;
    const logs: LogDefinition[] = [];
    const audits: AuditDefinition[] = [];
    const levels: LogLevelDefinition[] = [];
    let exclude: ExcludeDefinition | undefined;

    // Skip leading newlines
    this.skipNewlines();

    // Handle empty files
    if (this.isAtEnd()) {
      return {
        logs: [],
        audits: [],
        levels: [],
        start,
        end: this.currentToken().end,
      };
    }

    // Parse sections in any order
    while (!this.isAtEnd()) {
      this.skipNewlines();
      if (this.isAtEnd()) break;

      const token = this.currentToken();

      if (token.type === TokenType.LOG) {
        // Check if this is "Log for" or "Log level"
        const nextToken = this.tokens[this.current + 1];
        if (nextToken && nextToken.type === TokenType.LEVEL) {
          levels.push(this.parseLogLevelSection());
        } else {
          logs.push(this.parseLogSection());
        }
      } else if (token.type === TokenType.AUDIT) {
        audits.push(this.parseAuditSection());
      } else if (token.type === TokenType.EXCLUDE) {
        if (exclude) {
          throw new ParseError('Duplicate Exclude section', token.start);
        }
        exclude = this.parseExcludeSection();
      } else {
        throw new ParseError(
          `Unexpected token in LOG file: ${token.type} "${token.value}"`,
          token.start
        );
      }

      this.skipNewlines();
    }

    return {
      logs,
      audits,
      levels,
      exclude,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse "Log for X:" section
   */
  private parseLogSection(): LogDefinition {
    const start = this.currentToken().start;

    // Expect "Log"
    this.expect(TokenType.LOG, 'Expected "Log"');

    // Expect "for"
    this.expect(TokenType.FOR, 'Expected "for" after "Log"');

    // Parse scope
    const scope = this.parseLogScope();

    // Expect colon
    this.expect(TokenType.COLON, 'Expected ":" after log scope');

    // Expect newline
    this.expect(TokenType.NEWLINE, 'Expected newline after ":"');

    // Parse log items
    const items: LogItem[] = [];
    while (!this.isAtEnd() && this.currentToken().type === TokenType.DASH) {
      items.push(this.parseLogItem());
    }

    if (items.length === 0) {
      throw new ParseError('Expected at least one log item', this.currentToken().start);
    }

    return {
      scope,
      items,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse log scope: "all mutations" or model name
   */
  private parseLogScope(): LogScope {
    const start = this.currentToken().start;

    if (this.currentToken().type === TokenType.ALL) {
      this.advance(); // consume "all"
      this.expect(TokenType.MUTATIONS, 'Expected "mutations" after "all"');
      return {
        type: 'all_mutations',
        start,
        end: this.previousToken().end,
      };
    }

    // Parse model name
    const modelName = this.parseModelNameReference();
    return {
      type: 'model',
      modelName,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse log item
   */
  private parseLogItem(): LogItem {
    const start = this.currentToken().start;

    // Expect dash
    this.expect(TokenType.DASH, 'Expected "-"');

    // Lookahead to check for "with" keyword
    const hasWithKeyword = this.lookAheadForToken(TokenType.WITH, 10);

    if (hasWithKeyword) {
      // This is "action with detail"
      const action = this.parseAction();

      this.expect(TokenType.WITH, 'Expected "with" after action');

      const detail = this.parseLogDetail();

      this.expect(TokenType.NEWLINE, 'Expected newline after log item');

      return {
        type: 'action_with_detail',
        action,
        detail,
        start,
        end: this.previousToken().end,
      };
    } else {
      // This is a simple field
      const field = this.parseFieldReference();

      this.expect(TokenType.NEWLINE, 'Expected newline after log item');

      return {
        type: 'field',
        field,
        start,
        end: this.previousToken().end,
      };
    }
  }

  /**
   * Parse log detail specification
   */
  private parseLogDetail(): LogDetail {
    const start = this.currentToken().start;

    // Check for "full data"
    if (this.currentToken().type === TokenType.FULL) {
      this.advance();
      this.expect(TokenType.DATA, 'Expected "data" after "full"');
      return {
        type: 'full_data',
        start,
        end: this.previousToken().end,
      };
    }

    // Check for "changed fields only"
    if (this.currentToken().type === TokenType.CHANGED) {
      this.advance();
      this.expect(TokenType.FIELDS, 'Expected "fields" after "changed"');
      this.expect(TokenType.ONLY, 'Expected "only" after "fields"');
      return {
        type: 'changed_fields_only',
        start,
        end: this.previousToken().end,
      };
    }

    // Otherwise, parse specific fields
    const fields: string[] = [];
    fields.push(this.parseFieldReference());

    // Check for "only" keyword (single field)
    if (this.currentToken().type === TokenType.ONLY) {
      this.advance();
      return {
        type: 'specific_fields',
        fields,
        start,
        end: this.previousToken().end,
      };
    }

    // Check for "and" keyword (multiple fields)
    while (this.currentToken().type === TokenType.AND) {
      this.advance(); // consume "and"
      fields.push(this.parseFieldReference());
    }

    return {
      type: 'specific_fields',
      fields,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse "Audit for Model:" section
   */
  private parseAuditSection(): AuditDefinition {
    const start = this.currentToken().start;

    // Expect "Audit"
    this.expect(TokenType.AUDIT, 'Expected "Audit"');

    // Expect "for"
    this.expect(TokenType.FOR, 'Expected "for" after "Audit"');

    // Parse model name
    const modelName = this.parseModelNameReference();

    // Expect colon
    this.expect(TokenType.COLON, 'Expected ":" after model name');

    // Expect newline
    this.expect(TokenType.NEWLINE, 'Expected newline after ":"');

    // Parse audit items
    const items: AuditItem[] = [];
    while (!this.isAtEnd() && this.currentToken().type === TokenType.DASH) {
      items.push(this.parseAuditItem());
    }

    if (items.length === 0) {
      throw new ParseError('Expected at least one audit item', this.currentToken().start);
    }

    return {
      modelName,
      items,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse audit item
   */
  private parseAuditItem(): AuditItem {
    const start = this.currentToken().start;

    // Expect dash
    this.expect(TokenType.DASH, 'Expected "-"');

    const token = this.currentToken();

    // Check for "who" action
    if (token.type === TokenType.WHO) {
      this.advance();
      const action = this.parseAction();
      this.expect(TokenType.NEWLINE, 'Expected newline after audit item');

      return {
        type: 'who_action',
        action,
        start,
        end: this.previousToken().end,
      };
    }

    // Check for "when" event
    if (token.type === TokenType.WHEN) {
      this.advance();
      const event = this.parseAction();
      this.expect(TokenType.NEWLINE, 'Expected newline after audit item');

      return {
        type: 'when_event',
        event,
        start,
        end: this.previousToken().end,
      };
    }

    // Otherwise, it's a generic field
    const field = this.parseFieldReference();
    this.expect(TokenType.NEWLINE, 'Expected newline after audit item');

    return {
      type: 'generic',
      field,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse "Log level X for:" section
   */
  private parseLogLevelSection(): LogLevelDefinition {
    const start = this.currentToken().start;

    // Expect "Log"
    this.expect(TokenType.LOG, 'Expected "Log"');

    // Expect "level"
    this.expect(TokenType.LEVEL, 'Expected "level" after "Log"');

    // Parse log level
    const level = this.parseLogLevel();

    // Expect "for"
    this.expect(TokenType.FOR, 'Expected "for" after log level');

    // Expect colon
    this.expect(TokenType.COLON, 'Expected ":" after "for"');

    // Expect newline
    this.expect(TokenType.NEWLINE, 'Expected newline after ":"');

    // Parse conditions
    const conditions: LogLevelCondition[] = [];
    while (!this.isAtEnd() && this.currentToken().type === TokenType.DASH) {
      conditions.push(this.parseLogLevelCondition());
    }

    if (conditions.length === 0) {
      throw new ParseError('Expected at least one condition', this.currentToken().start);
    }

    return {
      level,
      conditions,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse log level (debug, info, warning, error)
   */
  private parseLogLevel(): LogLevel {
    const token = this.currentToken();

    switch (token.type) {
      case TokenType.DEBUG:
        this.advance();
        return LogLevel.DEBUG;
      case TokenType.INFO:
        this.advance();
        return LogLevel.INFO;
      case TokenType.WARNING:
        this.advance();
        return LogLevel.WARNING;
      case TokenType.ERROR:
        this.advance();
        return LogLevel.ERROR;
      default:
        throw new ParseError(
          `Expected log level (debug, info, warning, error), got "${token.value}"`,
          token.start
        );
    }
  }

  /**
   * Parse log level condition
   */
  private parseLogLevelCondition(): LogLevelCondition {
    const start = this.currentToken().start;

    // Expect dash
    this.expect(TokenType.DASH, 'Expected "-"');

    // Collect the description until newline
    const descParts: string[] = [];
    let metric: string | undefined;
    let threshold: number | undefined;
    let unit: ThresholdUnit | undefined;

    // Parse the condition, looking for patterns like "slow queries over 500 milliseconds"
    while (!this.isAtEnd() && this.currentToken().type !== TokenType.NEWLINE) {
      const token = this.currentToken();

      // Check for "over" keyword followed by number
      if (
        (token.type === TokenType.IDENTIFIER && token.value.toLowerCase() === 'over') ||
        (token.type === TokenType.IDENTIFIER && token.value.toLowerCase() === 'above')
      ) {
        // Save metric description so far
        metric = descParts.join(' ');
        descParts.push(token.value);
        this.advance();

        // Expect number
        if (this.currentToken().type === TokenType.NUMBER) {
          threshold = parseFloat(this.currentToken().value);
          descParts.push(this.currentToken().value);
          this.advance();

          // Parse unit
          if (!this.isAtEnd() && this.currentToken().type !== TokenType.NEWLINE) {
            const unitToken = this.currentToken();
            unit = this.mapThresholdUnit(unitToken.value);
            descParts.push(unitToken.value);
            this.advance();
          }
        }
      } else {
        descParts.push(token.value);
        this.advance();
      }
    }

    this.expect(TokenType.NEWLINE, 'Expected newline after condition');

    const description = descParts.join(' ');

    return {
      description,
      metric,
      threshold,
      unit,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Map threshold unit string to ThresholdUnit enum
   */
  private mapThresholdUnit(unit: string): ThresholdUnit {
    const lowerUnit = unit.toLowerCase();

    switch (lowerUnit) {
      case '%':
      case 'percent':
        return ThresholdUnit.PERCENT;
      case 'millisecond':
      case 'milliseconds':
        return ThresholdUnit.MILLISECONDS;
      case 'second':
      case 'seconds':
        return ThresholdUnit.SECONDS;
      default:
        return ThresholdUnit.CUSTOM;
    }
  }

  /**
   * Parse "Exclude from logs:" section
   */
  private parseExcludeSection(): ExcludeDefinition {
    const start = this.currentToken().start;

    // Expect "Exclude"
    this.expect(TokenType.EXCLUDE, 'Expected "Exclude"');

    // Expect "from"
    this.expect(TokenType.FROM, 'Expected "from" after "Exclude"');

    // Expect "logs"
    if (
      this.currentToken().type !== TokenType.IDENTIFIER ||
      this.currentToken().value.toLowerCase() !== 'logs'
    ) {
      throw new ParseError('Expected "logs" after "from"', this.currentToken().start);
    }
    this.advance();

    // Expect colon
    this.expect(TokenType.COLON, 'Expected ":" after "logs"');

    // Expect newline
    this.expect(TokenType.NEWLINE, 'Expected newline after ":"');

    // Parse exclude items
    const items: string[] = [];
    while (!this.isAtEnd() && this.currentToken().type === TokenType.DASH) {
      this.expect(TokenType.DASH, 'Expected "-"');
      items.push(this.parseFieldReference());
      this.expect(TokenType.NEWLINE, 'Expected newline after exclude item');
    }

    if (items.length === 0) {
      throw new ParseError('Expected at least one exclude item', this.currentToken().start);
    }

    return {
      items,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse an action (e.g., "create", "update", "login")
   * Actions can be multi-word like "password change" or "role change"
   */
  private parseAction(): string {
    const parts: string[] = [];

    // Collect identifier tokens until we hit a keyword or newline
    while (
      !this.isAtEnd() &&
      this.currentToken().type !== TokenType.NEWLINE &&
      this.currentToken().type !== TokenType.WITH &&
      this.currentToken().type !== TokenType.COLON
    ) {
      const token = this.currentToken();

      if (token.type === TokenType.IDENTIFIER) {
        parts.push(token.value);
        this.advance();
      } else {
        // Try to use keyword as part of action name
        parts.push(token.value.toLowerCase());
        this.advance();
      }
    }

    if (parts.length === 0) {
      throw new ParseError('Expected action name', this.currentToken().start);
    }

    return parts.join(' ');
  }

  /**
   * Parse a field reference (identifier with spaces/hyphens converted to underscores)
   */
  private parseFieldReference(): string {
    const parts: string[] = [];

    // Stop tokens that indicate end of field name
    const stopTokens = new Set([
      TokenType.NEWLINE,
      TokenType.AND,
      TokenType.ONLY,
      TokenType.WITH,
      TokenType.COLON,
      TokenType.COMMA,
      TokenType.DASH,
      TokenType.EOF,
    ]);

    // Collect tokens until we hit a stop token
    while (!this.isAtEnd() && !stopTokens.has(this.currentToken().type)) {
      const token = this.currentToken();
      parts.push(token.value);
      this.advance();
    }

    if (parts.length === 0) {
      throw new ParseError('Expected field name', this.currentToken().start);
    }

    return parts.join(' ');
  }

  /**
   * Parse model name reference
   */
  private parseModelNameReference(): ModelName {
    const start = this.currentToken().start;
    const token = this.currentToken();

    // Allow both IDENTIFIER and keyword tokens as model names
    // (e.g., "Users" is a USERS keyword, "Posts" is an identifier)
    if (
      token.type === TokenType.EOF ||
      token.type === TokenType.NEWLINE ||
      token.type === TokenType.COLON
    ) {
      throw new ParseError('Expected model name', token.start);
    }

    let fullModelName = token.value;
    this.advance();

    // Check for pluralization brackets (e.g., User[s], Categor[y|ies])
    if (!this.isAtEnd() && this.currentToken().type === TokenType.LBRACKET) {
      fullModelName += '[';
      this.advance(); // consume '['

      // Read until ']'
      while (!this.isAtEnd() && this.currentToken().type !== TokenType.RBRACKET) {
        fullModelName += this.currentToken().value;
        this.advance();
      }

      if (this.currentToken().type === TokenType.RBRACKET) {
        fullModelName += ']';
        this.advance(); // consume ']'
      }
    }

    const modelName = parseModelName(fullModelName);

    return {
      ...modelName,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Look ahead for a specific token type within a limited range
   */
  private lookAheadForToken(type: TokenType, maxDistance: number): boolean {
    for (let i = 0; i < maxDistance && this.current + i < this.tokens.length; i++) {
      const token = this.tokens[this.current + i];
      if (!token) continue;

      if (token.type === type) {
        return true;
      }
      // Stop at newline
      if (token.type === TokenType.NEWLINE) {
        return false;
      }
    }
    return false;
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
    if (!this.isAtEnd()) this.current++;
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
