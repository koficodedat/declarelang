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
