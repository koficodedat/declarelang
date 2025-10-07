/**
 * SEED Parser for DeclareLang
 * Implements recursive descent parsing based on DSL Grammar Specification v0.1.0
 *
 * Grammar:
 * seed_file ::= seed_section+
 * seed_section ::= "Seed" model_name ":" newline seed_item+
 *                | "Seed for" environment ":" newline seed_item+
 * environment ::= "development" | "testing" | "production"
 * seed_item ::= "-" literal_seed newline | "-" random_seed newline
 */

import { Token, TokenType, Position } from '../types/token.js';
import {
  SEEDFile,
  SeedSection,
  SeedItem,
  LiteralSeed,
  RandomSeed,
  AttributeAssignment,
  ModelReference,
} from '../types/ast.js';
import { ParseError } from './ddl-parser.js';

/**
 * SEED Parser
 */
export class SEEDParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    // Filter out comments for parsing
    this.tokens = tokens.filter((t) => t.type !== TokenType.COMMENT);
  }

  /**
   * Parse SEED file
   */
  parse(): SEEDFile {
    // Handle empty file
    if (this.isAtEnd() || this.tokens.length === 0) {
      const emptyPos: Position = { line: 1, column: 1, offset: 0 };
      return {
        sections: [],
        start: emptyPos,
        end: emptyPos,
      };
    }

    const start = this.currentToken().start;
    this.skipNewlines();

    const sections: SeedSection[] = [];

    while (!this.isAtEnd()) {
      if (this.currentToken().type === TokenType.SEED) {
        sections.push(this.parseSeedSection());
      } else {
        // Skip unknown tokens
        this.advance();
      }

      this.skipNewlines();
    }

    const end = this.current > 0 ? this.previousToken().end : start;

    return {
      sections,
      start,
      end,
    };
  }

  /**
   * Parse a seed section (e.g., "Seed Users:" or "Seed for development:")
   */
  private parseSeedSection(): SeedSection {
    const start = this.currentToken().start;

    // Expect "Seed"
    if (this.currentToken().type !== TokenType.SEED) {
      throw new ParseError('Expected "Seed"', this.currentToken().start);
    }
    this.advance();

    let modelName: string | undefined;
    let environment: string | undefined;

    // Check if this is "Seed for environment:" or "Seed ModelName:"
    if (this.currentToken().type === TokenType.FOR) {
      // "Seed for environment:"
      this.advance();

      // Read environment name
      const envToken = this.currentToken();
      environment = envToken.value.toLowerCase();

      // Validate environment name
      const validEnvironments = ['production', 'development', 'testing', 'staging'];
      if (!validEnvironments.includes(environment)) {
        throw new ParseError(
          `Invalid environment name: "${environment}". Must be one of: ${validEnvironments.join(', ')}`,
          envToken.start
        );
      }

      this.advance();
    } else {
      // "Seed ModelName:"
      // Read model name (can be multiple words)
      const modelNameParts: string[] = [];
      while (
        !this.isAtEnd() &&
        this.currentToken().type !== TokenType.COLON &&
        this.currentToken().type !== TokenType.NEWLINE
      ) {
        // Check if this looks like an environment name without "for" keyword
        const value = this.currentToken().value.toLowerCase();
        if (
          modelNameParts.length === 0 &&
          ['production', 'development', 'testing', 'staging'].includes(value)
        ) {
          throw new ParseError(
            `Missing "for" keyword before environment name. Use "Seed for ${value}:" instead of "Seed ${value}:"`,
            this.currentToken().start
          );
        }

        modelNameParts.push(this.currentToken().value);
        this.advance();
      }
      modelName = modelNameParts.join(' ');
    }

    // Expect ":"
    if (this.currentToken().type !== TokenType.COLON) {
      throw new ParseError('Expected ":" after seed section header', this.currentToken().start);
    }
    this.advance();

    this.expect(TokenType.NEWLINE, 'Expected newline after seed section header');
    this.skipNewlines();

    const items: SeedItem[] = [];

    while (!this.isAtEnd() && this.currentToken().type === TokenType.DASH) {
      items.push(this.parseSeedItem());
      this.skipNewlines();
    }

    if (items.length === 0) {
      throw new ParseError('Expected at least one seed item', start);
    }

    const end = this.previousToken().end;

    return {
      modelName,
      environment,
      items,
      start,
      end,
    };
  }

  /**
   * Parse a seed item (literal or random)
   */
  private parseSeedItem(): SeedItem {
    const start = this.currentToken().start;

    // Expect "-"
    this.expect(TokenType.DASH, 'Expected "-"');

    // Check if this is a random seed (starts with a number)
    if (this.currentToken().type === TokenType.NUMBER) {
      return this.parseRandomSeed(start);
    } else if (this.currentToken().type === TokenType.RANDOM) {
      // Handle "- random Tags attached to random Posts"
      return this.parseRandomSeed(start);
    } else {
      return this.parseLiteralSeed(start);
    }
  }

  /**
   * Parse a literal seed item
   */
  private parseLiteralSeed(start: Position): LiteralSeed {
    // Read primary value (can be string, identifier, or email)
    let primaryValue: string | undefined;

    // If starts with a string, that's the primary value (preserve quotes)
    if (this.currentToken().type === TokenType.STRING) {
      primaryValue = `"${this.currentToken().value}"`;
      this.advance();
    } else if (this.currentToken().type === TokenType.IDENTIFIER) {
      // Read identifier - could be email like "admin@blog.com" which tokenizes as:
      // IDENTIFIER(@) DOT IDENTIFIER
      primaryValue = this.currentToken().value;
      this.advance();

      // Handle email/domain pattern: identifier.identifier (like @blog.com)
      while (
        !this.isAtEnd() &&
        this.currentToken().type === TokenType.DOT &&
        this.peek()?.type === TokenType.IDENTIFIER
      ) {
        primaryValue += this.currentToken().value; // add '.'
        this.advance();
        primaryValue += this.currentToken().value; // add identifier after '.'
        this.advance();
      }
    }

    const attributes: AttributeAssignment[] = [];
    const references: ModelReference[] = [];

    // Parse "with", "for", "by", "in" clauses
    while (
      !this.isAtEnd() &&
      this.currentToken().type !== TokenType.NEWLINE &&
      this.currentToken().type !== TokenType.EOF
    ) {
      if (this.currentToken().type === TokenType.WITH) {
        this.advance();
        // Parse attributes
        attributes.push(...this.parseAttributeAssignments());
      } else if (this.currentToken().type === TokenType.FOR) {
        this.advance();
        // Parse reference (e.g., "for john@blog.com User")
        references.push(this.parseModelReference());
      } else if (
        this.currentToken().type === TokenType.BY ||
        (this.currentToken().type === TokenType.IDENTIFIER &&
          this.currentToken().value.toLowerCase() === 'by')
      ) {
        this.advance();
        // Parse reference (e.g., "by jane@blog.com User")
        references.push(this.parseModelReference());
      } else if (this.currentToken().type === TokenType.IN) {
        this.advance();
        // Parse reference (e.g., "in Technology Category")
        references.push(this.parseModelReference());
      } else if (this.currentToken().type === TokenType.AND) {
        // AND is handled inside parseAttributeAssignments, shouldn't reach here
        this.advance();
      } else {
        // Unexpected token in literal seed - likely missing "with" keyword
        if (
          this.currentToken().type !== TokenType.NEWLINE &&
          this.currentToken().type !== TokenType.EOF
        ) {
          throw new ParseError(
            `Unexpected token "${this.currentToken().value}". Expected "with", "for", "in", or "by" keyword`,
            this.currentToken().start
          );
        }
        break;
      }
    }

    const end = this.previousToken().end;

    return {
      type: 'literal',
      primaryValue,
      attributes,
      references,
      start,
      end,
    };
  }

  /**
   * Parse a random seed item
   */
  private parseRandomSeed(start: Position): RandomSeed {
    let count = 0;
    let modelName = '';
    const randomFields: string[] = [];
    const attributes: AttributeAssignment[] = [];
    const references: ModelReference[] = [];
    let quantifier: string | undefined;

    // Check if starts with "random"
    if (this.currentToken().type === TokenType.RANDOM) {
      this.advance();

      // Read model name
      modelName = this.currentToken().value;
      this.advance();

      // Skip "attached to" or similar phrases
      while (
        !this.isAtEnd() &&
        this.currentToken().type !== TokenType.RANDOM &&
        this.currentToken().type !== TokenType.NEWLINE
      ) {
        if (this.currentToken().type === TokenType.RANDOM) {
          break;
        }
        this.advance();
      }

      // Parse "random Posts" reference
      if (this.currentToken().type === TokenType.RANDOM) {
        this.advance();
        const refModelName = this.currentToken().value;
        this.advance();
        references.push({
          value: 'random',
          modelName: refModelName,
          start: this.previousToken().start,
          end: this.previousToken().end,
        });
      }
    } else {
      // Starts with number
      count = parseInt(this.currentToken().value);
      this.advance();

      // Read model name
      modelName = this.currentToken().value;
      this.advance();

      // Expect "with random" or "with"
      if (this.currentToken().type === TokenType.WITH) {
        this.advance();

        if (this.currentToken().type === TokenType.RANDOM) {
          this.advance();

          // Parse random field list (e.g., "usernames and emails and roles")
          // Fields are separated by AND until we hit a fixed attribute or terminator
          while (
            !this.isAtEnd() &&
            this.currentToken().type !== TokenType.FOR &&
            this.currentToken().type !== TokenType.IN &&
            this.currentToken().type !== TokenType.BY &&
            this.currentToken().type !== TokenType.WITH &&
            this.currentToken().type !== TokenType.NEWLINE &&
            this.currentToken().type !== TokenType.AND
          ) {
            // Read field name (can be multi-word like "published at" → "published_at")
            const fieldParts: string[] = [];
            while (
              !this.isAtEnd() &&
              this.currentToken().type !== TokenType.AND &&
              this.currentToken().type !== TokenType.FOR &&
              this.currentToken().type !== TokenType.IN &&
              this.currentToken().type !== TokenType.BY &&
              this.currentToken().type !== TokenType.WITH &&
              this.currentToken().type !== TokenType.NEWLINE
            ) {
              fieldParts.push(this.currentToken().value);
              this.advance();

              // Check if next token is AND - if so, this field is complete
              if (this.currentToken().type === TokenType.AND) {
                break;
              }
            }

            // Join field parts with underscores
            const field = fieldParts.join('_');
            randomFields.push(field);

            // Skip AND separator if present
            if (this.currentToken().type === TokenType.AND) {
              this.advance();

              // After AND, check if we're starting fixed attributes
              // This happens when we have a pattern like "and FIELD VALUE"
              // We can detect this by checking if the current token is NOT followed by another AND
              // (which would indicate it's another random field in the list)
              // AND the current token is not a terminator (FOR/IN/BY/WITH/NEWLINE)

              // If the next token is a terminator, we're at the end of random fields
              const next = this.peek();

              // Check if this looks like a fixed attribute by seeing if there's a value after this token
              // Fixed attribute pattern: "and role admin" - role is followed by admin (then AND/terminator)
              // Random field pattern: "and emails" - emails is followed by terminator
              // Random field pattern: "and emails and roles" - emails is followed by AND

              if (next && next.type !== TokenType.AND) {
                // Not followed by AND, so either:
                // 1. "and FIELD" (last random field) - next is terminator or field continuation keyword
                // 2. "and FIELD VALUE" (fixed attribute) - next is value token

                // Field continuation keywords that can be part of field names
                const fieldContinuationTokens = [
                  TokenType.AT,
                  TokenType.MOST,
                  TokenType.LEAST,
                  TokenType.AGO,
                  TokenType.NOW,
                ];

                // If next is a terminator or field continuation, this is part of the random field
                // Otherwise, this starts fixed attributes
                if (
                  next.type !== TokenType.FOR &&
                  next.type !== TokenType.IN &&
                  next.type !== TokenType.BY &&
                  next.type !== TokenType.WITH &&
                  next.type !== TokenType.NEWLINE &&
                  !fieldContinuationTokens.includes(next.type)
                ) {
                  // This is "and FIELD VALUE" - fixed attribute
                  attributes.push(...this.parseAttributeAssignments());
                  break;
                }
              }
            }
          }
        } else {
          // Random seed (starts with number) must have "random" keyword after "with"
          throw new ParseError(
            `Expected "random" keyword after "with" in random seed (e.g., "5 Users with random usernames")`,
            this.currentToken().start
          );
        }
      }

      // Parse "for random X" or "in random Y"
      while (
        !this.isAtEnd() &&
        this.currentToken().type !== TokenType.NEWLINE &&
        this.currentToken().type !== TokenType.EOF
      ) {
        if (this.currentToken().type === TokenType.FOR) {
          this.advance();
          if (this.currentToken().type === TokenType.RANDOM) {
            this.advance();
            // Read adjectives like "active"
            const qualifiers: string[] = [];
            while (
              !this.isAtEnd() &&
              this.currentToken().type !== TokenType.IN &&
              this.currentToken().type !== TokenType.WITH &&
              this.currentToken().type !== TokenType.NEWLINE
            ) {
              const val = this.currentToken().value;
              // Check if this is a model name (capitalized)
              const firstChar = val.charAt(0);
              if (firstChar && firstChar === firstChar.toUpperCase()) {
                // This is the model name
                // Build the value: "random" + qualifiers
                const value = qualifiers.length > 0 ? `random ${qualifiers.join(' ')}` : 'random';
                references.push({
                  value,
                  modelName: val,
                  start: this.currentToken().start,
                  end: this.currentToken().end,
                });
                this.advance();
                break;
              }
              qualifiers.push(val);
              this.advance();
            }
          }
        } else if (
          this.currentToken().type === TokenType.IDENTIFIER &&
          this.currentToken().value.toLowerCase() === 'in'
        ) {
          this.advance();
          if (this.currentToken().type === TokenType.RANDOM) {
            this.advance();
            const refModelName = this.currentToken().value;
            this.advance();
            references.push({
              value: 'random',
              modelName: refModelName,
              start: this.previousToken().start,
              end: this.previousToken().end,
            });
          }
        } else if (this.currentToken().type === TokenType.WITH) {
          this.advance();
          // Check for quantifier (some, most, all)
          if (['some', 'most', 'all'].includes(this.currentToken().value.toLowerCase())) {
            quantifier = this.currentToken().value.toLowerCase();
            this.advance();
          }
          // Parse remaining attributes
          attributes.push(...this.parseAttributeAssignments());
        } else if (
          this.currentToken().type === TokenType.IDENTIFIER &&
          this.currentToken().value.toLowerCase() === 'by'
        ) {
          this.advance();
          if (this.currentToken().type === TokenType.RANDOM) {
            this.advance();
            const refModelName = this.currentToken().value;
            this.advance();
            references.push({
              value: 'random',
              modelName: refModelName,
              start: this.previousToken().start,
              end: this.previousToken().end,
            });
          }
        } else {
          break;
        }
      }
    }

    const end = this.previousToken().end;

    return {
      type: 'random',
      count,
      modelName,
      randomFields,
      attributes,
      references,
      quantifier,
      start,
      end,
    };
  }

  /**
   * Parse attribute assignments (e.g., "password Admin123! and username admin and role admin")
   * Simple approach: read field then value, repeat
   */
  private parseAttributeAssignments(): AttributeAssignment[] {
    const attributes: AttributeAssignment[] = [];

    while (
      !this.isAtEnd() &&
      this.currentToken().type !== TokenType.FOR &&
      this.currentToken().type !== TokenType.IN &&
      this.currentToken().type !== TokenType.BY &&
      this.currentToken().type !== TokenType.NEWLINE &&
      this.currentToken().type !== TokenType.EOF
    ) {
      // Skip "and" keyword
      if (this.currentToken().type === TokenType.AND) {
        this.advance();
        continue;
      }

      const start = this.currentToken().start;

      // Read field name and value
      // Examples: "password Admin123!", "first name John", "is active true"
      const fieldParts: string[] = [];
      let value: string | number | boolean | undefined;

      // Collect field name parts until we identify the value
      // Simple rule: keep reading until we hit a token that looks like a value
      while (!this.isAtEnd()) {
        const token = this.currentToken();

        // Clear value indicators
        if (token.type === TokenType.STRING) {
          value = token.value;
          this.advance();
          break;
        } else if (token.type === TokenType.NUMBER) {
          value = parseFloat(token.value);
          this.advance();
          break;
        } else if (
          token.type === TokenType.TRUE ||
          (token.type === TokenType.IDENTIFIER && token.value.toLowerCase() === 'true')
        ) {
          value = true;
          this.advance();
          break;
        } else if (
          token.type === TokenType.FALSE ||
          (token.type === TokenType.IDENTIFIER && token.value.toLowerCase() === 'false')
        ) {
          value = false;
          this.advance();
          break;
        } else if (token.type === TokenType.NOW) {
          // Time expression
          const timeExpr: string[] = [];
          while (
            !this.isAtEnd() &&
            this.currentToken().type !== TokenType.AND &&
            this.currentToken().type !== TokenType.FOR &&
            this.currentToken().type !== TokenType.IN &&
            this.currentToken().type !== TokenType.BY &&
            this.currentToken().type !== TokenType.NEWLINE
          ) {
            timeExpr.push(this.currentToken().value);
            this.advance();
          }
          value = timeExpr.join(' ');
          break;
        } else {
          // For any other token (IDENTIFIER, PASSWORD, or other keywords)
          // Determine if it's a field name or a value
          const next = this.peek();

          // If next token is AND/FOR/IN/BY/NEWLINE, this token is the value
          if (
            !next ||
            next.type === TokenType.AND ||
            next.type === TokenType.FOR ||
            next.type === TokenType.IN ||
            next.type === TokenType.BY ||
            next.type === TokenType.NEWLINE
          ) {
            value = token.value;
            this.advance();
            break;
          }

          // If this looks like a value (contains @ or ! or numbers), treat it as value
          if (token.value.includes('@') || token.value.includes('!') || /\d/.test(token.value)) {
            value = token.value;
            this.advance();
            break;
          }

          // Otherwise, it's part of the field name
          fieldParts.push(token.value);
          this.advance();
        }
      }

      if (fieldParts.length === 0 || value === undefined) {
        break;
      }

      const field = fieldParts.join(' ').replace(/\s+/g, '_').replace(/-/g, '_');
      const end = this.previousToken().end;

      attributes.push({
        field,
        value,
        start,
        end,
      });

      // Loop will continue and handle "and" at the top
    }

    return attributes;
  }

  /**
   * Parse a model reference (e.g., "john@blog.com User" or "'Test Post' Post")
   */
  private parseModelReference(): ModelReference {
    const start = this.currentToken().start;

    // Read value (can be string, identifier, or email)
    let value: string;

    if (this.currentToken().type === TokenType.STRING) {
      value = this.currentToken().value;
      this.advance();
    } else if (this.currentToken().type === TokenType.RANDOM) {
      value = 'random';
      this.advance();
      // May have adjectives like "active"
      while (!this.isAtEnd() && this.currentToken().type !== TokenType.NEWLINE) {
        const firstChar = this.currentToken().value.charAt(0);
        if (firstChar && firstChar === firstChar.toUpperCase()) {
          break;
        }
        value += ' ' + this.currentToken().value;
        this.advance();
      }
    } else {
      // Read value - could be simple "Technology Category" or complex "john@blog.com User"
      // Strategy: read first token as value, then check if next is capitalized (model name)
      value = this.currentToken().value;
      this.advance();

      // Handle email/domain pattern: identifier.identifier (like @blog.com)
      while (
        !this.isAtEnd() &&
        this.currentToken().type === TokenType.DOT &&
        this.peek()?.type === TokenType.IDENTIFIER
      ) {
        value += this.currentToken().value; // add '.'
        this.advance();
        value += this.currentToken().value; // add identifier after '.'
        this.advance();
      }
    }

    // Read model name (must be capitalized)
    let modelName: string;
    if (!this.isAtEnd() && this.currentToken().type !== TokenType.NEWLINE) {
      const firstChar = this.currentToken().value.charAt(0);
      if (firstChar && firstChar === firstChar.toUpperCase()) {
        modelName = this.currentToken().value;
        this.advance();
      } else {
        // Next token is not a model name, treat current value as both value and model
        modelName = value;
      }
    } else {
      // No next token, use value as model name
      modelName = value;
    }

    const end = this.previousToken().end;

    return {
      value,
      modelName,
      start,
      end,
    };
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

  private peek(): Token | undefined {
    if (this.current + 1 >= this.tokens.length) {
      return undefined;
    }
    return this.tokens[this.current + 1];
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
