/**
 * DeclareLang Abstract Syntax Tree (AST) Type Definitions
 * Version: 0.1.0
 *
 * Complete type system for the intermediate representation between parser and generators.
 * All parsers output these types, all generators consume these types.
 */

// ============================================================================
// Core AST Types
// ============================================================================

/**
 * Root AST node containing all parsed DSL files
 */
export interface DeclareLangAST {
  version: '0.1.0';
  schema: SchemaAST;
  dataManipulation: DataManipulationAST;
  authorization: AuthorizationAST;
  validation: ValidationAST;
  api: ApiConfigAST;
  monitoring: MonitoringAST;
  logging: LoggingAST;
  seed: SeedAST;
  security: SecurityAST;

  /** Source file metadata */
  sources: SourceMap;

  /** Cross-file references resolved */
  symbolTable: SymbolTable;
}

/**
 * Maps source file paths to their content hashes
 */
export interface SourceMap {
  [filename: string]: {
    path: string;
    hash: string;
    lastModified: Date;
  };
}

/**
 * Symbol table for cross-file reference resolution
 */
export interface SymbolTable {
  models: Map<string, ModelSymbol>;
  fields: Map<string, FieldSymbol>;
  relationships: Map<string, RelationshipSymbol>;
  queries: Map<string, QuerySymbol>;
  mutations: Map<string, MutationSymbol>;
}

export interface ModelSymbol {
  name: string;
  plural: string;
  definedIn: string; // filename
  line: number;
}

export interface FieldSymbol {
  model: string;
  name: string;
  type: FieldType;
  definedIn: string;
  line: number;
}

export interface RelationshipSymbol {
  source: string;
  target: string;
  type: 'hasMany' | 'belongsTo';
  definedIn: string;
  line: number;
}

export interface QuerySymbol {
  model: string;
  name: string;
  definedIn: string;
  line: number;
}

export interface MutationSymbol {
  model: string;
  name: string;
  definedIn: string;
  line: number;
}

// ============================================================================
// Schema AST (DDL)
// ============================================================================

/**
 * Schema definitions from ddl.dsl
 */
export interface SchemaAST {
  models: Model[];
}

/**
 * Model/Entity definition
 */
export interface Model {
  /** Singular form (e.g., "User") */
  name: string;

  /** Plural form (e.g., "Users") */
  plural: string;

  /** Table name in database (defaults to lowercase plural) */
  tableName?: string;

  fields: Field[];
  relationships: Relationship[];

  /** Source location for error reporting */
  location: SourceLocation;
}

/**
 * Field definition
 */
export interface Field {
  name: string;
  type: FieldType;
  constraints: FieldConstraint[];
  defaultValue?: FieldValue;

  location: SourceLocation;
}

export type FieldType =
  | 'text'
  | 'long text'
  | 'number'
  | 'decimal'
  | 'boolean'
  | 'timestamp'
  | 'json'
  | 'uuid';

export type FieldConstraint = 'unique' | 'required' | 'indexed';

export type FieldValue = string | number | boolean | null;

/**
 * Relationship between models
 */
export interface Relationship {
  type: 'hasMany' | 'belongsTo';

  /** Target model name (singular) */
  target: string;

  /** Foreign key field name (auto-generated for belongsTo) */
  foreignKey?: string;

  location: SourceLocation;
}

// ============================================================================
// Data Manipulation AST (DML)
// ============================================================================

/**
 * Custom queries, mutations, and computed fields from dml.dsl
 */
export interface DataManipulationAST {
  queries: CustomQuery[];
  mutations: CustomMutation[];
  computedFields: ComputedField[];
}

/**
 * Custom named query
 */
export interface CustomQuery {
  /** Model this query belongs to */
  model: string;

  /** Query name (e.g., "publishedPosts") */
  name: string;

  /** WHERE conditions */
  conditions: QueryCondition[];

  /** Sort specification */
  sort?: SortClause;

  /** Limit specification */
  limit?: LimitClause;

  location: SourceLocation;
}

export interface QueryCondition {
  field: string;
  operator: ComparisonOperator;
  value: ConditionValue;

  location: SourceLocation;
}

export type ComparisonOperator =
  | 'is'
  | 'equals'
  | 'matches'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'isAfter'
  | 'isBefore'
  | 'isBetween'
  | 'isEmpty'
  | 'isNotEmpty';

export type ConditionValue =
  | string
  | number
  | boolean
  | TimeExpression
  | { type: 'reference'; field: string }
  | { type: 'currentUser' };

export interface TimeExpression {
  type: 'time';
  value: number;
  unit: TimeUnit;
  direction: 'ago' | 'future';
}

export type TimeUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

export interface SortClause {
  field: string;
  direction: 'asc' | 'desc';

  location: SourceLocation;
}

export interface LimitClause {
  value: number;

  location: SourceLocation;
}

/**
 * Custom mutation/update operation
 */
export interface CustomMutation {
  model: string;
  name: string;
  actions: MutationAction[];

  location: SourceLocation;
}

export type MutationAction = SetAction | IncrementAction | DecrementAction;

export interface SetAction {
  type: 'set';
  field: string;
  value: FieldValue | TimeExpression | { type: 'empty' };
}

export interface IncrementAction {
  type: 'increment';
  field: string;
  by: number;
}

export interface DecrementAction {
  type: 'decrement';
  field: string;
  by: number;
}

/**
 * Computed/derived field
 */
export interface ComputedField {
  model: string;
  name: string;
  computation: Computation;

  location: SourceLocation;
}

export type Computation =
  | CountComputation
  | SumComputation
  | BooleanComputation
  | CalculationComputation;

export interface CountComputation {
  type: 'count';
  targetModel: string;
  conditions?: QueryCondition[];
}

export interface SumComputation {
  type: 'sum';
  targetModel: string;
  field: string;
  conditions?: QueryCondition[];
}

export interface BooleanComputation {
  type: 'boolean';
  expression: BooleanExpression;
}

export interface CalculationComputation {
  type: 'calculation';
  sourceField: string;
  // V1: Limited to simple transformations
  // V2: Full expression support
}

export interface BooleanExpression {
  field: string;
  operator: 'is' | 'isNot';
  value: boolean | 'empty' | 'notEmpty';
}

// ============================================================================
// Authorization AST (AUTH)
// ============================================================================

/**
 * Authorization rules from auth.dsl
 */
export interface AuthorizationAST {
  roles: Role[];
  modelRules: ModelAuthRule[];
  fieldRules: FieldAuthRule[];
}

export interface Role {
  name: string;

  location: SourceLocation;
}

/**
 * Model-level authorization rule
 */
export interface ModelAuthRule {
  model: string;
  subject: AuthSubject;
  action: Action;
  ownership: Ownership;
  conditions?: AuthCondition[];

  location: SourceLocation;
}

export type AuthSubject =
  | { type: 'anyone' }
  | { type: 'authenticated' }
  | { type: 'users' }
  | { type: 'role'; role: string };

export type Action = 'create' | 'read' | 'update' | 'delete';

export type Ownership = 'any' | 'own';

export interface AuthCondition {
  field: string;
  operator: ComparisonOperator;
  value: ConditionValue;
}

/**
 * Field-level authorization rule
 */
export interface FieldAuthRule {
  model: string;
  field: string;
  subject: AuthSubject;
  canEdit: boolean;
  canRead: boolean;

  location: SourceLocation;
}

// ============================================================================
// Validation AST
// ============================================================================

/**
 * Validation rules from validation.dsl
 */
export interface ValidationAST {
  modelValidations: ModelValidation[];
  crossFieldValidations: CrossFieldValidation[];
  rateLimits: RateLimit[];
  businessRules: BusinessRule[];
}

export interface ModelValidation {
  model: string;
  fieldRules: FieldValidationRule[];

  location: SourceLocation;
}

export interface FieldValidationRule {
  field: string;
  constraints: ValidationConstraint[];

  location: SourceLocation;
}

export type ValidationConstraint =
  | FormatConstraint
  | LengthConstraint
  | ContentConstraint
  | ConditionalConstraint;

export interface FormatConstraint {
  type: 'format';
  format: 'email' | 'url' | 'alphanumeric' | 'slug';
}

export interface LengthConstraint {
  type: 'length';
  min?: number;
  max?: number;
}

export interface ContentConstraint {
  type: 'content';
  requirement:
    | 'uppercaseLowercaseNumber'
    | 'specialCharacter'
    | 'noProfanity'
    | 'noSpam'
    | 'noMaliciousLinks';
}

export interface ConditionalConstraint {
  type: 'conditional';
  condition: QueryCondition;
  requirement: 'required' | 'empty';
}

export interface CrossFieldValidation {
  model: string;
  sourceField: string;
  targetField: string;
  rule: 'match' | 'exists';
  condition?: QueryCondition;

  location: SourceLocation;
}

export interface RateLimit {
  model?: string;
  action: string;
  limit: number;
  window: TimeExpression;
  scope: 'user' | 'ip' | 'apiKey';

  location: SourceLocation;
}

export interface BusinessRule {
  description: string;
  model: string;
  condition: QueryCondition;
  preventAction: Action;

  location: SourceLocation;
}

// ============================================================================
// API Configuration AST
// ============================================================================

/**
 * API configuration from api.dsl
 */
export interface ApiConfigAST {
  rateLimits: ApiRateLimit[];
  cors: CorsConfig;
  responseFormat: ResponseFormat;
  pagination: PaginationConfig;
  queryParameters: QueryParameterConfig[];
  security: ApiSecurityConfig;
}

export interface ApiRateLimit {
  model?: string;
  action: string;
  limit: number;
  window: TimeExpression;
  scope: 'user' | 'ip' | 'apiKey';
}

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: HttpMethod[];
  allowedHeaders: string[];
  allowCredentials: boolean;
  maxAge: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

export interface ResponseFormat {
  envelope: {
    dataKey: string;
    metaKey: string;
    errorsKey: string;
  };
  success: {
    includeStatusCode: boolean;
    includeRequestId: boolean;
    includeTimestamp: boolean;
  };
  error: {
    includeStatusCode: boolean;
    includeErrorCode: boolean;
    includeDetails: boolean;
  };
}

export interface PaginationConfig {
  model?: string;
  defaultLimit: number;
  maxLimit: number;
  defaultSort: SortClause;
  allowedSortFields?: string[];
}

export interface QueryParameterConfig {
  model: string;
  parameters: QueryParameter[];
}

export interface QueryParameter {
  field: string;
  type: 'boolean' | 'number' | 'text' | 'range' | 'contains';
}

export interface ApiSecurityConfig {
  headers: SecurityHeader[];
  compression: CompressionConfig;
  requestLimits: RequestLimits;
}

export interface SecurityHeader {
  name: string;
  value: string;
}

export interface CompressionConfig {
  enabled: boolean;
  threshold: number; // bytes
  formats: ('gzip' | 'deflate')[];
}

export interface RequestLimits {
  maxBodySize: number; // bytes
  maxFileUpload: number; // bytes
  maxQueryParams: number;
}

// ============================================================================
// Monitoring AST
// ============================================================================

/**
 * Monitoring configuration from monitor.dsl
 */
export interface MonitoringAST {
  metrics: MetricTracking[];
  alerts: Alert[];
  systemMonitoring: SystemMonitoring;
  dashboard: DashboardConfig;
}

export interface MetricTracking {
  scope: string; // 'all' or model name
  metrics: string[];

  location: SourceLocation;
}

export interface Alert {
  model?: string;
  metric: string;
  condition: {
    operator: 'exceeds' | 'below';
    threshold: number;
    unit?: 'percent' | 'milliseconds' | 'count';
  };
  timeWindow?: TimeExpression;

  location: SourceLocation;
}

export interface SystemMonitoring {
  metrics: string[];
  thresholds: {
    slowQueryMs?: number;
    connectionPoolPercent?: number;
    memoryPercent?: number;
  };
}

export interface DashboardConfig {
  metrics: DashboardMetric[];
}

export interface DashboardMetric {
  name: string;
  type: 'count' | 'gauge' | 'rate';
  query?: string;
}

// ============================================================================
// Logging AST
// ============================================================================

/**
 * Logging configuration from log.dsl
 */
export interface LoggingAST {
  logRules: LogRule[];
  auditRules: AuditRule[];
  logLevels: LogLevelConfig[];
  exclusions: string[];
}

export interface LogRule {
  scope: string;
  action?: Action | 'mutation';
  fields: LogField[];
  detail?: 'full' | 'changed' | 'minimal';

  location: SourceLocation;
}

export interface LogField {
  name: string;
  transform?: 'hash' | 'mask' | 'preview';
}

export interface AuditRule {
  model: string;
  events: AuditEvent[];

  location: SourceLocation;
}

export interface AuditEvent {
  type: 'who' | 'when' | 'what';
  action: string; // Action or string
}

export interface LogLevelConfig {
  level: 'debug' | 'info' | 'warning' | 'error';
  events: string[];
}

// ============================================================================
// Seed Data AST
// ============================================================================

/**
 * Seed data from seed.dsl
 */
export interface SeedAST {
  seeds: SeedDefinition[];
}

export interface SeedDefinition {
  model: string;
  environment?: 'development' | 'testing' | 'production';
  items: SeedItem[];

  location: SourceLocation;
}

export type SeedItem = LiteralSeed | RandomSeed;

export interface LiteralSeed {
  type: 'literal';
  attributes: Record<string, unknown>;
  references?: SeedReference[];
}

export interface RandomSeed {
  type: 'random';
  count: number;
  template: Record<string, unknown>;
}

export interface SeedReference {
  field: string;
  targetModel: string;
  identifier: string; // Value to match (e.g., email)
}

// ============================================================================
// Security AST
// ============================================================================

/**
 * Security constraints from security.dsl
 */
export interface SecurityAST {
  constraints: SecurityConstraint[];
  enforcement: EnforcementRule[];
  passwordRules: PasswordRule[];
  dataProtection: DataProtectionRule[];
  apiSecurity: ApiSecurityRule[];
}

export interface SecurityConstraint {
  subject: string; // all or string
  requirement: string;

  location: SourceLocation;
}

export interface EnforcementRule {
  rule: string;
  enabled: boolean;

  location: SourceLocation;
}

export interface PasswordRule {
  rule: string;
  value?: unknown;
}

export interface DataProtectionRule {
  field?: string;
  requirement: string;
}

export interface ApiSecurityRule {
  endpoint?: string;
  requirement: string;
}

// ============================================================================
// Source Location
// ============================================================================

/**
 * Source code location for error reporting
 */
export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  length?: number;
}

// ============================================================================
// AST Utilities
// ============================================================================

/**
 * Visitor pattern for AST traversal
 */
export interface ASTVisitor {
  visitModel?(model: Model): void;
  visitField?(field: Field): void;
  visitRelationship?(relationship: Relationship): void;
  visitQuery?(query: CustomQuery): void;
  visitMutation?(mutation: CustomMutation): void;
  visitAuthRule?(rule: ModelAuthRule): void;
  visitValidation?(validation: FieldValidationRule): void;
  // ... etc for all node types
}

/**
 * AST node base type
 */
export interface ASTNode {
  location: SourceLocation;
}

/**
 * AST validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ASTError[];
  warnings: ASTWarning[];
}

export interface ASTError {
  message: string;
  location: SourceLocation;
  code: string;
  suggestion?: string;
}

export interface ASTWarning {
  message: string;
  location: SourceLocation;
  code: string;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isModel(node: unknown): node is Model {
  return (
    typeof node === 'object' &&
    node !== null &&
    'name' in node &&
    typeof (node as { name: unknown }).name === 'string' &&
    'fields' in node &&
    Array.isArray((node as { fields: unknown }).fields)
  );
}

export function isField(node: unknown): node is Field {
  return (
    typeof node === 'object' &&
    node !== null &&
    'name' in node &&
    typeof (node as { name: unknown }).name === 'string' &&
    'type' in node &&
    typeof (node as { type: unknown }).type === 'string'
  );
}

export function isRelationship(node: unknown): node is Relationship {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    ((node as { type: unknown }).type === 'hasMany' ||
      (node as { type: unknown }).type === 'belongsTo')
  );
}

export function isTimeExpression(value: unknown): value is TimeExpression {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as { type: unknown }).type === 'time'
  );
}

export function isAuthSubjectRole(subject: AuthSubject): subject is { type: 'role'; role: string } {
  return subject.type === 'role';
}

// ============================================================================
// AST Builder Helpers
// ============================================================================

/**
 * Create a new Model AST node
 */
export function createModel(name: string, plural: string, location: SourceLocation): Model {
  return {
    name,
    plural,
    fields: [],
    relationships: [],
    location,
  };
}

/**
 * Create a new Field AST node
 */
export function createField(name: string, type: FieldType, location: SourceLocation): Field {
  return {
    name,
    type,
    constraints: [],
    location,
  };
}

/**
 * Create a source location
 */
export function createLocation(file: string, line: number, column: number): SourceLocation {
  return { file, line, column };
}
