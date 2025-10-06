/**
 * Token types for DeclareLang DSL
 * Based on DSL Grammar Specification v0.1.0
 */

export enum TokenType {
  // Literals
  IDENTIFIER = 'IDENTIFIER',
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',

  // Keywords - Model/Entity related
  HAS = 'HAS',
  AS = 'AS',
  MANY = 'MANY',
  BELONGS = 'BELONGS',
  TO = 'TO',

  // Keywords - Query/Data related
  QUERY = 'QUERY',
  FOR = 'FOR',
  WHERE = 'WHERE',
  AND = 'AND',
  OR = 'OR',
  SORTED = 'SORTED',
  BY = 'BY',
  LIMITED = 'LIMITED',
  ASCENDING = 'ASCENDING',
  DESCENDING = 'DESCENDING',
  ASC = 'ASC',
  DESC = 'DESC',

  // Keywords - Mutation related
  MUTATION = 'MUTATION',
  SETS = 'SETS',
  INCREASES = 'INCREASES',

  // Keywords - Computed fields
  COMPUTED = 'COMPUTED',
  COUNTS = 'COUNTS',
  SUMS = 'SUMS',
  RETURNS = 'RETURNS',
  CALCULATES = 'CALCULATES',
  FROM = 'FROM',

  // Keywords - Authorization
  ROLES = 'ROLES',
  RULES = 'RULES',
  FIELD = 'FIELD',
  CAN = 'CAN',
  CANNOT = 'CANNOT',
  CREATE = 'CREATE',
  READ = 'READ',
  EDIT = 'EDIT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  OWN = 'OWN',
  ANY = 'ANY',
  ANYONE = 'ANYONE',
  AUTHENTICATED = 'AUTHENTICATED',
  USERS = 'USERS',

  // Keywords - Validation
  VALIDATE = 'VALIDATE',
  MUST = 'MUST',
  BE = 'BE',
  BETWEEN = 'BETWEEN',
  AT = 'AT',
  LEAST = 'LEAST',
  MOST = 'MOST',
  CONTAIN = 'CONTAIN',
  NOT = 'NOT',
  MATCH = 'MATCH',
  EXIST = 'EXIST',
  WHEN = 'WHEN',
  EMPTY = 'EMPTY',

  // Keywords - API
  RATE = 'RATE',
  LIMIT = 'LIMIT',
  PER = 'PER',
  CORS = 'CORS',
  ALLOW = 'ALLOW',
  ORIGINS = 'ORIGINS',
  METHODS = 'METHODS',
  HEADERS = 'HEADERS',
  CREDENTIALS = 'CREDENTIALS',
  MAX = 'MAX',
  AGE = 'AGE',
  PAGINATION = 'PAGINATION',
  DEFAULT = 'DEFAULT',
  PARAMETERS = 'PARAMETERS',

  // Keywords - Monitoring
  TRACK = 'TRACK',
  ALERT = 'ALERT',
  MONITOR = 'MONITOR',
  DASHBOARD = 'DASHBOARD',

  // Keywords - Logging
  LOG = 'LOG',
  AUDIT = 'AUDIT',
  LEVEL = 'LEVEL',
  EXCLUDE = 'EXCLUDE',
  WITH = 'WITH',
  WHO = 'WHO',
  FULL = 'FULL',
  DATA = 'DATA',
  CHANGED = 'CHANGED',
  FIELDS = 'FIELDS',
  ONLY = 'ONLY',
  MUTATIONS = 'MUTATIONS',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',

  // Keywords - Seeding
  SEED = 'SEED',
  RANDOM = 'RANDOM',

  // Keywords - Security
  CONSTRAINTS = 'CONSTRAINTS',
  ENFORCE = 'ENFORCE',
  PASSWORD = 'PASSWORD',
  PROTECTION = 'PROTECTION',
  SECURITY = 'SECURITY',
  ALL = 'ALL',
  HASHED = 'HASHED',
  BCRYPT = 'BCRYPT',
  MINIMUM = 'MINIMUM',
  ROUNDS = 'ROUNDS',
  USE = 'USE',
  PARAMETERIZED = 'PARAMETERIZED',
  STATEMENTS = 'STATEMENTS',
  HAVE = 'HAVE',
  INDEXES = 'INDEXES',
  SOFT = 'SOFT',
  DELETES = 'DELETES',
  VALIDATED = 'VALIDATED',

  // Data types
  TEXT = 'TEXT',
  LONG = 'LONG',
  NUMBER_TYPE = 'NUMBER_TYPE',
  DECIMAL = 'DECIMAL',
  BOOLEAN_TYPE = 'BOOLEAN_TYPE',
  TIMESTAMP = 'TIMESTAMP',
  JSON = 'JSON',
  UUID = 'UUID',

  // Constraints
  UNIQUE = 'UNIQUE',
  REQUIRED = 'REQUIRED',
  INDEXED = 'INDEXED',

  // Comparison operators
  IS = 'IS',
  EQUALS = 'EQUALS',
  MATCHES = 'MATCHES',
  CONTAINS = 'CONTAINS',
  AFTER = 'AFTER',
  BEFORE = 'BEFORE',
  STARTS = 'STARTS',
  ENDS = 'ENDS',

  // Time units
  MINUTE = 'MINUTE',
  MINUTES = 'MINUTES',
  HOUR = 'HOUR',
  HOURS = 'HOURS',
  DAY = 'DAY',
  DAYS = 'DAYS',
  WEEK = 'WEEK',
  WEEKS = 'WEEKS',
  MONTH = 'MONTH',
  MONTHS = 'MONTHS',
  YEAR = 'YEAR',
  YEARS = 'YEARS',
  AGO = 'AGO',
  NOW = 'NOW',

  // Special values
  TRUE = 'TRUE',
  FALSE = 'FALSE',

  // Symbols
  COLON = 'COLON',
  COMMA = 'COMMA',
  DOT = 'DOT',
  DASH = 'DASH',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  PIPE = 'PIPE',

  // Whitespace
  NEWLINE = 'NEWLINE',

  // Special
  EOF = 'EOF',
  COMMENT = 'COMMENT',
}

/**
 * Position in source code
 */
export interface Position {
  line: number;
  column: number;
  offset: number;
}

/**
 * Token with type, value, and position information
 */
export interface Token {
  type: TokenType;
  value: string;
  start: Position;
  end: Position;
}

/**
 * Tokenization error
 */
export class TokenizerError extends Error {
  constructor(
    message: string,
    public position: Position
  ) {
    super(message);
    this.name = 'TokenizerError';
  }
}
