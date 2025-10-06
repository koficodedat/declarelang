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
