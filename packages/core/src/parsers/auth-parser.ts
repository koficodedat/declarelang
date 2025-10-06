/**
 * AUTH Parser for DeclareLang
 * Implements recursive descent parsing based on DSL Grammar Specification v0.1.0
 *
 * Grammar:
 * auth_file ::= role_def rule_def+ field_rule_def*
 * role_def  ::= "Roles:" newline role_item+
 * rule_def  ::= "Rules for" model_name ":" newline permission_item+
 * field_rule_def ::= "Field Rules for" model_name ":" newline field_permission+
 */

import { Token, TokenType, Position } from '../types/token.js';
import {
  AUTHFile,
  RoleDefinition,
  ModelRules,
  FieldRules,
  PermissionRule,
  FieldPermission,
  PermissionSubject,
  SubjectType,
  CRUDAction,
  FieldAction,
  TargetSpec,
  TargetModifier,
  WhereClause,
  Condition,
  ComparisonOperator,
  ConditionValue,
  TimeUnit,
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
 * AUTH Parser
 */
export class AUTHParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    // Filter out comments for parsing
    this.tokens = tokens.filter((t) => t.type !== TokenType.COMMENT);
  }

  /**
   * Parse AUTH file
   */
  parse(): AUTHFile {
    const start = this.currentToken().start;

    // Skip leading newlines
    this.skipNewlines();

    // Parse roles (optional, but section must be present)
    const roles = this.parseRoleDefinition();

    // Skip newlines
    this.skipNewlines();

    // Parse model rules (optional)
    const modelRules: ModelRules[] = [];
    while (this.check(TokenType.RULES)) {
      modelRules.push(this.parseModelRules());
      this.skipNewlines();
    }

    // Parse field rules (optional)
    const fieldRules: FieldRules[] = [];
    while (this.check(TokenType.FIELD)) {
      fieldRules.push(this.parseFieldRules());
      this.skipNewlines();
    }

    return {
      roles,
      modelRules,
      fieldRules,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse role definition
   * role_def ::= "Roles:" newline role_item+
   */
  private parseRoleDefinition(): RoleDefinition[] {
    const roles: RoleDefinition[] = [];

    this.consume(TokenType.ROLES, 'Expected "Roles:"');
    this.consume(TokenType.COLON, 'Expected ":" after "Roles"');
    this.consumeNewline();

    // Skip blank lines
    this.skipNewlines();

    // Parse role items (allow empty)
    while (this.check(TokenType.DASH)) {
      const start = this.currentToken().start;
      this.consume(TokenType.DASH, 'Expected "-"');

      // Collect all tokens until newline for multi-word role names
      const roleNameParts: string[] = [];
      while (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
        roleNameParts.push(this.advance().value);
      }
      const roleName = roleNameParts.join(' ');

      roles.push({
        name: normalizeIdentifier(roleName),
        originalName: roleName,
        start,
        end: this.previousToken().end,
      });

      this.consumeNewline();
      this.skipNewlines();
    }

    return roles;
  }

  /**
   * Parse model rules
   * rule_def ::= "Rules for" model_name ":" newline permission_item+
   */
  private parseModelRules(): ModelRules {
    const start = this.currentToken().start;

    this.consume(TokenType.RULES, 'Expected "Rules"');
    this.consume(TokenType.FOR, 'Expected "for" after "Rules"');

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

    // Parse permission items
    const permissions: PermissionRule[] = [];
    while (this.check(TokenType.DASH)) {
      permissions.push(this.parsePermissionRule());
      this.skipNewlines();
    }

    if (permissions.length === 0) {
      throw new ParseError('Rules section must have at least one permission', start);
    }

    return {
      modelName,
      permissions,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse permission rule
   * permission_item ::= "-" subject "can" action target_spec condition? newline
   */
  private parsePermissionRule(): PermissionRule {
    const start = this.currentToken().start;

    this.consume(TokenType.DASH, 'Expected "-"');

    // Parse subject
    const subject = this.parseSubject();

    // Expect "can"
    this.consume(TokenType.CAN, 'Expected "can" after subject');

    // Parse action
    const action = this.parseAction();

    // Parse target spec
    const target = this.parseTargetSpec();

    // Parse optional condition
    let condition: WhereClause | undefined;
    if (this.check(TokenType.WHERE)) {
      condition = this.parseWhereClause();
    }

    this.consumeNewline();

    return {
      subject,
      action,
      target,
      condition,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse subject
   * subject ::= "anyone" | "authenticated users" | "users" | role_name
   */
  private parseSubject(): PermissionSubject {
    const token = this.currentToken();

    if (token.type === TokenType.ANYONE) {
      this.advance();
      return { type: SubjectType.ANYONE };
    }

    if (token.type === TokenType.AUTHENTICATED) {
      this.advance();
      this.consume(TokenType.USERS, 'Expected "users" after "authenticated"');
      return { type: SubjectType.AUTHENTICATED_USERS };
    }

    if (token.type === TokenType.USERS) {
      this.advance();
      return { type: SubjectType.USERS };
    }

    // Otherwise, it's a role name (may be pluralized)
    if (token.type === TokenType.IDENTIFIER) {
      // Collect all tokens until "can" for multi-word role names
      const roleNameParts: string[] = [];
      while (!this.check(TokenType.CAN) && !this.isAtEnd()) {
        roleNameParts.push(this.advance().value);
      }
      let roleName = roleNameParts.join(' ');

      // Strip trailing 's' for pluralized role names
      if (roleName.endsWith('s') && roleName.length > 1) {
        roleName = roleName.slice(0, -1);
      }

      return { type: SubjectType.ROLE, roleName: normalizeIdentifier(roleName) };
    }

    throw new ParseError(
      'Expected subject (anyone, authenticated users, users, or role name)',
      token.start
    );
  }

  /**
   * Parse CRUD action
   * action ::= "create" | "read" | "edit" | "update" | "delete"
   */
  private parseAction(): CRUDAction {
    const token = this.currentToken();

    if (token.type === TokenType.CREATE) {
      this.advance();
      return CRUDAction.CREATE;
    }

    if (token.type === TokenType.READ) {
      this.advance();
      return CRUDAction.READ;
    }

    if (token.type === TokenType.EDIT) {
      this.advance();
      return CRUDAction.EDIT;
    }

    if (token.type === TokenType.UPDATE) {
      this.advance();
      return CRUDAction.UPDATE;
    }

    if (token.type === TokenType.DELETE) {
      this.advance();
      return CRUDAction.DELETE;
    }

    throw new ParseError('Expected action (create, read, edit, update, delete)', token.start);
  }

  /**
   * Parse target spec
   * target_spec ::= model_reference | "own" model_reference | "any" model_reference
   */
  private parseTargetSpec(): TargetSpec {
    const start = this.currentToken().start;
    let modifier = TargetModifier.NONE;

    // Check for "own" or "any"
    if (this.check(TokenType.OWN)) {
      this.advance();
      modifier = TargetModifier.OWN;
    } else if (this.check(TokenType.ANY)) {
      this.advance();
      modifier = TargetModifier.ANY;
    }

    // Collect all tokens until WHERE/NEWLINE for multi-word model names
    const modelNameParts: string[] = [];
    while (!this.check(TokenType.WHERE) && !this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
      modelNameParts.push(this.advance().value);
    }
    let modelName = modelNameParts.join(' ');

    // Strip trailing 's' for pluralized model names
    if (modelName.endsWith('s') && modelName.length > 1) {
      modelName = modelName.slice(0, -1);
    }

    return {
      modifier,
      modelName,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse where clause (reuse condition parsing logic)
   * condition ::= "where" bool_expr ("and" bool_expr)*
   */
  private parseWhereClause(): WhereClause {
    const start = this.currentToken().start;

    this.consume(TokenType.WHERE, 'Expected "where"');

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
   * Parse condition (simplified version for AUTH - boolean expressions)
   */
  private parseCondition(): Condition {
    const start = this.currentToken().start;

    // Parse field name (until comparison operator)
    const fieldParts: string[] = [];
    const comparisonKeywords = new Set([
      TokenType.IS,
      TokenType.EQUALS,
      TokenType.MATCHES,
      TokenType.CONTAINS,
      TokenType.HAS,
      TokenType.STARTS,
      TokenType.ENDS,
    ]);

    while (!comparisonKeywords.has(this.currentToken().type) && !this.isAtEnd()) {
      const token = this.currentToken();

      if (
        token.type === TokenType.NEWLINE ||
        token.type === TokenType.AND ||
        token.type === TokenType.WHERE
      ) {
        break;
      }

      fieldParts.push(this.advance().value);
    }

    if (fieldParts.length === 0) {
      throw new ParseError('Expected field name in condition', this.currentToken().start);
    }

    const field = normalizeIdentifier(fieldParts.join(' '));

    // Parse operator
    const operator = this.parseComparisonOperator();

    // Parse value (optional for some operators)
    let value: ConditionValue | undefined;
    if (operator !== ComparisonOperator.IS_EMPTY && operator !== ComparisonOperator.IS_NOT_EMPTY) {
      value = this.parseConditionValue();
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
   * Parse comparison operator (simplified for AUTH)
   */
  private parseComparisonOperator(): ComparisonOperator {
    const token = this.currentToken();

    if (token.type === TokenType.IS) {
      this.advance();

      if (this.check(TokenType.EMPTY)) {
        this.advance();
        return ComparisonOperator.IS_EMPTY;
      } else if (this.check(TokenType.NOT)) {
        this.advance();
        this.consume(TokenType.EMPTY, 'Expected "empty" after "is not"');
        return ComparisonOperator.IS_NOT_EMPTY;
      } else if (this.check(TokenType.AFTER)) {
        this.advance();
        return ComparisonOperator.IS_AFTER;
      } else if (this.check(TokenType.BEFORE)) {
        this.advance();
        return ComparisonOperator.IS_BEFORE;
      } else if (this.check(TokenType.BETWEEN)) {
        this.advance();
        return ComparisonOperator.IS_BETWEEN;
      } else {
        return ComparisonOperator.IS;
      }
    }

    if (token.type === TokenType.EQUALS) {
      this.advance();
      return ComparisonOperator.EQUALS;
    }

    if (token.type === TokenType.MATCHES) {
      this.advance();
      return ComparisonOperator.MATCHES;
    }

    if (token.type === TokenType.CONTAINS) {
      this.advance();
      return ComparisonOperator.CONTAINS;
    }

    if (token.type === TokenType.STARTS) {
      this.advance();
      this.consume(TokenType.WITH, 'Expected "with" after "starts"');
      return ComparisonOperator.STARTS_WITH;
    }

    if (token.type === TokenType.ENDS) {
      this.advance();
      this.consume(TokenType.WITH, 'Expected "with" after "ends"');
      return ComparisonOperator.ENDS_WITH;
    }

    if (token.type === TokenType.HAS) {
      this.advance();
      // "has no" pattern
      if (this.check(TokenType.NOT)) {
        this.advance();
        return ComparisonOperator.IS_EMPTY;
      }
      return ComparisonOperator.CONTAINS;
    }

    throw new ParseError(`Expected comparison operator, got: ${token.value}`, token.start);
  }

  /**
   * Parse condition value (simplified for AUTH)
   */
  private parseConditionValue(): ConditionValue {
    const token = this.currentToken();

    // Boolean
    if (token.type === TokenType.TRUE || token.type === TokenType.FALSE) {
      this.advance();
      return {
        type: 'literal',
        value: token.type === TokenType.TRUE,
      };
    }

    // "now" keyword
    if (token.type === TokenType.NOW) {
      this.advance();
      return {
        type: 'time',
        expression: { type: 'now', start: token.start, end: token.end },
      };
    }

    // Number - could be literal or start of time expression
    if (token.type === TokenType.NUMBER) {
      const numToken = this.advance();
      const numberValue = parseInt(numToken.value, 10);

      // Check if this is a time expression (e.g., "5 days ago")
      if (
        this.check(TokenType.MINUTES) ||
        this.check(TokenType.HOURS) ||
        this.check(TokenType.DAYS) ||
        this.check(TokenType.WEEKS) ||
        this.check(TokenType.MONTHS) ||
        this.check(TokenType.YEARS)
      ) {
        const unitToken = this.advance();
        this.consume(TokenType.AGO, 'Expected "ago" after time unit');
        return {
          type: 'time',
          expression: {
            type: 'relative',
            value: numberValue,
            unit: unitToken.value as TimeUnit,
            start: numToken.start,
            end: this.previousToken().end,
          },
        };
      }

      // Otherwise, it's a literal number
      return {
        type: 'literal',
        value: numberValue,
      };
    }

    // String
    if (token.type === TokenType.STRING) {
      this.advance();
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

    // Reference (e.g., "Comments", "Posts")
    const parts: string[] = [];
    while (
      !this.check(TokenType.AND) &&
      !this.check(TokenType.NEWLINE) &&
      !this.check(TokenType.WHERE) &&
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
   * Parse field rules
   * field_rule_def ::= "Field Rules for" model_name ":" newline field_permission+
   */
  private parseFieldRules(): FieldRules {
    const start = this.currentToken().start;

    this.consume(TokenType.FIELD, 'Expected "Field"');
    this.consume(TokenType.RULES, 'Expected "Rules" after "Field"');
    this.consume(TokenType.FOR, 'Expected "for" after "Rules"');

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

    // Parse field permissions
    const permissions: FieldPermission[] = [];
    while (this.check(TokenType.DASH)) {
      permissions.push(this.parseFieldPermission());
      this.skipNewlines();
    }

    if (permissions.length === 0) {
      throw new ParseError('Field rules section must have at least one permission', start);
    }

    return {
      modelName,
      permissions,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse field permission
   * field_permission ::= "-" subject "can" field_action field_name newline
   *                    | "-" subject "cannot" field_action field_name newline
   */
  private parseFieldPermission(): FieldPermission {
    const start = this.currentToken().start;

    this.consume(TokenType.DASH, 'Expected "-"');

    // Parse subject
    const subject = this.parseSubject();

    // Check for "can" or "cannot"
    let allowed = true;
    if (this.check(TokenType.CANNOT)) {
      this.advance();
      allowed = false;
    } else {
      this.consume(TokenType.CAN, 'Expected "can" or "cannot"');
    }

    // Parse field action
    const action = this.parseFieldAction();

    // Parse field name (rest of the line until newline)
    const fieldParts: string[] = [];
    while (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
      fieldParts.push(this.advance().value);
    }

    if (fieldParts.length === 0) {
      throw new ParseError('Expected field name', this.currentToken().start);
    }

    const fieldName = normalizeIdentifier(fieldParts.join(' '));

    this.consumeNewline();

    return {
      subject,
      action,
      fieldName,
      allowed,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse field action
   * field_action ::= "edit" | "read" | "set"
   */
  private parseFieldAction(): FieldAction {
    const token = this.currentToken();

    if (token.type === TokenType.EDIT) {
      this.advance();
      return FieldAction.EDIT;
    }

    if (token.type === TokenType.READ) {
      this.advance();
      return FieldAction.READ;
    }

    // "set" is not a token, but it's a keyword in field rules
    if (token.type === TokenType.IDENTIFIER && token.value.toLowerCase() === 'set') {
      this.advance();
      return FieldAction.SET;
    }

    throw new ParseError('Expected field action (edit, read, set)', token.start);
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
      return lastToken;
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
