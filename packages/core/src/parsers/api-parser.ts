/**
 * API Parser for DeclareLang
 * Implements recursive descent parsing based on DSL Grammar Specification v0.1.0
 *
 * Grammar:
 * api_file ::= rate_limit_def? cors_def? response_def? pagination_def? query_param_def? security_def?
 * rate_limit_def ::= "Rate limit:" newline limit_item+ | "Rate limit for" model_name ":" newline limit_item+
 * limit_item ::= "-" number action "per" time_unit "per" scope newline
 */

import { Token, TokenType, Position } from '../types/token.js';
import {
  APIFile,
  APIRateLimitRule,
  RateLimitAction,
  RateLimitScope,
  RateLimitTimeUnit,
  CORSConfig,
  ResponseEnvelope,
  SuccessResponse,
  ErrorResponse,
  PaginationConfig,
  QueryParamsDefinition,
  QueryParam,
  QueryParamFilterType,
  APIVersioning,
  SecurityHeader,
  ResponseCompression,
  RequestSizeLimits,
  SortDirection,
} from '../types/ast.js';
import { normalizeIdentifier } from '../utils/identifier.js';
import { ParseError } from './ddl-parser.js';

/**
 * API Parser
 */
export class APIParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    // Filter out comments for parsing
    this.tokens = tokens.filter((t) => t.type !== TokenType.COMMENT);
  }

  /**
   * Parse API file
   */
  parse(): APIFile {
    // Handle empty file
    if (this.isAtEnd() || this.tokens.length === 0) {
      const emptyPos: Position = { line: 1, column: 1, offset: 0 };
      return {
        rateLimits: [],
        pagination: [],
        queryParams: [],
        start: emptyPos,
        end: emptyPos,
      };
    }

    const start = this.currentToken().start;
    this.skipNewlines();

    const rateLimits: APIRateLimitRule[] = [];
    const pagination: PaginationConfig[] = [];
    const queryParams: QueryParamsDefinition[] = [];

    let cors: CORSConfig | undefined;
    let responseEnvelope: ResponseEnvelope | undefined;
    let successResponse: SuccessResponse | undefined;
    let errorResponse: ErrorResponse | undefined;
    let versioning: APIVersioning | undefined;
    let securityHeaders: SecurityHeader[] | undefined;
    let compression: ResponseCompression | undefined;
    let sizeLimits: RequestSizeLimits | undefined;

    while (!this.isAtEnd()) {
      const token = this.currentToken();

      if (token.type === TokenType.RATE) {
        rateLimits.push(...this.parseRateLimitSection());
      } else if (token.type === TokenType.CORS) {
        cors = this.parseCORSSection();
      } else if (
        token.type === TokenType.IDENTIFIER &&
        token.value.toLowerCase().startsWith('response')
      ) {
        const next = this.peek();
        if (next && next.value.toLowerCase() === 'envelope') {
          responseEnvelope = this.parseResponseEnvelopeSection();
        } else if (next && next.value.toLowerCase() === 'compression') {
          compression = this.parseResponseCompressionSection();
        }
      } else if (token.type === TokenType.IDENTIFIER && token.value.toLowerCase() === 'success') {
        successResponse = this.parseSuccessResponseSection();
      } else if (token.type === TokenType.IDENTIFIER && token.value.toLowerCase() === 'error') {
        errorResponse = this.parseErrorResponseSection();
      } else if (token.type === TokenType.PAGINATION) {
        pagination.push(...this.parsePaginationSection());
      } else if (token.type === TokenType.QUERY) {
        queryParams.push(this.parseQueryParamsSection());
      } else if (token.type === TokenType.IDENTIFIER && token.value.toLowerCase() === 'api') {
        versioning = this.parseAPIVersioningSection();
      } else if (token.type === TokenType.SECURITY) {
        securityHeaders = this.parseSecurityHeadersSection();
      } else if (token.type === TokenType.IDENTIFIER && token.value.toLowerCase() === 'request') {
        sizeLimits = this.parseRequestSizeLimitsSection();
      } else {
        // Skip unknown section
        this.advance();
      }

      this.skipNewlines();
    }

    const end = this.current > 0 ? this.previousToken().end : start;

    return {
      rateLimits,
      cors,
      responseEnvelope,
      successResponse,
      errorResponse,
      pagination,
      queryParams,
      versioning,
      securityHeaders,
      compression,
      sizeLimits,
      start,
      end,
    };
  }

  /**
   * Parse rate limit section
   */
  private parseRateLimitSection(): APIRateLimitRule[] {
    const rules: APIRateLimitRule[] = [];
    this.consume(TokenType.RATE, 'Expected "Rate"');

    let modelName: string | undefined;

    if (this.check(TokenType.LIMIT)) {
      this.advance(); // consume "limit"

      // Check for "for Model:"
      if (this.check(TokenType.FOR)) {
        this.advance();
        // Collect model name
        const modelParts: string[] = [];
        while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
          modelParts.push(this.advance().value);
        }
        modelName = modelParts.join(' ');
      }

      this.consume(TokenType.COLON, 'Expected ":"');
      this.consumeNewline();
      this.skipNewlines();

      // Parse limit items
      while (this.check(TokenType.DASH)) {
        rules.push(this.parseRateLimitItem(modelName));
        this.skipNewlines();
      }
    }

    return rules;
  }

  /**
   * Parse single rate limit item
   */
  private parseRateLimitItem(modelName?: string): APIRateLimitRule {
    const start = this.currentToken().start;
    this.consume(TokenType.DASH, 'Expected "-"');

    // Parse count
    const count = parseInt(this.consume(TokenType.NUMBER, 'Expected number').value, 10);

    // Parse action
    const actionToken = this.advance();
    const action = this.mapRateLimitAction(actionToken.value.toLowerCase());

    // Consume "per"
    this.consume(TokenType.PER, 'Expected "per"');

    // Parse time unit
    const timeToken = this.advance();
    const timeUnit = this.mapTimeUnit(timeToken.value.toLowerCase());

    // Consume "per"
    this.consume(TokenType.PER, 'Expected "per"');

    // Parse scope (may be multi-word like "ip address")
    const scopeParts: string[] = [];
    while (!this.check(TokenType.NEWLINE) && !this.isAtEnd() && scopeParts.length < 3) {
      scopeParts.push(this.advance().value.toLowerCase());
    }
    const scope = this.mapScope(scopeParts.join(' '));

    return {
      modelName,
      count,
      action,
      timeUnit,
      scope,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse CORS section
   */
  private parseCORSSection(): CORSConfig {
    const start = this.currentToken().start;

    // Skip "CORS:"
    while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
      this.advance();
    }
    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewline();
    this.skipNewlines();

    let allowOrigins: string[] | undefined;
    let allowMethods: string[] | undefined;
    let allowHeaders: string[] | undefined;
    let allowCredentials: boolean | undefined;
    let maxAge: number | undefined;

    while (this.check(TokenType.DASH)) {
      this.advance(); // consume dash

      const line = this.collectLine();
      const lowerLine = line.toLowerCase();

      if (lowerLine.startsWith('allow origins:')) {
        allowOrigins = this.parseListAfterColon(line);
      } else if (lowerLine.startsWith('allow methods:')) {
        allowMethods = this.parseListAfterColon(line);
      } else if (lowerLine.startsWith('allow headers:')) {
        allowHeaders = this.parseListAfterColon(line);
      } else if (lowerLine.startsWith('allow credentials:')) {
        allowCredentials = lowerLine.includes('true');
      } else if (lowerLine.startsWith('max age:')) {
        const match = line.match(/(\d+)/);
        if (match && match[1]) maxAge = parseInt(match[1], 10);
      }

      this.skipNewlines();
    }

    return {
      allowOrigins,
      allowMethods,
      allowHeaders,
      allowCredentials,
      maxAge,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse Response envelope section
   */
  private parseResponseEnvelopeSection(): ResponseEnvelope {
    const start = this.currentToken().start;

    // Skip "Response envelope:"
    while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
      this.advance();
    }
    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewline();
    this.skipNewlines();

    let dataField: string | undefined;
    let metaField: string | undefined;
    let errorsField: string | undefined;

    while (this.check(TokenType.DASH)) {
      this.advance();
      const line = this.collectLine().toLowerCase();

      if (line.includes('data contains')) {
        dataField = 'data';
      } else if (line.includes('meta contains')) {
        metaField = 'meta';
      } else if (line.includes('errors contains')) {
        errorsField = 'errors';
      }

      this.skipNewlines();
    }

    return { dataField, metaField, errorsField, start, end: this.previousToken().end };
  }

  /**
   * Parse Success response section
   */
  private parseSuccessResponseSection(): SuccessResponse {
    const start = this.currentToken().start;

    // Skip "Success response:"
    while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
      this.advance();
    }
    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewline();
    this.skipNewlines();

    let includeStatusCode = false;
    let includeData = false;
    let includeMeta = false;
    const metaFields: string[] = [];

    while (this.check(TokenType.DASH)) {
      this.advance();
      const line = this.collectLine().toLowerCase();

      if (line.includes('status code')) {
        includeStatusCode = true;
      }
      if (line.includes('data')) {
        includeData = true;
      }
      if (line.includes('meta')) {
        includeMeta = true;
        if (line.includes('with')) {
          // Extract fields mentioned
          if (line.includes('request id')) metaFields.push('request_id');
          if (line.includes('timestamp')) metaFields.push('timestamp');
          if (line.includes('pagination')) metaFields.push('pagination');
        }
      }

      this.skipNewlines();
    }

    return {
      includeStatusCode,
      includeData,
      includeMeta,
      metaFields: metaFields.length > 0 ? metaFields : undefined,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse Error response section
   */
  private parseErrorResponseSection(): ErrorResponse {
    const start = this.currentToken().start;

    // Skip "Error response:"
    while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
      this.advance();
    }
    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewline();
    this.skipNewlines();

    let includeStatusCode = false;
    let includeError = false;
    const errorFields: string[] = [];
    let includeFields = false;

    while (this.check(TokenType.DASH)) {
      this.advance();
      const line = this.collectLine().toLowerCase();

      if (line.includes('status code')) {
        includeStatusCode = true;
      }
      if (line.includes('error')) {
        includeError = true;
        if (line.includes('code')) errorFields.push('code');
        if (line.includes('message')) errorFields.push('message');
        if (line.includes('details')) errorFields.push('details');
      }
      if (line.includes('fields') && line.includes('validation')) {
        includeFields = true;
      }

      this.skipNewlines();
    }

    return {
      includeStatusCode,
      includeError,
      errorFields: errorFields.length > 0 ? errorFields : undefined,
      includeFields,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse Pagination section
   */
  private parsePaginationSection(): PaginationConfig[] {
    const configs: PaginationConfig[] = [];
    const start = this.currentToken().start;

    // Skip "Pagination" and check for "for Model:"
    this.advance(); // Pagination

    let modelName: string | undefined;
    if (this.check(TokenType.FOR)) {
      this.advance();
      const modelParts: string[] = [];
      while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
        modelParts.push(this.advance().value);
      }
      modelName = modelParts.join(' ');
    }

    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewline();
    this.skipNewlines();

    let defaultLimit: number | undefined;
    let maxLimit: number | undefined;
    let defaultSort: { field: string; direction: SortDirection } | undefined;
    const allowedSortFields: string[] = [];

    while (this.check(TokenType.DASH)) {
      this.advance();
      const line = this.collectLine();
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('default limit:')) {
        const match = line.match(/(\d+)/);
        if (match && match[1]) defaultLimit = parseInt(match[1], 10);
      } else if (lowerLine.includes('max limit:')) {
        const match = line.match(/(\d+)/);
        if (match && match[1]) maxLimit = parseInt(match[1], 10);
      } else if (lowerLine.includes('default sort:')) {
        const sortPart = line.split(':')[1]?.trim();
        if (sortPart) {
          const parts = sortPart.split(/\s+/);
          if (parts.length >= 2) {
            const field = normalizeIdentifier(parts.slice(0, -1).join(' '));
            const direction =
              parts[parts.length - 1]?.toLowerCase() === 'descending'
                ? SortDirection.DESCENDING
                : SortDirection.ASCENDING;
            defaultSort = { field, direction };
          }
        }
      } else if (lowerLine.includes('allowed sort fields:')) {
        const fieldsStr = line.split(':')[1]?.trim() || '';
        const fields = fieldsStr.split(',').map((f) => normalizeIdentifier(f.trim()));
        allowedSortFields.push(...fields);
      }

      this.skipNewlines();
    }

    configs.push({
      modelName,
      defaultLimit,
      maxLimit,
      defaultSort,
      allowedSortFields: allowedSortFields.length > 0 ? allowedSortFields : undefined,
      start,
      end: this.previousToken().end,
    });

    return configs;
  }

  /**
   * Parse Query parameters section
   */
  private parseQueryParamsSection(): QueryParamsDefinition {
    const start = this.currentToken().start;

    this.consume(TokenType.QUERY, 'Expected "Query"');

    // Skip "parameters for"
    while (!this.check(TokenType.FOR) && !this.isAtEnd()) {
      this.advance();
    }
    this.consume(TokenType.FOR, 'Expected "for"');

    // Collect model name
    const modelParts: string[] = [];
    while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
      modelParts.push(this.advance().value);
    }
    const modelName = modelParts.join(' ');

    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewline();
    this.skipNewlines();

    const params: QueryParam[] = [];

    while (this.check(TokenType.DASH)) {
      params.push(this.parseQueryParam());
      this.skipNewlines();
    }

    return {
      modelName,
      params,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse single query parameter
   * v0.1.0 syntax: field as type [operation]
   */
  private parseQueryParam(): QueryParam {
    const start = this.currentToken().start;
    this.consume(TokenType.DASH, 'Expected "-"');

    // Collect field name until "as"
    const fieldParts: string[] = [];
    while (!this.check(TokenType.AS) && !this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      fieldParts.push(this.advance().value);
    }

    const originalField = fieldParts.join(' ');
    const field = normalizeIdentifier(originalField);

    // Require "as" keyword (v0.1.0 syntax)
    this.consume(TokenType.AS, 'Expected "as" after field name');

    // Collect filter type (rest of line)
    const filterParts: string[] = [];
    while (!this.check(TokenType.NEWLINE) && !this.isAtEnd() && filterParts.length < 5) {
      filterParts.push(this.advance().value.toLowerCase());
    }

    const filterType = this.mapFilterType(filterParts.join(' '));

    return {
      field,
      originalField,
      filterType,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse API versioning section
   */
  private parseAPIVersioningSection(): APIVersioning {
    const start = this.currentToken().start;

    // Skip "API versioning:"
    while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
      this.advance();
    }
    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewline();
    this.skipNewlines();

    let versionFormat: string | undefined;
    let header: string | undefined;
    let defaultVersion: string | undefined;

    while (this.check(TokenType.DASH)) {
      this.advance();
      const line = this.collectLine();
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('version format:')) {
        versionFormat = line.split(':')[1]?.trim();
      } else if (lowerLine.includes('header:')) {
        // Header names should preserve dashes (convert underscores back to dashes)
        header = line.split(':')[1]?.trim().replace(/_/g, '-');
      } else if (lowerLine.includes('default version:')) {
        defaultVersion = line.split(':')[1]?.trim();
      }

      this.skipNewlines();
    }

    return { versionFormat, header, defaultVersion, start, end: this.previousToken().end };
  }

  /**
   * Parse Security headers section
   */
  private parseSecurityHeadersSection(): SecurityHeader[] {
    const headers: SecurityHeader[] = [];

    // Skip "Security headers:"
    while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
      this.advance();
    }
    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewline();
    this.skipNewlines();

    while (this.check(TokenType.DASH)) {
      const start = this.currentToken().start;
      this.advance();

      const line = this.collectLine();
      const parts = line.split(':');
      if (parts.length >= 2 && parts[0]) {
        // Header names should preserve dashes (convert underscores back to dashes)
        const name = parts[0].trim().replace(/_/g, '-');
        const value = parts.slice(1).join(':').trim();
        headers.push({ name, value, start, end: this.previousToken().end });
      }

      this.skipNewlines();
    }

    return headers;
  }

  /**
   * Parse Response compression section
   */
  private parseResponseCompressionSection(): ResponseCompression {
    const start = this.currentToken().start;

    // Skip "Response compression:"
    while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
      this.advance();
    }
    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewline();
    this.skipNewlines();

    let enabled: boolean | undefined;
    let minSize: number | undefined;
    const formats: string[] = [];

    while (this.check(TokenType.DASH)) {
      this.advance();
      const line = this.collectLine();
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('enable')) {
        enabled = true;
        const match = line.match(/(\d+)/);
        if (match && match[1]) minSize = parseInt(match[1], 10);
      } else if (lowerLine.includes('supported formats:')) {
        const formatsStr = line.split(':')[1]?.trim() || '';
        formats.push(...formatsStr.split(',').map((f) => f.trim()));
      }

      this.skipNewlines();
    }

    return {
      enabled,
      minSize,
      formats: formats.length > 0 ? formats : undefined,
      start,
      end: this.previousToken().end,
    };
  }

  /**
   * Parse Request size limits section
   */
  private parseRequestSizeLimitsSection(): RequestSizeLimits {
    const start = this.currentToken().start;

    // Skip "Request size limits:"
    while (!this.check(TokenType.COLON) && !this.isAtEnd()) {
      this.advance();
    }
    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewline();
    this.skipNewlines();

    let maxBodySize: number | undefined;
    let maxFileUpload: number | undefined;
    let maxQueryParams: number | undefined;

    while (this.check(TokenType.DASH)) {
      this.advance();
      const line = this.collectLine();
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('max body size:')) {
        const match = line.match(/(\d+)/);
        if (match && match[1]) maxBodySize = parseInt(match[1], 10);
      } else if (lowerLine.includes('max file upload:')) {
        const match = line.match(/(\d+)/);
        if (match && match[1]) maxFileUpload = parseInt(match[1], 10);
      } else if (lowerLine.includes('max query params:')) {
        const match = line.match(/(\d+)/);
        if (match && match[1]) maxQueryParams = parseInt(match[1], 10);
      }

      this.skipNewlines();
    }

    return { maxBodySize, maxFileUpload, maxQueryParams, start, end: this.previousToken().end };
  }

  // Helper methods

  private collectLine(): string {
    const parts: string[] = [];
    while (!this.check(TokenType.NEWLINE) && !this.isAtEnd() && parts.length < 50) {
      const token = this.advance();
      // Preserve dashes and colons without spaces for things like header names and URLs
      if (token.type === TokenType.DASH || token.type === TokenType.COLON) {
        // Remove space before dash/colon if it's the last character added
        const lastPart = parts[parts.length - 1];
        if (parts.length > 0 && lastPart && lastPart.endsWith(' ')) {
          parts[parts.length - 1] = lastPart.slice(0, -1);
        }
        parts.push(token.value);
        // Don't add space after dash/colon
        continue;
      }
      parts.push(token.value + ' ');
    }
    return parts.join('').trim();
  }

  private parseListAfterColon(line: string): string[] {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return [];
    const listStr = line.substring(colonIndex + 1).trim();
    return listStr.split(',').map((item) => item.trim());
  }

  private mapRateLimitAction(action: string): RateLimitAction {
    switch (action) {
      case 'requests':
        return RateLimitAction.REQUESTS;
      case 'creates':
        return RateLimitAction.CREATES;
      case 'updates':
        return RateLimitAction.UPDATES;
      case 'deletes':
        return RateLimitAction.DELETES;
      case 'reads':
        return RateLimitAction.READS;
      case 'signups':
        return RateLimitAction.SIGNUPS;
      case 'logins':
        return RateLimitAction.LOGINS;
      default:
        return RateLimitAction.REQUESTS;
    }
  }

  private mapTimeUnit(unit: string): RateLimitTimeUnit {
    if (unit === 'minute') return RateLimitTimeUnit.MINUTE;
    if (unit === 'hour') return RateLimitTimeUnit.HOUR;
    if (unit === 'day') return RateLimitTimeUnit.DAY;
    return RateLimitTimeUnit.MINUTE;
  }

  private mapScope(scope: string): RateLimitScope {
    if (scope === 'user') return RateLimitScope.USER;
    if (scope.includes('ip')) return RateLimitScope.IP_ADDRESS;
    if (scope.includes('api')) return RateLimitScope.API_KEY;
    return RateLimitScope.USER;
  }

  private mapFilterType(filterStr: string): QueryParamFilterType {
    if (filterStr === 'boolean') return QueryParamFilterType.BOOLEAN;
    if (filterStr === 'number') return QueryParamFilterType.NUMBER;
    if (filterStr === 'text') return QueryParamFilterType.TEXT;
    if (filterStr.includes('date') && filterStr.includes('range'))
      return QueryParamFilterType.DATE_RANGE;
    if (filterStr.includes('number') && filterStr.includes('range'))
      return QueryParamFilterType.NUMBER_RANGE;
    if (filterStr.includes('text') && filterStr.includes('contains'))
      return QueryParamFilterType.TEXT_CONTAINS;
    if (filterStr.includes('text') && filterStr.includes('starts'))
      return QueryParamFilterType.TEXT_STARTS_WITH;
    if (filterStr.includes('text') && filterStr.includes('ends'))
      return QueryParamFilterType.TEXT_ENDS_WITH;

    return QueryParamFilterType.TEXT;
  }

  private peek(): Token | undefined {
    if (this.current + 1 < this.tokens.length) {
      return this.tokens[this.current + 1];
    }
    return undefined;
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.currentToken().type === TokenType.EOF;
  }

  private currentToken(): Token {
    const token = this.tokens[this.current];
    if (token) return token;
    const lastToken = this.tokens[this.tokens.length - 1];
    if (lastToken) return lastToken;
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
