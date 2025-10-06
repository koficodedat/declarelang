/**
 * DML Parser for DeclareLang
 * Implements recursive descent parsing based on DSL Grammar Specification v0.1.0
 *
 * Grammar:
 * dml_file    ::= (query_def | mutation_def | computed_def)+
 * query_def   ::= "Query for" model_name ":" newline query_item+
 * mutation_def  ::= "Mutation for" model_name ":" newline mutation_item+
 * computed_def  ::= "Computed for" model_name ":" newline computed_item+
 */

import { Token, TokenType, Position } from '../types/token.js';
import {
  DMLFile,
  DMLSection,
  QuerySection,
  MutationSection,
  ComputedSection,
  QueryDefinition,
  MutationDefinition,
  ComputedDefinition,
  WhereClause,
  SortClause,
  LimitClause,
  Condition,
  Assignment,
  ComparisonOperator,
  SortDirection,
  TimeUnit,
  TimeExpression,
  ConditionValue,
  MutationAction,
  ComputedAggregation,
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
 * DML Parser
 */
export class DMLParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    // Filter out comments for parsing
    this.tokens = tokens.filter((t) => t.type !== TokenType.COMMENT);
  }

  /**
   * Parse DML file
   */
  parse(): DMLFile {
    const start = this.currentToken().start;
    const sections: DMLSection[] = [];

    // Skip leading newlines
    this.skipNewlines();

    // Parse sections until EOF
    while (!this.isAtEnd()) {
      sections.push(this.parseSection());
      this.skipNewlines();
    }

    if (sections.length === 0) {
      throw new ParseError('Expected at least one query, mutation, or computed definition', start);
    }

    return {
      sections,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse a section (query, mutation, or computed)
   */
  private parseSection(): DMLSection {
    const token = this.currentToken();

    if (token.type === TokenType.QUERY) {
      return this.parseQuerySection();
    } else if (token.type === TokenType.MUTATION) {
      return this.parseMutationSection();
    } else if (token.type === TokenType.COMPUTED) {
      return this.parseComputedSection();
    } else {
      throw new ParseError(
        'Expected "Query", "Mutation", or "Computed" keyword',
        this.currentToken().start
      );
    }
  }

  /**
   * Parse query section
   * query_def ::= "Query for" model_name ":" newline query_item+
   */
  private parseQuerySection(): QuerySection {
    const start = this.currentToken().start;

    this.consume(TokenType.QUERY, 'Expected "Query" keyword');
    this.consume(TokenType.FOR, 'Expected "for" after "Query"');

    const modelName = this.consume(TokenType.IDENTIFIER, 'Expected model name').value;
    this.consume(TokenType.COLON, 'Expected ":" after model name');
    this.consumeNewline();

    // Skip blank lines
    this.skipNewlines();

    // Parse query items
    const queries: QueryDefinition[] = [];
    while (this.check(TokenType.DASH)) {
      queries.push(this.parseQueryItem());
      this.skipNewlines();
    }

    if (queries.length === 0) {
      throw new ParseError('Query section must have at least one query', start);
    }

    return {
      modelName,
      queries,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse mutation section
   * mutation_def ::= "Mutation for" model_name ":" newline mutation_item+
   */
  private parseMutationSection(): MutationSection {
    const start = this.currentToken().start;

    this.consume(TokenType.MUTATION, 'Expected "Mutation" keyword');
    this.consume(TokenType.FOR, 'Expected "for" after "Mutation"');

    const modelName = this.consume(TokenType.IDENTIFIER, 'Expected model name').value;
    this.consume(TokenType.COLON, 'Expected ":" after model name');
    this.consumeNewline();

    // Skip blank lines
    this.skipNewlines();

    // Parse mutation items
    const mutations: MutationDefinition[] = [];
    while (this.check(TokenType.DASH)) {
      mutations.push(this.parseMutationItem());
      this.skipNewlines();
    }

    if (mutations.length === 0) {
      throw new ParseError('Mutation section must have at least one mutation', start);
    }

    return {
      modelName,
      mutations,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse computed section
   * computed_def ::= "Computed for" model_name ":" newline computed_item+
   */
  private parseComputedSection(): ComputedSection {
    const start = this.currentToken().start;

    this.consume(TokenType.COMPUTED, 'Expected "Computed" keyword');
    this.consume(TokenType.FOR, 'Expected "for" after "Computed"');

    const modelName = this.consume(TokenType.IDENTIFIER, 'Expected model name').value;
    this.consume(TokenType.COLON, 'Expected ":" after model name');
    this.consumeNewline();

    // Skip blank lines
    this.skipNewlines();

    // Parse computed items
    const computed: ComputedDefinition[] = [];
    while (this.check(TokenType.DASH)) {
      computed.push(this.parseComputedItem());
      this.skipNewlines();
    }

    if (computed.length === 0) {
      throw new ParseError('Computed section must have at least one computed field', start);
    }

    return {
      modelName,
      computed,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse query item
   * query_item ::= "-" query_name where_clause? sort_clause? limit_clause? newline
   */
  private parseQueryItem(): QueryDefinition {
    const start = this.currentToken().start;

    this.consume(TokenType.DASH, 'Expected "-" before query');

    // Parse query name (multi-word until "where", "sorted", "limited", or newline)
    const queryName = this.parseQueryName();

    // Parse optional clauses
    let whereClause: WhereClause | undefined;
    let sortClause: SortClause | undefined;
    let limitClause: LimitClause | undefined;

    while (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
      if (this.check(TokenType.WHERE)) {
        whereClause = this.parseWhereClause();
      } else if (this.check(TokenType.SORTED)) {
        sortClause = this.parseSortClause();
      } else if (this.check(TokenType.LIMITED)) {
        limitClause = this.parseLimitClause();
      } else {
        throw new ParseError(
          `Unexpected token in query: ${this.currentToken().value}`,
          this.currentToken().start
        );
      }
    }

    this.consumeNewline();

    return {
      name: normalizeIdentifier(queryName),
      originalName: queryName,
      whereClause,
      sortClause,
      limitClause,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse mutation item
   * mutation_item ::= "-" mutation_name action_clause newline
   */
  private parseMutationItem(): MutationDefinition {
    const start = this.currentToken().start;

    this.consume(TokenType.DASH, 'Expected "-" before mutation');

    // Parse mutation name (until "sets" or "increases")
    const mutationName = this.parseMutationName();

    // Parse action
    const action = this.parseActionClause();

    this.consumeNewline();

    return {
      name: normalizeIdentifier(mutationName),
      originalName: mutationName,
      action,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse computed item
   * computed_item ::= "-" field_name aggregation newline
   */
  private parseComputedItem(): ComputedDefinition {
    const start = this.currentToken().start;

    this.consume(TokenType.DASH, 'Expected "-" before computed field');

    // Parse field name (until aggregation keyword)
    const fieldName = this.parseComputedFieldName();

    // Parse aggregation
    const aggregation = this.parseAggregation();

    this.consumeNewline();

    return {
      fieldName: normalizeIdentifier(fieldName),
      originalFieldName: fieldName,
      aggregation,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse query name (until where/sorted/limited/newline)
   */
  private parseQueryName(): string {
    const parts: string[] = [];

    const stopTokens = new Set([
      TokenType.WHERE,
      TokenType.SORTED,
      TokenType.LIMITED,
      TokenType.NEWLINE,
      TokenType.EOF,
    ]);

    while (!this.isAtEnd()) {
      const token = this.currentToken();

      // Stop at clause keywords
      if (stopTokens.has(token.type)) {
        break;
      }

      parts.push(this.advance().value);
    }

    if (parts.length === 0) {
      throw new ParseError('Expected query name', this.currentToken().start);
    }

    return parts.join(' ');
  }

  /**
   * Parse mutation name (until sets/increases)
   */
  private parseMutationName(): string {
    const parts: string[] = [];

    const stopTokens = new Set([
      TokenType.SETS,
      TokenType.INCREASES,
      TokenType.NEWLINE,
      TokenType.EOF,
    ]);

    while (!stopTokens.has(this.currentToken().type) && !this.isAtEnd()) {
      parts.push(this.advance().value);
    }

    if (parts.length === 0) {
      throw new ParseError('Expected mutation name', this.currentToken().start);
    }

    return parts.join(' ');
  }

  /**
   * Parse computed field name (until counts/sums/returns/calculates)
   */
  private parseComputedFieldName(): string {
    const parts: string[] = [];

    const stopTokens = new Set([
      TokenType.COUNTS,
      TokenType.SUMS,
      TokenType.RETURNS,
      TokenType.CALCULATES,
      TokenType.NEWLINE,
      TokenType.EOF,
    ]);

    while (!stopTokens.has(this.currentToken().type) && !this.isAtEnd()) {
      parts.push(this.advance().value);
    }

    if (parts.length === 0) {
      throw new ParseError('Expected computed field name', this.currentToken().start);
    }

    return parts.join(' ');
  }

  /**
   * Parse where clause
   * where_clause ::= "where" condition ("and" condition)*
   */
  private parseWhereClause(): WhereClause {
    const start = this.currentToken().start;

    this.consume(TokenType.WHERE, 'Expected "where" keyword');

    const conditions: Condition[] = [];
    conditions.push(this.parseCondition());

    while (this.check(TokenType.AND)) {
      this.advance(); // consume "and"
      conditions.push(this.parseCondition());
    }

    return {
      conditions,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse condition
   * condition ::= field comparison value | field "is empty" | field "is not empty"
   */
  private parseCondition(): Condition {
    const start = this.currentToken().start;

    // Parse field name (until comparison operator)
    const field = this.parseFieldNameInCondition();

    // Parse operator
    const operator = this.parseComparisonOperator();

    // Parse value (optional for IS_EMPTY, IS_NOT_EMPTY)
    let value: ConditionValue | undefined;
    if (operator !== ComparisonOperator.IS_EMPTY && operator !== ComparisonOperator.IS_NOT_EMPTY) {
      value = this.parseConditionValue();
    }

    return {
      field: normalizeIdentifier(field),
      operator,
      value,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse field name in condition (until comparison operator)
   */
  private parseFieldNameInCondition(): string {
    const parts: string[] = [];

    const comparisonKeywords = new Set([
      TokenType.IS,
      TokenType.EQUALS,
      TokenType.MATCHES,
      TokenType.CONTAINS,
      TokenType.STARTS,
      TokenType.ENDS,
    ]);

    // Read until we hit a comparison operator
    while (!comparisonKeywords.has(this.currentToken().type) && !this.isAtEnd()) {
      const token = this.currentToken();

      // Stop at structural tokens
      if (
        token.type === TokenType.NEWLINE ||
        token.type === TokenType.AND ||
        token.type === TokenType.SORTED ||
        token.type === TokenType.LIMITED
      ) {
        break;
      }

      parts.push(this.advance().value);
    }

    if (parts.length === 0) {
      throw new ParseError('Expected field name', this.currentToken().start);
    }

    return parts.join(' ');
  }

  /**
   * Parse comparison operator
   */
  private parseComparisonOperator(): ComparisonOperator {
    const token = this.currentToken();

    if (token.type === TokenType.IS) {
      this.advance();

      // Check for multi-word operators
      if (this.check(TokenType.AFTER)) {
        this.advance();
        return ComparisonOperator.IS_AFTER;
      } else if (this.check(TokenType.BEFORE)) {
        this.advance();
        return ComparisonOperator.IS_BEFORE;
      } else if (this.check(TokenType.BETWEEN)) {
        this.advance();
        return ComparisonOperator.IS_BETWEEN;
      } else if (this.check(TokenType.EMPTY)) {
        this.advance();
        return ComparisonOperator.IS_EMPTY;
      } else if (this.check(TokenType.NOT)) {
        this.advance();
        this.consume(TokenType.EMPTY, 'Expected "empty" after "is not"');
        return ComparisonOperator.IS_NOT_EMPTY;
      } else {
        return ComparisonOperator.IS;
      }
    } else if (token.type === TokenType.EQUALS) {
      this.advance();
      return ComparisonOperator.EQUALS;
    } else if (token.type === TokenType.MATCHES) {
      this.advance();
      return ComparisonOperator.MATCHES;
    } else if (token.type === TokenType.CONTAINS) {
      this.advance();
      return ComparisonOperator.CONTAINS;
    } else if (token.type === TokenType.STARTS) {
      this.advance();
      this.consume(TokenType.WITH, 'Expected "with" after "starts"');
      return ComparisonOperator.STARTS_WITH;
    } else if (token.type === TokenType.ENDS) {
      this.advance();
      this.consume(TokenType.WITH, 'Expected "with" after "ends"');
      return ComparisonOperator.ENDS_WITH;
    } else {
      throw new ParseError(
        `Expected comparison operator, got: ${token.value}`,
        this.currentToken().start
      );
    }
  }

  /**
   * Parse condition value
   */
  private parseConditionValue(): ConditionValue {
    const token = this.currentToken();

    // Check for time expression
    if (this.isTimeExpression()) {
      return {
        type: 'time',
        expression: this.parseTimeExpression(),
      };
    }

    // Check for boolean
    if (token.type === TokenType.TRUE || token.type === TokenType.FALSE) {
      this.advance();
      return {
        type: 'literal',
        value: token.type === TokenType.TRUE,
      };
    }

    // Check for number
    if (token.type === TokenType.NUMBER) {
      this.advance();
      return {
        type: 'literal',
        value: parseInt(token.value, 10),
      };
    }

    // Check for string (strip quotes)
    if (token.type === TokenType.STRING) {
      this.advance();
      // Remove surrounding quotes
      let value = token.value;
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return {
        type: 'literal',
        value: value,
      };
    }

    // Otherwise, it's a reference (e.g., "current user")
    const parts: string[] = [];
    while (
      !this.check(TokenType.AND) &&
      !this.check(TokenType.SORTED) &&
      !this.check(TokenType.LIMITED) &&
      !this.check(TokenType.NEWLINE) &&
      !this.isAtEnd()
    ) {
      parts.push(this.advance().value);
    }

    if (parts.length === 0) {
      throw new ParseError('Expected value', this.currentToken().start);
    }

    return {
      type: 'reference',
      field: parts.join(' '),
    };
  }

  /**
   * Check if current position is a time expression
   */
  private isTimeExpression(): boolean {
    // Check for "now"
    if (this.check(TokenType.NOW)) {
      return true;
    }

    // Check for "N time_unit ago"
    if (this.check(TokenType.NUMBER)) {
      const next = this.peekNext();
      if (next && this.isTimeUnit(next.type)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parse time expression
   */
  private parseTimeExpression(): TimeExpression {
    const start = this.currentToken().start;

    // "now"
    if (this.check(TokenType.NOW)) {
      this.advance();
      return {
        type: 'now',
        start,
        end: this.previousToken().end,
      };
    }

    // "N time_unit ago"
    const numToken = this.consume(TokenType.NUMBER, 'Expected number in time expression');
    const value = parseInt(numToken.value, 10);

    const unit = this.parseTimeUnit();

    this.consume(TokenType.AGO, 'Expected "ago" after time unit');

    return {
      type: 'relative',
      value,
      unit,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Check if token type is a time unit
   */
  private isTimeUnit(type: TokenType): boolean {
    return (
      type === TokenType.MINUTE ||
      type === TokenType.MINUTES ||
      type === TokenType.HOUR ||
      type === TokenType.HOURS ||
      type === TokenType.DAY ||
      type === TokenType.DAYS ||
      type === TokenType.WEEK ||
      type === TokenType.WEEKS ||
      type === TokenType.MONTH ||
      type === TokenType.MONTHS ||
      type === TokenType.YEAR ||
      type === TokenType.YEARS
    );
  }

  /**
   * Parse time unit
   */
  private parseTimeUnit(): TimeUnit {
    const token = this.currentToken();

    if (token.type === TokenType.MINUTE) {
      this.advance();
      return TimeUnit.MINUTE;
    } else if (token.type === TokenType.MINUTES) {
      this.advance();
      return TimeUnit.MINUTES;
    } else if (token.type === TokenType.HOUR) {
      this.advance();
      return TimeUnit.HOUR;
    } else if (token.type === TokenType.HOURS) {
      this.advance();
      return TimeUnit.HOURS;
    } else if (token.type === TokenType.DAY) {
      this.advance();
      return TimeUnit.DAY;
    } else if (token.type === TokenType.DAYS) {
      this.advance();
      return TimeUnit.DAYS;
    } else if (token.type === TokenType.WEEK) {
      this.advance();
      return TimeUnit.WEEK;
    } else if (token.type === TokenType.WEEKS) {
      this.advance();
      return TimeUnit.WEEKS;
    } else if (token.type === TokenType.MONTH) {
      this.advance();
      return TimeUnit.MONTH;
    } else if (token.type === TokenType.MONTHS) {
      this.advance();
      return TimeUnit.MONTHS;
    } else if (token.type === TokenType.YEAR) {
      this.advance();
      return TimeUnit.YEAR;
    } else if (token.type === TokenType.YEARS) {
      this.advance();
      return TimeUnit.YEARS;
    } else {
      throw new ParseError(`Expected time unit, got: ${token.value}`, token.start);
    }
  }

  /**
   * Parse sort clause
   * sort_clause ::= "sorted by" field ("ascending" | "descending" | "asc" | "desc")
   */
  private parseSortClause(): SortClause {
    const start = this.currentToken().start;

    this.consume(TokenType.SORTED, 'Expected "sorted" keyword');
    this.consume(TokenType.BY, 'Expected "by" after "sorted"');

    // Parse field name (until direction keyword or newline)
    const fieldParts: string[] = [];
    while (
      !this.check(TokenType.ASCENDING) &&
      !this.check(TokenType.DESCENDING) &&
      !this.check(TokenType.ASC) &&
      !this.check(TokenType.DESC) &&
      !this.check(TokenType.NEWLINE) &&
      !this.check(TokenType.LIMITED) &&
      !this.isAtEnd()
    ) {
      fieldParts.push(this.advance().value);
    }

    if (fieldParts.length === 0) {
      throw new ParseError('Expected field name after "sorted by"', this.currentToken().start);
    }

    const field = normalizeIdentifier(fieldParts.join(' '));

    // Parse direction (optional, defaults to ascending)
    let direction = SortDirection.ASCENDING;
    if (this.check(TokenType.ASCENDING)) {
      this.advance();
      direction = SortDirection.ASCENDING;
    } else if (this.check(TokenType.DESCENDING)) {
      this.advance();
      direction = SortDirection.DESCENDING;
    } else if (this.check(TokenType.ASC)) {
      this.advance();
      direction = SortDirection.ASC;
    } else if (this.check(TokenType.DESC)) {
      this.advance();
      direction = SortDirection.DESC;
    }

    return {
      field,
      direction,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse limit clause
   * limit_clause ::= "limited to" number
   */
  private parseLimitClause(): LimitClause {
    const start = this.currentToken().start;

    this.consume(TokenType.LIMITED, 'Expected "limited" keyword');
    this.consume(TokenType.TO, 'Expected "to" after "limited"');

    const countToken = this.consume(TokenType.NUMBER, 'Expected number after "limited to"');
    const count = parseInt(countToken.value, 10);

    return {
      count,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse action clause
   * action_clause ::= "sets" assignments | "increases" field "by" number
   */
  private parseActionClause(): MutationAction {
    if (this.check(TokenType.SETS)) {
      this.advance();
      return {
        type: 'sets',
        assignments: this.parseAssignments(),
      };
    } else if (this.check(TokenType.INCREASES)) {
      this.advance();

      // Parse field name (until "by")
      const fieldParts: string[] = [];
      while (!this.check(TokenType.BY) && !this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
        fieldParts.push(this.advance().value);
      }

      if (fieldParts.length === 0) {
        throw new ParseError('Expected field name after "increases"', this.currentToken().start);
      }

      const field = normalizeIdentifier(fieldParts.join(' '));

      this.consume(TokenType.BY, 'Expected "by" after field name');

      const amountToken = this.consume(TokenType.NUMBER, 'Expected number after "by"');
      const amount = parseInt(amountToken.value, 10);

      return {
        type: 'increases',
        field,
        amount,
      };
    } else {
      throw new ParseError('Expected "sets" or "increases" keyword', this.currentToken().start);
    }
  }

  /**
   * Parse assignments
   * assignments ::= assignment ("and" assignment)*
   */
  private parseAssignments(): Assignment[] {
    const assignments: Assignment[] = [];

    assignments.push(this.parseAssignment());

    while (this.check(TokenType.AND)) {
      this.advance(); // consume "and"
      assignments.push(this.parseAssignment());
    }

    return assignments;
  }

  /**
   * Parse assignment
   * assignment ::= field "to" value
   */
  private parseAssignment(): Assignment {
    const start = this.currentToken().start;

    // Parse field name (until "to")
    const fieldParts: string[] = [];
    while (!this.check(TokenType.TO) && !this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
      fieldParts.push(this.advance().value);
    }

    if (fieldParts.length === 0) {
      throw new ParseError('Expected field name in assignment', this.currentToken().start);
    }

    const field = normalizeIdentifier(fieldParts.join(' '));

    this.consume(TokenType.TO, 'Expected "to" after field name');

    const value = this.parseConditionValue();

    return {
      field,
      value,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse aggregation
   * aggregation ::= "counts" model_reference where_clause?
   *               | "sums" model_reference "." field where_clause?
   *               | "returns" bool_expr
   *               | "calculates from" field
   */
  private parseAggregation(): ComputedAggregation {
    if (this.check(TokenType.COUNTS)) {
      this.advance();

      const targetModel = this.consume(
        TokenType.IDENTIFIER,
        'Expected model name after "counts"'
      ).value;

      // Optional where clause
      let whereClause: WhereClause | undefined;
      if (this.check(TokenType.WHERE)) {
        whereClause = this.parseWhereClause();
      }

      return {
        type: 'counts',
        targetModel,
        whereClause,
      };
    } else if (this.check(TokenType.SUMS)) {
      this.advance();

      const targetModel = this.consume(
        TokenType.IDENTIFIER,
        'Expected model name after "sums"'
      ).value;

      this.consume(TokenType.DOT, 'Expected "." after model name');

      // Parse field name (may be multi-word until where/newline)
      const fieldParts: string[] = [];
      while (!this.check(TokenType.WHERE) && !this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
        fieldParts.push(this.advance().value);
      }

      if (fieldParts.length === 0) {
        throw new ParseError('Expected field name after "."', this.currentToken().start);
      }

      const field = fieldParts.join(' ');

      // Optional where clause
      let whereClause: WhereClause | undefined;
      if (this.check(TokenType.WHERE)) {
        whereClause = this.parseWhereClause();
      }

      return {
        type: 'sums',
        targetModel,
        field,
        whereClause,
      };
    } else if (this.check(TokenType.RETURNS)) {
      this.advance();

      const condition = this.parseCondition();

      return {
        type: 'returns',
        condition,
      };
    } else if (this.check(TokenType.CALCULATES)) {
      this.advance();
      this.consume(TokenType.FROM, 'Expected "from" after "calculates"');

      const field = this.consume(TokenType.IDENTIFIER, 'Expected field name after "from"').value;

      return {
        type: 'calculates',
        field,
      };
    } else {
      throw new ParseError(
        'Expected "counts", "sums", "returns", or "calculates" keyword',
        this.currentToken().start
      );
    }
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
