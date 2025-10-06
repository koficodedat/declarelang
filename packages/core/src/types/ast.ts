/**
 * AST (Abstract Syntax Tree) types for DeclareLang DSL
 * Based on DSL Grammar Specification v0.1.0
 */

import { Position } from './token.js';

/**
 * Base node with position information
 */
export interface BaseNode {
  start: Position;
  end: Position;
}

/**
 * Data types supported in DDL
 */
export enum FieldType {
  TEXT = 'text',
  LONG_TEXT = 'long_text',
  NUMBER = 'number',
  DECIMAL = 'decimal',
  BOOLEAN = 'boolean',
  TIMESTAMP = 'timestamp',
  JSON = 'json',
  UUID = 'uuid',
}

/**
 * Field constraints
 */
export enum FieldConstraint {
  UNIQUE = 'unique',
  REQUIRED = 'required',
  INDEXED = 'indexed',
}

/**
 * Model name with pluralization info
 */
export interface ModelName extends BaseNode {
  singular: string; // e.g., "User"
  plural: string; // e.g., "Users"
  originalForm: string; // e.g., "User[s]" or "Categor[y|ies]"
}

/**
 * Field definition in a model
 */
export interface FieldDefinition extends BaseNode {
  name: string; // normalized (underscores)
  originalName: string; // as written in DSL
  type: FieldType;
  constraints: FieldConstraint[];
}

/**
 * Relationship types
 */
export enum RelationshipType {
  HAS_MANY = 'has_many',
  BELONGS_TO = 'belongs_to',
}

/**
 * Relationship definition
 */
export interface RelationshipDefinition extends BaseNode {
  type: RelationshipType;
  targetModel: string; // singular form of referenced model
}

/**
 * Field or relationship item in a model
 */
export type ModelItem = FieldDefinition | RelationshipDefinition;

/**
 * Model definition
 */
export interface ModelDefinition extends BaseNode {
  name: ModelName;
  items: ModelItem[];
}

/**
 * DDL file (collection of models)
 */
export interface DDLFile extends BaseNode {
  models: ModelDefinition[];
}

/**
 * Type guards
 */
export function isFieldDefinition(item: ModelItem): item is FieldDefinition {
  return 'type' in item && 'constraints' in item;
}

export function isRelationshipDefinition(item: ModelItem): item is RelationshipDefinition {
  return 'type' in item && 'targetModel' in item && !('constraints' in item);
}

/**
 * DML (Data Manipulation Language) Types
 */

/**
 * Time expression types
 */
export interface TimeExpression extends BaseNode {
  type: 'relative' | 'now';
  value?: number; // e.g., 5 in "5 days ago"
  unit?: TimeUnit; // e.g., "days"
}

export enum TimeUnit {
  MINUTE = 'minute',
  MINUTES = 'minutes',
  HOUR = 'hour',
  HOURS = 'hours',
  DAY = 'day',
  DAYS = 'days',
  WEEK = 'week',
  WEEKS = 'weeks',
  MONTH = 'month',
  MONTHS = 'months',
  YEAR = 'year',
  YEARS = 'years',
}

/**
 * Value types in conditions and assignments
 */
export type ConditionValue =
  | { type: 'literal'; value: string | number | boolean }
  | { type: 'time'; expression: TimeExpression }
  | { type: 'reference'; field: string }; // e.g., "current user"

/**
 * Comparison operators
 */
export enum ComparisonOperator {
  IS = 'is',
  EQUALS = 'equals',
  MATCHES = 'matches',
  CONTAINS = 'contains',
  IS_AFTER = 'is_after',
  IS_BEFORE = 'is_before',
  IS_BETWEEN = 'is_between',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
}

/**
 * Query condition
 */
export interface Condition extends BaseNode {
  field: string; // normalized field name
  operator: ComparisonOperator;
  value?: ConditionValue; // optional for IS_EMPTY, IS_NOT_EMPTY
}

/**
 * Sort direction
 */
export enum SortDirection {
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Query clauses
 */
export interface WhereClause extends BaseNode {
  conditions: Condition[];
}

export interface SortClause extends BaseNode {
  field: string;
  direction: SortDirection;
}

export interface LimitClause extends BaseNode {
  count: number;
}

/**
 * Query definition
 */
export interface QueryDefinition extends BaseNode {
  name: string; // normalized query name
  originalName: string; // as written
  whereClause?: WhereClause;
  sortClause?: SortClause;
  limitClause?: LimitClause;
}

/**
 * Assignment in mutation
 */
export interface Assignment extends BaseNode {
  field: string; // normalized field name
  value: ConditionValue;
}

/**
 * Mutation action types
 */
export type MutationAction =
  | { type: 'sets'; assignments: Assignment[] }
  | { type: 'increases'; field: string; amount: number };

/**
 * Mutation definition
 */
export interface MutationDefinition extends BaseNode {
  name: string; // normalized mutation name
  originalName: string; // as written
  action: MutationAction;
}

/**
 * Computed field aggregation types
 */
export type ComputedAggregation =
  | {
      type: 'counts';
      targetModel: string;
      whereClause?: WhereClause;
    }
  | {
      type: 'sums';
      targetModel: string;
      field: string;
      whereClause?: WhereClause;
    }
  | {
      type: 'returns';
      condition: Condition; // boolean expression
    }
  | {
      type: 'calculates';
      field: string; // for v2 - custom logic
    };

/**
 * Computed field definition
 */
export interface ComputedDefinition extends BaseNode {
  fieldName: string; // normalized field name
  originalFieldName: string; // as written
  aggregation: ComputedAggregation;
}

/**
 * DML file sections
 */
export interface QuerySection extends BaseNode {
  modelName: string; // singular form of model
  queries: QueryDefinition[];
}

export interface MutationSection extends BaseNode {
  modelName: string; // singular form of model
  mutations: MutationDefinition[];
}

export interface ComputedSection extends BaseNode {
  modelName: string; // singular form of model
  computed: ComputedDefinition[];
}

/**
 * DML file (collection of queries, mutations, computed fields)
 */
export type DMLSection = QuerySection | MutationSection | ComputedSection;

export interface DMLFile extends BaseNode {
  sections: DMLSection[];
}

/**
 * Type guards for DML
 */
export function isQuerySection(section: DMLSection): section is QuerySection {
  return 'queries' in section;
}

export function isMutationSection(section: DMLSection): section is MutationSection {
  return 'mutations' in section;
}

export function isComputedSection(section: DMLSection): section is ComputedSection {
  return 'computed' in section;
}

/**
 * AUTH (Authorization) Types
 */

/**
 * Role definition
 */
export interface RoleDefinition extends BaseNode {
  name: string; // normalized role name
  originalName: string; // as written
}

/**
 * Subject types in permissions
 */
export enum SubjectType {
  ANYONE = 'anyone',
  AUTHENTICATED_USERS = 'authenticated_users',
  USERS = 'users',
  ROLE = 'role',
}

/**
 * Permission subject
 */
export type PermissionSubject =
  | { type: SubjectType.ANYONE }
  | { type: SubjectType.AUTHENTICATED_USERS }
  | { type: SubjectType.USERS }
  | { type: SubjectType.ROLE; roleName: string };

/**
 * CRUD actions
 */
export enum CRUDAction {
  CREATE = 'create',
  READ = 'read',
  EDIT = 'edit',
  UPDATE = 'update',
  DELETE = 'delete',
}

/**
 * Target specification for permissions
 */
export enum TargetModifier {
  ANY = 'any',
  OWN = 'own',
  NONE = 'none',
}

export interface TargetSpec extends BaseNode {
  modifier: TargetModifier;
  modelName: string; // singular form
}

/**
 * Permission rule
 */
export interface PermissionRule extends BaseNode {
  subject: PermissionSubject;
  action: CRUDAction;
  target: TargetSpec;
  condition?: WhereClause; // reuse from DML
}

/**
 * Rules for a model
 */
export interface ModelRules extends BaseNode {
  modelName: string; // singular form
  permissions: PermissionRule[];
}

/**
 * Field-level actions
 */
export enum FieldAction {
  EDIT = 'edit',
  READ = 'read',
  SET = 'set',
}

/**
 * Field permission (can or cannot)
 */
export interface FieldPermission extends BaseNode {
  subject: PermissionSubject;
  action: FieldAction;
  fieldName: string; // normalized
  allowed: boolean; // true for "can", false for "cannot"
}

/**
 * Field rules for a model
 */
export interface FieldRules extends BaseNode {
  modelName: string; // singular form
  permissions: FieldPermission[];
}

/**
 * AUTH file
 */
export interface AUTHFile extends BaseNode {
  roles: RoleDefinition[];
  modelRules: ModelRules[];
  fieldRules: FieldRules[];
}

/**
 * VALIDATION (Validation Rules) Types
 */

/**
 * Format types for validation
 */
export enum FormatType {
  VALID_EMAIL_FORMAT = 'valid_email_format',
  VALID_URL = 'valid_url',
  ALPHANUMERIC = 'alphanumeric',
  LOWERCASE_ALPHANUMERIC_AND_DASHES = 'lowercase_alphanumeric_and_dashes',
}

/**
 * Requirement types for contain/not contain
 */
export enum RequirementType {
  UPPERCASE_AND_LOWERCASE_AND_NUMBER = 'uppercase_and_lowercase_and_number',
  SPECIAL_CHARACTER = 'special_character',
  PROFANITY = 'profanity',
  SPAM_KEYWORDS = 'spam_keywords',
  MALICIOUS_LINKS = 'malicious_links',
  DISPOSABLE_EMAIL_LIST = 'disposable_email_list',
}

/**
 * Constraint expression types
 */
export type ConstraintExpression =
  | { type: 'format'; formatType: FormatType; conditional?: string }
  | { type: 'between'; min: number; max: number; unit: 'characters'; conditional?: string }
  | { type: 'at_least'; value: number; unit: 'characters'; conditional?: string }
  | { type: 'at_most'; value: number; unit: 'characters'; conditional?: string }
  | { type: 'contain'; requirement: RequirementType }
  | { type: 'not_contain'; requirement: RequirementType }
  | { type: 'match'; pattern: string }
  | { type: 'exist_when'; condition: Condition }
  | { type: 'be_empty_when'; condition: Condition }
  | { type: 'unique_within'; modelName: string }
  | { type: 'in_list'; list: string }
  | { type: 'not_in_list'; list: string };

/**
 * Validation rule for a field
 */
export interface ValidationRule extends BaseNode {
  field: string; // normalized field name
  originalField: string; // as written
  constraint: ConstraintExpression;
}

/**
 * Validation definition for a model
 */
export interface ValidationDefinition extends BaseNode {
  modelName: string; // singular form
  rules: ValidationRule[];
}

/**
 * Cross-field validation rule
 */
export interface CrossFieldRule extends BaseNode {
  modelName: string; // which model this applies to
  field: string; // the field being validated
  rule: string; // the rule description (parsed as string for v0.1.0)
}

/**
 * Rate limiting validation rule
 */
export interface RateLimitRule extends BaseNode {
  modelName: string; // User, Post, etc.
  action: string; // create, update, etc.
  limit: number;
  period: string; // per day, per hour, etc.
}

/**
 * Custom business rule
 */
export interface BusinessRule extends BaseNode {
  description: string; // full rule description
}

/**
 * VALIDATION file
 */
export interface VALIDATIONFile extends BaseNode {
  validations: ValidationDefinition[];
  crossFieldRules: CrossFieldRule[];
  rateLimitRules: RateLimitRule[];
  businessRules: BusinessRule[];
}

/**
 * API (API Configuration) Types
 */

/**
 * Rate limit action types
 */
export enum RateLimitAction {
  REQUESTS = 'requests',
  CREATES = 'creates',
  UPDATES = 'updates',
  DELETES = 'deletes',
  READS = 'reads',
  SIGNUPS = 'signups',
  LOGINS = 'logins',
}

/**
 * Rate limit scope types
 */
export enum RateLimitScope {
  USER = 'user',
  IP_ADDRESS = 'ip_address',
  API_KEY = 'api_key',
}

/**
 * Rate limit time units
 */
export enum RateLimitTimeUnit {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
}

/**
 * Rate limit rule
 */
export interface APIRateLimitRule extends BaseNode {
  modelName?: string; // Optional - for model-specific limits
  count: number;
  action: RateLimitAction;
  timeUnit: RateLimitTimeUnit;
  scope: RateLimitScope;
}

/**
 * CORS configuration
 */
export interface CORSConfig extends BaseNode {
  allowOrigins?: string[];
  allowMethods?: string[];
  allowHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
}

/**
 * Response envelope configuration
 */
export interface ResponseEnvelope extends BaseNode {
  dataField?: string; // e.g., "data"
  metaField?: string; // e.g., "meta"
  errorsField?: string; // e.g., "errors"
}

/**
 * Success response configuration
 */
export interface SuccessResponse extends BaseNode {
  includeStatusCode?: boolean;
  includeData?: boolean;
  includeMeta?: boolean;
  metaFields?: string[]; // e.g., ["request id", "timestamp", "pagination"]
}

/**
 * Error response configuration
 */
export interface ErrorResponse extends BaseNode {
  includeStatusCode?: boolean;
  includeError?: boolean;
  errorFields?: string[]; // e.g., ["code", "message", "details"]
  includeFields?: boolean; // For validation errors
}

/**
 * Pagination configuration
 */
export interface PaginationConfig extends BaseNode {
  modelName?: string; // Optional - for model-specific config
  defaultLimit?: number;
  maxLimit?: number;
  defaultSort?: {
    field: string;
    direction: SortDirection;
  };
  allowedSortFields?: string[];
}

/**
 * Query parameter filter types
 */
export enum QueryParamFilterType {
  BOOLEAN = 'boolean',
  NUMBER = 'number',
  TEXT = 'text',
  DATE_RANGE = 'date_range',
  NUMBER_RANGE = 'number_range',
  TEXT_CONTAINS = 'text_contains',
  TEXT_STARTS_WITH = 'text_starts_with',
  TEXT_ENDS_WITH = 'text_ends_with',
}

/**
 * Query parameter definition
 */
export interface QueryParam extends BaseNode {
  field: string; // normalized
  originalField: string; // as written
  filterType: QueryParamFilterType;
}

/**
 * Query parameters for a model
 */
export interface QueryParamsDefinition extends BaseNode {
  modelName: string;
  params: QueryParam[];
}

/**
 * API versioning configuration
 */
export interface APIVersioning extends BaseNode {
  versionFormat?: string; // e.g., "v1"
  header?: string; // e.g., "X-API-Version"
  defaultVersion?: string;
}

/**
 * Security header configuration
 */
export interface SecurityHeader extends BaseNode {
  name: string;
  value: string;
}

/**
 * Response compression configuration
 */
export interface ResponseCompression extends BaseNode {
  enabled?: boolean;
  minSize?: number; // in bytes
  formats?: string[]; // e.g., ["gzip", "deflate"]
}

/**
 * Request size limits configuration
 */
export interface RequestSizeLimits extends BaseNode {
  maxBodySize?: number; // in megabytes
  maxFileUpload?: number; // in megabytes
  maxQueryParams?: number;
}

/**
 * API file
 */
export interface APIFile extends BaseNode {
  rateLimits: APIRateLimitRule[];
  cors?: CORSConfig;
  responseEnvelope?: ResponseEnvelope;
  successResponse?: SuccessResponse;
  errorResponse?: ErrorResponse;
  pagination: PaginationConfig[];
  queryParams: QueryParamsDefinition[];
  versioning?: APIVersioning;
  securityHeaders?: SecurityHeader[];
  compression?: ResponseCompression;
  sizeLimits?: RequestSizeLimits;
}
