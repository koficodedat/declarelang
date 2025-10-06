/**
 * DDL Parser for DeclareLang
 * Implements recursive descent parsing based on DSL Grammar Specification v0.1.0
 *
 * Grammar:
 * ddl_file       ::= model_def+
 * model_def      ::= model_declaration newline field_list
 * field_list     ::= field_item+
 * field_item     ::= "-" field_def newline | "-" relationship newline
 * field_def      ::= "has" field_name "as" type_spec
 * type_spec      ::= constraint* field_type constraint*
 * relationship   ::= has_many | belongs_to
 * has_many       ::= ("has many" | "many") model_reference
 * belongs_to     ::= "belongs to" model_reference
 */

import { Token, TokenType, Position } from '../types/token.js';
import {
  DDLFile,
  ModelDefinition,
  ModelItem,
  FieldDefinition,
  RelationshipDefinition,
  FieldType,
  FieldConstraint,
  RelationshipType,
  ModelName,
} from '../types/ast.js';
import { normalizeIdentifier, parseModelName } from '../utils/identifier.js';

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
 * DDL Parser
 */
export class DDLParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    // Filter out comments for parsing
    this.tokens = tokens.filter((t) => t.type !== TokenType.COMMENT);
  }

  /**
   * Parse DDL file
   */
  parse(): DDLFile {
    const start = this.currentToken().start;
    const models: ModelDefinition[] = [];

    // Skip leading newlines
    this.skipNewlines();

    // Parse models until EOF
    while (!this.isAtEnd()) {
      models.push(this.parseModelDefinition());
      this.skipNewlines();
    }

    if (models.length === 0) {
      throw new ParseError('Expected at least one model definition', start);
    }

    return {
      models,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse model definition
   * model_def ::= model_declaration newline field_list
   */
  private parseModelDefinition(): ModelDefinition {
    const start = this.currentToken().start;

    // Parse model name (with optional pluralization brackets)
    const modelName = this.parseModelName();

    // Expect colon or "has:" (optional "has" keyword before colon)
    if (this.check(TokenType.HAS)) {
      this.advance();
    }

    this.consume(TokenType.COLON, "Expected ':' after model name");
    this.consumeNewline();

    // Skip any blank lines or lines with only comments
    this.skipNewlines();

    // Parse field list
    const items: ModelItem[] = [];
    while (this.check(TokenType.DASH)) {
      items.push(this.parseFieldItem());
      this.skipNewlines();
    }

    if (items.length === 0) {
      throw new ParseError('Model must have at least one field or relationship', start);
    }

    return {
      name: modelName,
      items,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse model name with pluralization
   * model_name ::= identifier | identifier "[" plural_spec "]"
   */
  private parseModelName(): ModelName {
    const start = this.currentToken().start;

    // Read identifier
    const identifier = this.consume(TokenType.IDENTIFIER, 'Expected model name').value;

    // Check for pluralization brackets
    let fullModelName = identifier;
    if (this.check(TokenType.LBRACKET)) {
      this.advance(); // consume '['

      // Read plural specification
      let pluralSpec = '';
      while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
        const token = this.advance();
        if (token.type === TokenType.PIPE) {
          pluralSpec += '|';
        } else if (token.type === TokenType.IDENTIFIER) {
          pluralSpec += token.value;
        } else {
          throw new ParseError(`Unexpected token in pluralization: ${token.value}`, token.start);
        }
      }

      this.consume(TokenType.RBRACKET, "Expected ']' after plural specification");
      fullModelName = identifier + '[' + pluralSpec + ']';
    }

    // Parse pluralization
    const { singular, plural, originalForm } = parseModelName(fullModelName);

    return {
      singular,
      plural,
      originalForm,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse field or relationship item
   * field_item ::= "-" (field_def | relationship) newline
   */
  private parseFieldItem(): ModelItem {
    this.consume(TokenType.DASH, "Expected '-' before field or relationship");

    // Disambiguate between field definition and relationship:
    // - "has many X" or "many X" → relationship
    // - "has <name> as <type>" → field definition
    // - "belongs to X" → relationship

    if (this.check(TokenType.MANY)) {
      // "many X" → relationship
      return this.parseRelationship();
    } else if (this.check(TokenType.BELONGS)) {
      // "belongs to X" → relationship
      return this.parseRelationship();
    } else if (this.check(TokenType.HAS)) {
      // Lookahead to distinguish "has many" from "has <field>"
      const nextToken = this.peekNext();
      if (nextToken && nextToken.type === TokenType.MANY) {
        // "has many X" → relationship
        return this.parseRelationship();
      } else {
        // "has <field> as <type>" → field definition
        return this.parseFieldDefinition();
      }
    } else {
      throw new ParseError('Expected field or relationship definition', this.currentToken().start);
    }
  }

  /**
   * Parse field definition
   * field_def ::= "has" field_name "as" type_spec
   * type_spec ::= constraint* field_type constraint*
   */
  private parseFieldDefinition(): FieldDefinition {
    const start = this.previousToken().start; // start at the dash

    this.consume(TokenType.HAS, "Expected 'has' for field definition");

    // Parse field name (may be multi-word)
    const fieldName = this.parseFieldName();
    const normalizedName = normalizeIdentifier(fieldName);

    this.consume(TokenType.AS, "Expected 'as' after field name");

    // Parse type spec (constraints and type can be in any order)
    const { type, constraints } = this.parseTypeSpec();

    return {
      name: normalizedName,
      originalName: fieldName,
      type,
      constraints,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse field name (may be multi-word identifier)
   * Collects tokens until "as" keyword
   * Field names can contain words that are keywords in other contexts
   */
  private parseFieldName(): string {
    const parts: string[] = [];

    // Structural keywords that should NOT be part of field names
    const structuralKeywords = new Set([
      TokenType.AS,
      TokenType.COLON,
      TokenType.DASH,
      TokenType.NEWLINE,
      TokenType.EOF,
      TokenType.LBRACKET,
      TokenType.RBRACKET,
    ]);

    // Read until we hit "as"
    while (!this.check(TokenType.AS) && !this.isAtEnd()) {
      const token = this.currentToken();

      // Stop at structural tokens
      if (structuralKeywords.has(token.type)) {
        if (token.type === TokenType.NEWLINE || token.type === TokenType.DASH) {
          throw new ParseError("Expected 'as' after field name", token.start);
        }
        break;
      }

      // Accept everything else as part of the field name
      // This allows "created at", "password hash", "is active", etc.
      parts.push(token.value);
      this.advance();
    }

    if (parts.length === 0) {
      throw new ParseError('Expected field name', this.currentToken().start);
    }

    return parts.join(' ');
  }

  /**
   * Parse type specification with constraints
   * type_spec ::= constraint* field_type constraint*
   */
  private parseTypeSpec(): { type: FieldType; constraints: FieldConstraint[] } {
    const constraints: FieldConstraint[] = [];
    let fieldType: FieldType | null = null;

    // Parse constraints and type (can be in any order)
    while (
      !this.check(TokenType.NEWLINE) &&
      !this.check(TokenType.DASH) &&
      !this.isAtEnd() &&
      !this.check(TokenType.EOF)
    ) {
      const token = this.currentToken();

      // Skip "and" and "," separators
      if (token.type === TokenType.AND || token.type === TokenType.COMMA) {
        this.advance();
        continue;
      }

      // Check for constraints
      if (token.type === TokenType.UNIQUE) {
        constraints.push(FieldConstraint.UNIQUE);
        this.advance();
      } else if (token.type === TokenType.REQUIRED) {
        constraints.push(FieldConstraint.REQUIRED);
        this.advance();
      } else if (token.type === TokenType.INDEXED) {
        constraints.push(FieldConstraint.INDEXED);
        this.advance();
      }
      // Check for field type
      else if (token.type === TokenType.TEXT) {
        // Check for "long text"
        if (this.peekNext()?.type === TokenType.LONG) {
          throw new ParseError('Invalid type order: use "long text" not "text long"', token.start);
        }
        if (fieldType !== null) {
          throw new ParseError('Field type already specified', token.start);
        }
        fieldType = FieldType.TEXT;
        this.advance();
      } else if (token.type === TokenType.LONG) {
        // "long text"
        this.advance();
        this.consume(TokenType.TEXT, "Expected 'text' after 'long'");
        if (fieldType !== null) {
          throw new ParseError('Field type already specified', token.start);
        }
        fieldType = FieldType.LONG_TEXT;
      } else if (token.type === TokenType.NUMBER_TYPE) {
        if (fieldType !== null) {
          throw new ParseError('Field type already specified', token.start);
        }
        fieldType = FieldType.NUMBER;
        this.advance();
      } else if (token.type === TokenType.DECIMAL) {
        if (fieldType !== null) {
          throw new ParseError('Field type already specified', token.start);
        }
        fieldType = FieldType.DECIMAL;
        this.advance();
      } else if (token.type === TokenType.BOOLEAN_TYPE) {
        if (fieldType !== null) {
          throw new ParseError('Field type already specified', token.start);
        }
        fieldType = FieldType.BOOLEAN;
        this.advance();
      } else if (token.type === TokenType.TIMESTAMP) {
        if (fieldType !== null) {
          throw new ParseError('Field type already specified', token.start);
        }
        fieldType = FieldType.TIMESTAMP;
        this.advance();
      } else if (token.type === TokenType.JSON) {
        if (fieldType !== null) {
          throw new ParseError('Field type already specified', token.start);
        }
        fieldType = FieldType.JSON;
        this.advance();
      } else if (token.type === TokenType.UUID) {
        if (fieldType !== null) {
          throw new ParseError('Field type already specified', token.start);
        }
        fieldType = FieldType.UUID;
        this.advance();
      } else {
        throw new ParseError(`Unexpected token in type specification: ${token.value}`, token.start);
      }
    }

    if (fieldType === null) {
      throw new ParseError('Expected field type', this.currentToken().start);
    }

    return { type: fieldType, constraints };
  }

  /**
   * Parse relationship
   * relationship ::= has_many | belongs_to
   * has_many     ::= ("has many" | "many") model_reference
   * belongs_to   ::= "belongs to" model_reference
   */
  private parseRelationship(): RelationshipDefinition {
    const start = this.previousToken().start; // start at the dash

    let relationshipType: RelationshipType;

    if (this.check(TokenType.HAS)) {
      this.advance();
      this.consume(TokenType.MANY, "Expected 'many' after 'has'");
      relationshipType = RelationshipType.HAS_MANY;
    } else if (this.check(TokenType.MANY)) {
      this.advance();
      relationshipType = RelationshipType.HAS_MANY;
    } else if (this.check(TokenType.BELONGS)) {
      this.advance();
      this.consume(TokenType.TO, "Expected 'to' after 'belongs'");
      relationshipType = RelationshipType.BELONGS_TO;
    } else {
      throw new ParseError('Expected relationship keyword', this.currentToken().start);
    }

    // Parse target model (singular form)
    const targetModel = this.consume(
      TokenType.IDENTIFIER,
      'Expected model name for relationship'
    ).value;

    return {
      type: relationshipType,
      targetModel,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Token navigation and utility methods
   */

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.currentToken().type === TokenType.EOF;
  }

  private currentToken(): Token {
    if (this.current >= this.tokens.length) {
      const lastToken = this.tokens[this.tokens.length - 1];
      if (!lastToken) {
        throw new Error('Token array is empty');
      }
      return lastToken; // Return EOF
    }
    const token = this.tokens[this.current];
    if (!token) {
      throw new Error(`Token at position ${this.current} is undefined`);
    }
    return token;
  }

  private previousToken(): Token {
    const token = this.tokens[this.current - 1];
    if (!token) {
      throw new Error(`Previous token at position ${this.current - 1} is undefined`);
    }
    return token;
  }

  private peekNext(): Token | null {
    if (this.current + 1 >= this.tokens.length) {
      return null;
    }
    const token = this.tokens[this.current + 1];
    return token ?? null;
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
