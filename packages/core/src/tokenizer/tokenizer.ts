/**
 * Tokenizer for DeclareLang DSL
 * Implements lexical analysis based on DSL Grammar Specification v0.1.0
 *
 * Key features:
 * - Case-insensitive keyword matching
 * - Identifier normalization (spaces/hyphens → underscores)
 * - Position tracking for error reporting
 * - Comment support
 */

import { Token, TokenType, Position, TokenizerError } from '../types/token.js';

/**
 * Keyword map (lowercase for case-insensitive matching)
 */
const KEYWORDS: Record<string, TokenType> = {
  // Model/Entity
  has: TokenType.HAS,
  as: TokenType.AS,
  many: TokenType.MANY,
  belongs: TokenType.BELONGS,
  to: TokenType.TO,

  // Query/Data
  query: TokenType.QUERY,
  for: TokenType.FOR,
  where: TokenType.WHERE,
  and: TokenType.AND,
  or: TokenType.OR,
  sorted: TokenType.SORTED,
  by: TokenType.BY,
  limited: TokenType.LIMITED,
  ascending: TokenType.ASCENDING,
  descending: TokenType.DESCENDING,
  asc: TokenType.ASC,
  desc: TokenType.DESC,

  // Mutation
  mutation: TokenType.MUTATION,
  sets: TokenType.SETS,
  increases: TokenType.INCREASES,

  // Computed
  computed: TokenType.COMPUTED,
  counts: TokenType.COUNTS,
  sums: TokenType.SUMS,
  returns: TokenType.RETURNS,
  calculates: TokenType.CALCULATES,
  from: TokenType.FROM,

  // Authorization
  roles: TokenType.ROLES,
  rules: TokenType.RULES,
  field: TokenType.FIELD,
  can: TokenType.CAN,
  cannot: TokenType.CANNOT,
  create: TokenType.CREATE,
  read: TokenType.READ,
  edit: TokenType.EDIT,
  update: TokenType.UPDATE,
  delete: TokenType.DELETE,
  own: TokenType.OWN,
  any: TokenType.ANY,
  anyone: TokenType.ANYONE,
  authenticated: TokenType.AUTHENTICATED,
  users: TokenType.USERS,

  // Validation
  validate: TokenType.VALIDATE,
  must: TokenType.MUST,
  be: TokenType.BE,
  between: TokenType.BETWEEN,
  at: TokenType.AT,
  least: TokenType.LEAST,
  most: TokenType.MOST,
  contain: TokenType.CONTAIN,
  not: TokenType.NOT,
  match: TokenType.MATCH,
  exist: TokenType.EXIST,
  when: TokenType.WHEN,
  empty: TokenType.EMPTY,

  // API
  rate: TokenType.RATE,
  limit: TokenType.LIMIT,
  per: TokenType.PER,
  cors: TokenType.CORS,
  allow: TokenType.ALLOW,
  origins: TokenType.ORIGINS,
  methods: TokenType.METHODS,
  headers: TokenType.HEADERS,
  credentials: TokenType.CREDENTIALS,
  max: TokenType.MAX,
  age: TokenType.AGE,
  pagination: TokenType.PAGINATION,
  default: TokenType.DEFAULT,
  parameters: TokenType.PARAMETERS,

  // Monitoring
  track: TokenType.TRACK,
  alert: TokenType.ALERT,
  monitor: TokenType.MONITOR,
  dashboard: TokenType.DASHBOARD,

  // Logging
  log: TokenType.LOG,
  audit: TokenType.AUDIT,
  level: TokenType.LEVEL,
  exclude: TokenType.EXCLUDE,
  with: TokenType.WITH,
  who: TokenType.WHO,
  full: TokenType.FULL,
  data: TokenType.DATA,
  changed: TokenType.CHANGED,
  fields: TokenType.FIELDS,
  only: TokenType.ONLY,

  // Seeding
  seed: TokenType.SEED,
  random: TokenType.RANDOM,

  // Security
  constraints: TokenType.CONSTRAINTS,
  enforce: TokenType.ENFORCE,
  password: TokenType.PASSWORD,
  protection: TokenType.PROTECTION,
  security: TokenType.SECURITY,
  all: TokenType.ALL,
  hashed: TokenType.HASHED,
  bcrypt: TokenType.BCRYPT,
  minimum: TokenType.MINIMUM,
  rounds: TokenType.ROUNDS,
  use: TokenType.USE,
  parameterized: TokenType.PARAMETERIZED,
  statements: TokenType.STATEMENTS,
  have: TokenType.HAVE,
  indexes: TokenType.INDEXES,
  soft: TokenType.SOFT,
  deletes: TokenType.DELETES,
  validated: TokenType.VALIDATED,

  // Data types
  text: TokenType.TEXT,
  long: TokenType.LONG,
  number: TokenType.NUMBER_TYPE,
  decimal: TokenType.DECIMAL,
  boolean: TokenType.BOOLEAN_TYPE,
  timestamp: TokenType.TIMESTAMP,
  json: TokenType.JSON,
  uuid: TokenType.UUID,

  // Constraints
  unique: TokenType.UNIQUE,
  required: TokenType.REQUIRED,
  indexed: TokenType.INDEXED,

  // Comparison
  is: TokenType.IS,
  equals: TokenType.EQUALS,
  matches: TokenType.MATCHES,
  contains: TokenType.CONTAINS,
  after: TokenType.AFTER,
  before: TokenType.BEFORE,
  starts: TokenType.STARTS,
  ends: TokenType.ENDS,

  // Time units
  minute: TokenType.MINUTE,
  minutes: TokenType.MINUTES,
  hour: TokenType.HOUR,
  hours: TokenType.HOURS,
  day: TokenType.DAY,
  days: TokenType.DAYS,
  week: TokenType.WEEK,
  weeks: TokenType.WEEKS,
  month: TokenType.MONTH,
  months: TokenType.MONTHS,
  year: TokenType.YEAR,
  years: TokenType.YEARS,
  ago: TokenType.AGO,
  now: TokenType.NOW,

  // Boolean values
  true: TokenType.TRUE,
  false: TokenType.FALSE,
};

/**
 * Tokenizer for DeclareLang DSL
 */
export class Tokenizer {
  private input: string;
  private position = 0;
  private line = 1;
  private column = 1;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Tokenize the entire input
   */
  tokenize(): Token[] {
    this.tokens = [];

    while (!this.isAtEnd()) {
      this.skipWhitespace();
      if (this.isAtEnd()) break;

      const token = this.nextToken();
      if (token) {
        this.tokens.push(token);
      }
    }

    // Add EOF token
    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      start: this.currentPosition(),
      end: this.currentPosition(),
    });

    return this.tokens;
  }

  /**
   * Get next token
   */
  private nextToken(): Token | null {
    const start = this.currentPosition();
    const char = this.peek();

    // Comments
    if (char === '#') {
      return this.readComment(start);
    }

    // Newlines (significant in DSL)
    if (char === '\n') {
      this.advance();
      this.line++;
      this.column = 1;
      return {
        type: TokenType.NEWLINE,
        value: '\n',
        start,
        end: this.currentPosition(),
      };
    }

    // String literals
    if (char === '"' || char === "'") {
      return this.readString(start, char);
    }

    // Numbers
    if (this.isDigit(char)) {
      return this.readNumber(start);
    }

    // Symbols
    switch (char) {
      case ':':
        this.advance();
        return this.makeToken(TokenType.COLON, ':', start);
      case ',':
        this.advance();
        return this.makeToken(TokenType.COMMA, ',', start);
      case '.':
        this.advance();
        return this.makeToken(TokenType.DOT, '.', start);
      case '-':
        this.advance();
        return this.makeToken(TokenType.DASH, '-', start);
      case '(':
        this.advance();
        return this.makeToken(TokenType.LPAREN, '(', start);
      case ')':
        this.advance();
        return this.makeToken(TokenType.RPAREN, ')', start);
      case '[':
        this.advance();
        return this.makeToken(TokenType.LBRACKET, '[', start);
      case ']':
        this.advance();
        return this.makeToken(TokenType.RBRACKET, ']', start);
      case '|':
        this.advance();
        return this.makeToken(TokenType.PIPE, '|', start);
      case '/':
        this.advance();
        return this.makeToken(TokenType.IDENTIFIER, '/', start);
      case ';':
        this.advance();
        return this.makeToken(TokenType.IDENTIFIER, ';', start);
      case '=':
        this.advance();
        return this.makeToken(TokenType.IDENTIFIER, '=', start);
    }

    // Identifiers and keywords
    if (this.isLetter(char)) {
      return this.readIdentifierOrKeyword(start);
    }

    throw new TokenizerError(`Unexpected character: '${char}'`, this.currentPosition());
  }

  /**
   * Read comment
   */
  private readComment(start: Position): Token {
    let value = '';
    while (!this.isAtEnd() && this.peek() !== '\n') {
      value += this.advance();
    }
    return this.makeToken(TokenType.COMMENT, value, start);
  }

  /**
   * Read string literal
   */
  private readString(start: Position, quote: string): Token {
    let value = '';
    this.advance(); // consume opening quote

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        if (!this.isAtEnd()) {
          const escaped = this.advance();
          // Handle escape sequences
          switch (escaped) {
            case 'n':
              value += '\n';
              break;
            case 't':
              value += '\t';
              break;
            case 'r':
              value += '\r';
              break;
            case '\\':
              value += '\\';
              break;
            case quote:
              value += quote;
              break;
            default:
              value += escaped;
          }
        }
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new TokenizerError('Unterminated string', start);
    }

    this.advance(); // consume closing quote
    return this.makeToken(TokenType.STRING, value, start);
  }

  /**
   * Read number
   */
  private readNumber(start: Position): Token {
    let value = '';

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Handle decimals
    if (!this.isAtEnd() && this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // consume '.'
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    return this.makeToken(TokenType.NUMBER, value, start);
  }

  /**
   * Read identifier or keyword
   * Reads a single word, checking for multi-word keywords
   */
  private readIdentifierOrKeyword(start: Position): Token {
    let value = '';

    // Read word (letters, digits, underscores, hyphens)
    while (
      !this.isAtEnd() &&
      (this.isLetter(this.peek()) ||
        this.isDigit(this.peek()) ||
        this.peek() === '_' ||
        this.peek() === '-')
    ) {
      const char = this.advance();
      // Normalize hyphens to underscores
      value += char === '-' ? '_' : char;
    }

    // Check for multi-word keywords (like "belongs to", "has many", "long text", etc.)
    if (this.peek() === ' ' && this.isLetter(this.peekNext())) {
      const savedPos = this.position;
      const savedLine = this.line;
      const savedCol = this.column;

      this.advance(); // consume space

      // Peek ahead to read next word
      let nextWord = '';
      let tempPos = this.position;
      while (tempPos < this.input.length) {
        const char = this.input[tempPos];
        if (
          !char ||
          (!this.isLetter(char) && !this.isDigit(char) && char !== '_' && char !== '-')
        ) {
          break;
        }
        nextWord += char;
        tempPos++;
      }

      // Check if combination is a keyword
      const combined = value.toLowerCase() + ' ' + nextWord.toLowerCase();
      const multiWordKeyword = KEYWORDS[combined];

      if (multiWordKeyword) {
        // Consume the next word
        for (let i = 0; i < nextWord.length; i++) {
          this.advance();
        }
        return this.makeToken(multiWordKeyword, value + ' ' + nextWord, start);
      }

      // Not a multi-word keyword, restore position
      this.position = savedPos;
      this.line = savedLine;
      this.column = savedCol;
    }

    // Check if single word is a keyword
    const keywordType = KEYWORDS[value.toLowerCase()];
    if (keywordType) {
      return this.makeToken(keywordType, value, start);
    }

    // Check max length (63 characters)
    if (value.length > 63) {
      throw new TokenizerError(
        `Identifier exceeds maximum length of 63 characters: '${value}'`,
        start
      );
    }

    // Return as identifier
    return this.makeToken(TokenType.IDENTIFIER, value, start);
  }

  /**
   * Skip whitespace (except newlines which are significant)
   */
  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else {
        break;
      }
    }
  }

  /**
   * Character test helpers
   */
  private isLetter(char: string): boolean {
    return /[a-zA-Z]/.test(char);
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  /**
   * Position and navigation helpers
   */
  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.input.charAt(this.position);
  }

  private peekNext(): string {
    if (this.position + 1 >= this.input.length) return '\0';
    return this.input.charAt(this.position + 1);
  }

  private advance(): string {
    const char = this.input.charAt(this.position);
    this.position++;
    this.column++;
    return char;
  }

  private currentPosition(): Position {
    return {
      line: this.line,
      column: this.column,
      offset: this.position,
    };
  }

  private makeToken(type: TokenType, value: string, start: Position): Token {
    return {
      type,
      value,
      start,
      end: this.currentPosition(),
    };
  }
}
