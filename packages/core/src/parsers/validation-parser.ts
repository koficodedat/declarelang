/**
 * VALIDATION Parser for DeclareLang
 * Implements recursive descent parsing based on DSL Grammar Specification v0.1.0
 *
 * Grammar:
 * validation_file ::= validate_def+ cross_field_def? rate_limit_def? business_rule_def?
 * validate_def ::= "Validate" model_name ":" newline validation_item+
 * validation_item ::= "-" field "must" constraint_expr newline
 */

import { Token, TokenType, Position } from '../types/token.js';
import {
  VALIDATIONFile,
  ValidationDefinition,
  ValidationRule,
  CrossFieldRule,
  RateLimitRule,
  BusinessRule,
  ConstraintExpression,
  FormatType,
  RequirementType,
  Condition,
  ComparisonOperator,
} from '../types/ast.js';
import { normalizeIdentifier } from '../utils/identifier.js';

/**
 * Parser error with position information
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public position: Position
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * VALIDATION Parser
 */
export class VALIDATIONParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    // Filter out comments for parsing
    this.tokens = tokens.filter((t) => t.type !== TokenType.COMMENT);
  }

  /**
   * Parse VALIDATION file
   */
  parse(): VALIDATIONFile {
    // Handle empty file
    if (this.isAtEnd() || this.tokens.length === 0) {
      const emptyPos: Position = { line: 1, column: 1, offset: 0 };
      return {
        validations: [],
        crossFieldRules: [],
        rateLimitRules: [],
        businessRules: [],
        start: emptyPos,
        end: emptyPos,
      };
    }

    const start = this.currentToken().start;

    // Skip leading newlines
    this.skipNewlines();

    // Parse validation definitions
    const validations: ValidationDefinition[] = [];
    while (this.check(TokenType.VALIDATE)) {
      validations.push(this.parseValidationDefinition());
      this.skipNewlines();
    }

    // Parse cross-field validation (optional)
    const crossFieldRules: CrossFieldRule[] = [];
    // Check for "Cross-field" or "Cross-Field" as identifiers
    if (
      this.check(TokenType.IDENTIFIER) &&
      this.currentToken().value.toLowerCase().startsWith('cross')
    ) {
      crossFieldRules.push(...this.parseCrossFieldValidation());
      this.skipNewlines();
    }

    // Parse rate limiting validation (optional)
    const rateLimitRules: RateLimitRule[] = [];
    if (this.check(TokenType.RATE)) {
      const saved = this.current;
      this.advance();
      const next = this.currentToken();
      this.current = saved;

      if (
        next.type === TokenType.LIMIT ||
        (next.type === TokenType.IDENTIFIER && next.value.toLowerCase() === 'limiting')
      ) {
        rateLimitRules.push(...this.parseRateLimitValidation());
        this.skipNewlines();
      }
    }

    // Parse custom business rules (optional)
    const businessRules: BusinessRule[] = [];
    if (
      (this.check(TokenType.IDENTIFIER) && this.currentToken().value.toLowerCase() === 'custom') ||
      (this.check(TokenType.IDENTIFIER) && this.currentToken().value.toLowerCase() === 'business')
    ) {
      businessRules.push(...this.parseBusinessRules());
      this.skipNewlines();
    }

    const end = this.current > 0 ? this.previousToken().end : start;

    return {
      validations,
      crossFieldRules,
      rateLimitRules,
      businessRules,
      start,
      end,
    };
  }

  /**
   * Parse validation definition
   * validate_def ::= "Validate" model_name ":" newline validation_item+
   */
  private parseValidationDefinition(): ValidationDefinition {
    const start = this.currentToken().start;

    this.consume(TokenType.VALIDATE, 'Expected "Validate"');

    // Collect all tokens until colon for multi-word model names
    const modelNameParts: string[] = [];
    while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
      modelNameParts.push(this.advance().value);
    }
    const modelName = modelNameParts.join(' ');

    this.consume(TokenType.COLON, 'Expected ":" after model name');
    this.consumeNewline();

    // Skip blank lines
    this.skipNewlines();

    // Parse validation rules
    const rules: ValidationRule[] = [];
    while (this.check(TokenType.DASH)) {
      rules.push(this.parseValidationRule());
      this.skipNewlines();
    }

    return {
      modelName,
      rules,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse validation rule
   * validation_item ::= "-" field "must" constraint_expr newline
   */
  private parseValidationRule(): ValidationRule {
    const start = this.currentToken().start;

    this.consume(TokenType.DASH, 'Expected "-"');

    // Collect field name until "must"
    const fieldParts: string[] = [];
    while (!this.check(TokenType.MUST) && !this.isAtEnd()) {
      const token = this.currentToken();
      if (token.type === TokenType.NEWLINE) {
        break;
      }
      fieldParts.push(this.advance().value);
    }

    const originalField = fieldParts.join(' ');
    const field = normalizeIdentifier(originalField);

    this.consume(TokenType.MUST, 'Expected "must"');

    // Parse constraint expression
    const constraint = this.parseConstraintExpression();

    return {
      field,
      originalField,
      constraint,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse constraint expression
   */
  private parseConstraintExpression(): ConstraintExpression {
    const token = this.currentToken();

    // "be" constraints
    if (token.type === TokenType.BE) {
      this.advance();
      return this.parseBeConstraint();
    }

    // "contain" constraint
    if (token.type === TokenType.CONTAIN) {
      this.advance();
      const requirement = this.parseRequirement();
      return { type: 'contain', requirement };
    }

    // "not contain" or "not be" constraint
    if (token.type === TokenType.NOT) {
      this.advance();
      const next = this.currentToken();

      if (next.type === TokenType.CONTAIN) {
        this.advance();
        const requirement = this.parseRequirement();
        return { type: 'not_contain', requirement };
      }

      if (next.type === TokenType.BE) {
        this.advance();
        // Collect the rest for "not be in list"
        const parts: string[] = [];
        while (!this.check(TokenType.NEWLINE) && !this.isAtEnd() && parts.length < 5) {
          parts.push(this.currentToken().value.toLowerCase());
          this.advance();
        }
        const text = parts.join(' ');
        if (text.startsWith('in ')) {
          const listName = parts.slice(1).join(' ');
          return { type: 'not_in_list', list: listName };
        }
        throw new ParseError(`Unknown constraint: not be ${text}`, next.start);
      }

      throw new ParseError('Expected "contain" or "be" after "not"', next.start);
    }

    // "match" constraint
    if (token.type === TokenType.MATCH) {
      this.advance();
      const pattern = this.consume(TokenType.STRING, 'Expected pattern string').value;
      return { type: 'match', pattern };
    }

    // "exist when" constraint
    if (token.type === TokenType.EXIST) {
      this.advance();
      this.consume(TokenType.WHEN, 'Expected "when" after "exist"');
      const condition = this.parseSimpleCondition();
      return { type: 'exist_when', condition };
    }

    throw new ParseError(`Expected constraint expression, got: ${token.value}`, token.start);
  }

  /**
   * Parse "be" constraint
   */
  private parseBeConstraint(): ConstraintExpression {
    const token = this.currentToken();

    // "be between"
    if (token.type === TokenType.BETWEEN) {
      this.advance();
      const min = parseInt(this.consume(TokenType.NUMBER, 'Expected min value').value, 10);
      this.consume(TokenType.AND, 'Expected "and"');
      const max = parseInt(this.consume(TokenType.NUMBER, 'Expected max value').value, 10);

      // Consume "characters" as identifier
      const charactersToken = this.currentToken();
      if (charactersToken.value.toLowerCase() !== 'characters') {
        throw new ParseError('Expected "characters"', charactersToken.start);
      }
      this.advance();

      // Check for conditional "if provided"
      let conditional: string | undefined;
      if (this.check(TokenType.IDENTIFIER) && this.currentToken().value.toLowerCase() === 'if') {
        this.advance();
        const providedToken = this.currentToken();
        if (providedToken.value.toLowerCase() !== 'provided') {
          throw new ParseError('Expected "provided" after "if"', providedToken.start);
        }
        this.advance();
        conditional = 'if provided';
      }

      return { type: 'between', min, max, unit: 'characters', conditional };
    }

    // "be at least" or "be at most"
    if (token.type === TokenType.AT) {
      this.advance();
      const next = this.currentToken();

      if (next.type === TokenType.LEAST) {
        this.advance();
        const value = parseInt(this.consume(TokenType.NUMBER, 'Expected number').value, 10);

        // Consume "characters" as identifier
        const charactersToken = this.currentToken();
        if (charactersToken.value.toLowerCase() !== 'characters') {
          throw new ParseError('Expected "characters"', charactersToken.start);
        }
        this.advance();

        let conditional: string | undefined;
        if (this.check(TokenType.IDENTIFIER) && this.currentToken().value.toLowerCase() === 'if') {
          this.advance();
          const providedToken = this.currentToken();
          if (providedToken.value.toLowerCase() !== 'provided') {
            throw new ParseError('Expected "provided"', providedToken.start);
          }
          this.advance();
          conditional = 'if provided';
        }

        return { type: 'at_least', value, unit: 'characters', conditional };
      }

      if (next.type === TokenType.MOST) {
        this.advance();
        const value = parseInt(this.consume(TokenType.NUMBER, 'Expected number').value, 10);

        // Consume "characters" as identifier
        const charactersToken = this.currentToken();
        if (charactersToken.value.toLowerCase() !== 'characters') {
          throw new ParseError('Expected "characters"', charactersToken.start);
        }
        this.advance();

        let conditional: string | undefined;
        if (this.check(TokenType.IDENTIFIER) && this.currentToken().value.toLowerCase() === 'if') {
          this.advance();
          const providedToken = this.currentToken();
          if (providedToken.value.toLowerCase() !== 'provided') {
            throw new ParseError('Expected "provided"', providedToken.start);
          }
          this.advance();
          conditional = 'if provided';
        }

        return { type: 'at_most', value, unit: 'characters', conditional };
      }

      throw new ParseError('Expected "least" or "most" after "at"', next.start);
    }

    // "be empty when"
    if (token.type === TokenType.EMPTY) {
      this.advance();
      this.consume(TokenType.WHEN, 'Expected "when"');
      const condition = this.parseSimpleCondition();
      return { type: 'be_empty_when', condition };
    }

    // "be unique within"
    if (token.type === TokenType.UNIQUE) {
      this.advance();
      const withinToken = this.currentToken();
      if (withinToken.value.toLowerCase() !== 'within') {
        throw new ParseError('Expected "within" after "unique"', withinToken.start);
      }
      this.advance();

      // Skip "all" if present
      if (this.check(TokenType.ALL)) {
        this.advance();
      }

      // Get model name
      const modelName = this.consume(TokenType.IDENTIFIER, 'Expected model name').value;
      return { type: 'unique_within', modelName };
    }

    // Check if this looks like a format type by peeking ahead
    // If it starts with "unique", "in", or unknown keywords, throw error
    if (token.type === TokenType.IDENTIFIER) {
      const lowerValue = token.value.toLowerCase();
      if (lowerValue === 'in' || lowerValue === 'unique') {
        throw new ParseError(`Unexpected keyword after "be": ${token.value}`, token.start);
      }
    }

    // "be" format_type - anything else is a format type
    const formatType = this.parseFormatType();
    return { type: 'format', formatType };
  }

  /**
   * Parse format type
   */
  private parseFormatType(): FormatType {
    const start = this.currentToken();
    const parts: string[] = [];

    // Safety counter to prevent infinite loops
    let tokenCount = 0;
    const maxTokens = 10;

    // Collect tokens until newline or end
    while (!this.check(TokenType.NEWLINE) && !this.isAtEnd() && tokenCount < maxTokens) {
      const token = this.currentToken();
      // Stop at conditional keywords
      if (token.value.toLowerCase() === 'if' && token.type === TokenType.IDENTIFIER) {
        break;
      }
      parts.push(token.value.toLowerCase());
      this.advance();
      tokenCount++;
    }

    const formatString = parts.join(' ').trim();

    // Match format types
    if (formatString === 'valid email format') {
      return FormatType.VALID_EMAIL_FORMAT;
    }
    if (formatString === 'valid url') {
      return FormatType.VALID_URL;
    }
    if (formatString === 'alphanumeric and dashes only') {
      return FormatType.ALPHANUMERIC;
    }
    if (formatString === 'alphanumeric') {
      return FormatType.ALPHANUMERIC;
    }
    if (formatString === 'lowercase alphanumeric and dashes only') {
      return FormatType.LOWERCASE_ALPHANUMERIC_AND_DASHES;
    }

    throw new ParseError(`Unknown format type: ${formatString}`, start.start);
  }

  /**
   * Parse requirement
   */
  private parseRequirement(): RequirementType {
    const start = this.currentToken();
    const parts: string[] = [];

    // Safety counter to prevent infinite loops
    let tokenCount = 0;
    const maxTokens = 10;

    // Collect tokens until newline or end
    while (!this.check(TokenType.NEWLINE) && !this.isAtEnd() && tokenCount < maxTokens) {
      parts.push(this.currentToken().value.toLowerCase());
      this.advance();
      tokenCount++;
    }

    const requirementString = parts.join(' ').trim();

    // Match requirement types
    if (requirementString === 'uppercase and lowercase and number') {
      return RequirementType.UPPERCASE_AND_LOWERCASE_AND_NUMBER;
    }
    if (requirementString === 'uppercase and lowercase and number and special character') {
      return RequirementType.UPPERCASE_AND_LOWERCASE_AND_NUMBER; // Note: spec doesn't have separate type for this
    }
    if (requirementString === 'special character') {
      return RequirementType.SPECIAL_CHARACTER;
    }
    if (requirementString === 'profanity') {
      return RequirementType.PROFANITY;
    }
    if (requirementString === 'spam keywords') {
      return RequirementType.SPAM_KEYWORDS;
    }
    if (requirementString === 'malicious links') {
      return RequirementType.MALICIOUS_LINKS;
    }
    if (requirementString === 'disposable email list') {
      return RequirementType.DISPOSABLE_EMAIL_LIST;
    }

    throw new ParseError(`Unknown requirement type: ${requirementString}`, start.start);
  }

  /**
   * Parse simple condition (for exist when, be empty when)
   */
  private parseSimpleCondition(): Condition {
    const start = this.currentToken().start;

    // Collect field name until operator
    const fieldParts: string[] = [];
    while (!this.isOperatorToken() && !this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      fieldParts.push(this.advance().value);
    }

    const field = normalizeIdentifier(fieldParts.join(' '));

    // Parse operator (simple "is" for v0.1.0)
    const operator = ComparisonOperator.IS;
    this.consume(TokenType.IS, 'Expected "is"');

    // Parse value (true/false for v0.1.0)
    const valueToken = this.currentToken();
    let value;

    if (valueToken.type === TokenType.TRUE) {
      this.advance();
      value = { type: 'literal' as const, value: true };
    } else if (valueToken.type === TokenType.FALSE) {
      this.advance();
      value = { type: 'literal' as const, value: false };
    } else {
      throw new ParseError('Expected boolean value', valueToken.start);
    }

    return {
      field,
      operator,
      value,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse cross-field validation
   */
  private parseCrossFieldValidation(): CrossFieldRule[] {
    // Skip "Cross-field Validation:" header
    while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
      this.advance();
    }
    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewline();
    this.skipNewlines();

    const rules: CrossFieldRule[] = [];

    while (this.check(TokenType.DASH)) {
      const start = this.currentToken().start;
      this.consume(TokenType.DASH, 'Expected "-"');

      // Collect entire rule until newline
      const ruleParts: string[] = [];
      while (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
        ruleParts.push(this.advance().value);
      }

      const rule = ruleParts.join(' ');

      // Extract model name (first word) and field (second word)
      const parts = rule.split(' ');
      const modelName = parts[0] || '';
      const field = parts[1] || '';

      rules.push({
        modelName,
        field,
        rule,
        start,
        end: this.previousToken().end,
      });

      this.skipNewlines();
    }

    return rules;
  }

  /**
   * Parse rate limiting validation
   */
  private parseRateLimitValidation(): RateLimitRule[] {
    // Skip "Rate Limiting Validation:" or "Rate Limit Validation:" header
    while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
      this.advance();
    }
    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewline();
    this.skipNewlines();

    const rules: RateLimitRule[] = [];

    while (this.check(TokenType.DASH)) {
      const start = this.currentToken().start;
      this.consume(TokenType.DASH, 'Expected "-"');

      // Parse: "User can create at most 10 Posts per day"
      const modelName = this.consume(TokenType.IDENTIFIER, 'Expected model name').value;
      this.consume(TokenType.CAN, 'Expected "can"');
      const action = this.consume(TokenType.IDENTIFIER, 'Expected action').value;
      this.consume(TokenType.AT, 'Expected "at"');
      this.consume(TokenType.MOST, 'Expected "most"');
      const limit = parseInt(this.consume(TokenType.NUMBER, 'Expected limit').value, 10);

      // Skip until "per"
      while (!this.check(TokenType.PER) && !this.isAtEnd()) {
        this.advance();
      }

      this.consume(TokenType.PER, 'Expected "per"');
      const period = this.consume(TokenType.IDENTIFIER, 'Expected period').value;

      rules.push({
        modelName,
        action,
        limit,
        period: `per ${period}`,
        start,
        end: this.previousToken().end,
      });

      this.skipNewlines();
    }

    return rules;
  }

  /**
   * Parse business rules
   */
  private parseBusinessRules(): BusinessRule[] {
    // Skip "Custom Business Rules:" or "Business Rules:" header
    while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
      this.advance();
    }
    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewline();
    this.skipNewlines();

    const rules: BusinessRule[] = [];

    while (this.check(TokenType.DASH)) {
      const start = this.currentToken().start;
      this.consume(TokenType.DASH, 'Expected "-"');

      // Collect entire rule until newline
      const descriptionParts: string[] = [];
      while (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
        descriptionParts.push(this.advance().value);
      }

      rules.push({
        description: descriptionParts.join(' '),
        start,
        end: this.previousToken().end,
      });

      this.skipNewlines();
    }

    return rules;
  }

  /**
   * Helper methods
   */
  private isOperatorToken(): boolean {
    const token = this.currentToken();
    return (
      token.type === TokenType.IS ||
      token.type === TokenType.EQUALS ||
      token.type === TokenType.MATCHES ||
      token.type === TokenType.CONTAINS
    );
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.currentToken().type === TokenType.EOF;
  }

  private currentToken(): Token {
    const token = this.tokens[this.current];
    if (token) return token;
    const lastToken = this.tokens[this.tokens.length - 1];
    if (lastToken) return lastToken;
    // Fallback for empty token array
    return {
      type: TokenType.EOF,
      value: '',
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
    };
  }

  private previousToken(): Token {
    if (this.current > 0) {
      const token = this.tokens[this.current - 1];
      if (token) return token;
    }
    const firstToken = this.tokens[0];
    if (firstToken) return firstToken;
    // Fallback for empty token array
    return {
      type: TokenType.EOF,
      value: '',
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
    };
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previousToken();
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.currentToken().type === type;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }

    throw new ParseError(message, this.currentToken().start);
  }

  private consumeNewline(): void {
    if (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
      throw new ParseError('Expected newline', this.currentToken().start);
    }
    if (this.check(TokenType.NEWLINE)) {
      this.advance();
    }
  }

  private skipNewlines(): void {
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
    }
  }
}
