# Error Code Registry

Complete registry of all error codes, messages, and solutions in DeclareLang.

**Format**: `[CATEGORY][NUMBER]` (e.g., `PARSE001`, `GEN050`, `MIG100`)

---

## Error Categories

| Prefix  | Category             | Description                          |
| ------- | -------------------- | ------------------------------------ |
| PARSE   | Parser Errors        | DSL syntax and parsing errors        |
| GEN     | Generator Errors     | Code generation errors               |
| MIG     | Migration Errors     | Migration system errors              |
| DB      | Database Errors      | Database connection and query errors |
| AUTH    | Authorization Errors | Auth/authz runtime errors            |
| VAL     | Validation Errors    | Request validation errors            |
| CONFIG  | Configuration Errors | Config file and setup errors         |
| CLI     | CLI Errors           | Command-line interface errors        |
| RUNTIME | Runtime Errors       | Application runtime errors           |

---

## Parser Errors (PARSE001-099)

### PARSE001: Unexpected Token

**Message**: `Unexpected token '{token}' at line {line}, column {column}`
**Cause**: Invalid syntax or typo
**Solution**: Check syntax guide for correct format

**Example**:

```dsl
User[s]:
- has email @ text   # Invalid: '@' is unexpected

✅ Fix: has email as text
```

---

### PARSE002: Missing Required Keyword

**Message**: `Expected '{keyword}' but got '{actual}' at line {line}`
**Cause**: Missing required keyword (as, has, where, etc.)
**Solution**: Add the required keyword

**Example**:

```dsl
User[s]:
- email as text      # Missing 'has'

✅ Fix: has email as text
```

---

### PARSE003: Invalid Field Name

**Message**: `Invalid field name '{name}' at line {line}. Field names must start with a letter`
**Cause**: Field name starts with number or contains invalid characters
**Solution**: Use only letters, numbers, spaces, hyphens, underscores

**Example**:

```dsl
User[s]:
- has 2fa-enabled as boolean   # Invalid: starts with number

✅ Fix: has two_factor_enabled as boolean
```

---

### PARSE004: Duplicate Model Definition

**Message**: `Model '{name}' already defined at line {previous_line}`
**Cause**: Same model defined twice
**Solution**: Remove duplicate or rename model

---

### PARSE005: Unknown Field Type

**Message**: `Unknown field type '{type}' at line {line}. Valid types: text, long text, number, decimal, boolean, timestamp, json, uuid`
**Cause**: Typo in field type
**Solution**: Use valid field type

**Example**:

```dsl
- has age as integer   # Invalid: use 'number'

✅ Fix: has age as number
```

---

### PARSE006: Unknown Constraint

**Message**: `Unknown constraint '{constraint}' at line {line}. Valid: unique, required, indexed`
**Cause**: Invalid or unsupported constraint
**Solution**: Use valid constraint

---

### PARSE007: Invalid Pluralization

**Message**: `Invalid pluralization syntax '{syntax}' at line {line}`
**Cause**: Incorrect bracket notation
**Solution**: Use `Name[suffix]` or `Stem[singular|plural]`

**Example**:

```dsl
Categor[ies]:          # Invalid: missing singular form

✅ Fix: Categor[y|ies]:
```

---

### PARSE008: Invalid Time Expression

**Message**: `Invalid time expression '{expr}' at line {line}. Use: {number} {unit} ago`
**Cause**: Wrong time format or unsupported unit
**Solution**: Use full unit names (minutes, hours, days, etc.)

**Example**:

```dsl
where created at is after 5 mins ago   # Invalid: use 'minutes'

✅ Fix: where created at is after 5 minutes ago
```

---

### PARSE009: Invalid Comparison Operator

**Message**: `Invalid operator '{operator}' at line {line}. Valid: is, equals, matches, contains, is after, is before`
**Cause**: Typo or unsupported operator
**Solution**: Use valid operator

---

### PARSE010: Model Reference Not Found

**Message**: `Model '{name}' not found at line {line}. Did you mean '{suggestion}'?`
**Cause**: Reference to undefined model
**Solution**: Check model name spelling or define the model

**Example**:

```dsl
Post[s]:
- belongs to Users     # Invalid: should be 'User' (singular)

✅ Fix: belongs to User
```

---

### PARSE011: Field Reference Not Found

**Message**: `Field '{field}' not found in model '{model}' at line {line}`
**Cause**: Reference to non-existent field
**Solution**: Check field name or add field to model

---

### PARSE012: Circular Relationship

**Message**: `Circular relationship detected: {path} at line {line}`
**Cause**: Model relationships form a cycle
**Solution**: Review relationship design

---

### PARSE013: Invalid Query Syntax

**Message**: `Invalid query syntax at line {line}. Expected: {name} where {condition}`
**Cause**: Malformed query definition
**Solution**: Follow query syntax rules

---

### PARSE014: Invalid Mutation Syntax

**Message**: `Invalid mutation syntax at line {line}. Expected: {name} sets {field} to {value}`
**Cause**: Malformed mutation definition
**Solution**: Follow mutation syntax rules

---

### PARSE015: Invalid Auth Rule

**Message**: `Invalid authorization rule at line {line}. Expected: {subject} can {action} {target}`
**Cause**: Malformed auth rule
**Solution**: Follow auth rule syntax

---

### PARSE016: Undefined Role

**Message**: `Role '{role}' not defined at line {line}`
**Cause**: Auth rule references undefined role
**Solution**: Add role to Roles section or fix typo

---

### PARSE017: Invalid Validation Constraint

**Message**: `Invalid validation constraint at line {line}`
**Cause**: Malformed validation rule
**Solution**: Check validation syntax guide

---

### PARSE018: Unsupported Aggregation

**Message**: `Unsupported aggregation '{type}' at line {line}. Valid: counts, sums`
**Cause**: Invalid computed field aggregation
**Solution**: Use 'counts' or 'sums' in V1

---

### PARSE019: Missing File

**Message**: `DSL file not found: {path}`
**Cause**: Referenced file doesn't exist
**Solution**: Create file or check path

---

### PARSE020: File Read Error

**Message**: `Cannot read file {path}: {error}`
**Cause**: Permission or file system error
**Solution**: Check file permissions

---

## Generator Errors (GEN001-099)

### GEN001: AST Validation Failed

**Message**: `AST validation failed: {details}`
**Cause**: Invalid AST structure after parsing
**Solution**: Fix parser output or DSL syntax

---

### GEN002: Type Mapping Not Found

**Message**: `No type mapping for '{type}' in {generator}`
**Cause**: Field type not supported by generator
**Solution**: Use supported type or update type mapping

---

### GEN003: Template Error

**Message**: `Template generation failed for {template}: {error}`
**Cause**: Code template has errors
**Solution**: Report bug or check generator configuration

---

### GEN004: Relationship Resolution Failed

**Message**: `Cannot resolve relationship {source}.{relation} → {target}`
**Cause**: Invalid relationship configuration
**Solution**: Check relationship definition

---

### GEN005: Foreign Key Conflict

**Message**: `Foreign key '{fk}' conflicts with existing field in {model}`
**Cause**: Auto-generated FK field already exists
**Solution**: Remove manual FK field or rename

---

### GEN006: Invalid Index Configuration

**Message**: `Cannot create index on {field}: {reason}`
**Cause**: Index configuration error
**Solution**: Check field type and constraints

---

### GEN007: Circular Dependency

**Message**: `Circular dependency detected in generation: {path}`
**Cause**: Generators depend on each other in a loop
**Solution**: Report bug - generator ordering issue

---

### GEN008: Output Write Error

**Message**: `Cannot write to {path}: {error}`
**Cause**: Permission or disk error
**Solution**: Check output directory permissions

---

### GEN009: TypeScript Compilation Error

**Message**: `Generated TypeScript has errors: {details}`
**Cause**: Generator produced invalid TypeScript
**Solution**: Report bug with DSL input

---

### GEN010: Drizzle Schema Error

**Message**: `Invalid Drizzle schema: {error}`
**Cause**: Generated schema doesn't compile
**Solution**: Check field types and relationships

---

## Migration Errors (MIG001-099)

### MIG001: No Migrations Found

**Message**: `No migrations found in {path}`
**Cause**: Migrations directory empty or wrong path
**Solution**: Create migration or check path

---

### MIG002: Migration Already Applied

**Message**: `Migration {id} already applied`
**Cause**: Trying to apply same migration twice
**Solution**: Check migration status

---

### MIG003: Migration Not Applied

**Message**: `Cannot rollback: migration {id} not applied`
**Cause**: Trying to rollback migration that wasn't run
**Solution**: Check migration status

---

### MIG004: Migration Failed

**Message**: `Migration {id} failed: {error}`
**Cause**: SQL error or migration logic issue
**Solution**: Review migration SQL, fix and retry

---

### MIG005: Rollback Failed

**Message**: `Rollback of {id} failed: {error}`
**Cause**: Down migration has errors
**Solution**: Fix down.sql or manual intervention needed

---

### MIG006: Schema Drift Detected

**Message**: `Schema drift detected: {changes}`
**Cause**: Database doesn't match DSL
**Solution**: Create migration to sync

---

### MIG007: Breaking Change Detected

**Message**: `Breaking change in migration: {change}. Use --force to proceed`
**Cause**: Migration would lose data
**Solution**: Review change, backup data, use --force if intentional

---

### MIG008: Migration Lock Error

**Message**: `Migration already in progress (locked by {process})`
**Cause**: Another migration is running
**Solution**: Wait or force unlock if stale

---

### MIG009: Invalid Migration Format

**Message**: `Invalid migration format in {file}: {error}`
**Cause**: Migration file is malformed
**Solution**: Check migration file structure

---

### MIG010: Migration Order Error

**Message**: `Migration {id} cannot run before {dependency}`
**Cause**: Migration dependencies not met
**Solution**: Apply dependencies first

---

## Database Errors (DB001-099)

### DB001: Connection Failed

**Message**: `Database connection failed: {error}`
**Cause**: Wrong credentials or DB not running
**Solution**: Check connection config and DB status

---

### DB002: Query Failed

**Message**: `Query failed: {error}`
**Cause**: SQL error
**Solution**: Check query syntax

---

### DB003: Transaction Failed

**Message**: `Transaction failed: {error}`
**Cause**: Transaction error
**Solution**: Check transaction logic

---

### DB004: Constraint Violation

**Message**: `{constraint} constraint violated: {details}`
**Cause**: Unique, FK, or check constraint failed
**Solution**: Fix data or constraint

**Example**:

```
UNIQUE constraint violated: User.email
Solution: Email already exists, use different email
```

---

### DB005: Table Not Found

**Message**: `Table '{table}' does not exist`
**Cause**: Migration not applied or wrong DB
**Solution**: Run migrations

---

### DB006: Column Not Found

**Message**: `Column '{column}' does not exist in {table}`
**Cause**: Migration not applied
**Solution**: Run migrations

---

### DB007: Connection Pool Exhausted

**Message**: `Connection pool exhausted`
**Cause**: Too many concurrent queries
**Solution**: Increase pool size or optimize queries

---

### DB008: Deadlock Detected

**Message**: `Deadlock detected: {details}`
**Cause**: Concurrent transaction conflict
**Solution**: Retry transaction

---

## Authorization Errors (AUTH001-099)

### AUTH001: Not Authenticated

**Message**: `Authentication required`
**Cause**: No valid auth token
**Solution**: Provide valid authentication

**HTTP Status**: 401

---

### AUTH002: Invalid Token

**Message**: `Invalid or expired authentication token`
**Cause**: Token malformed or expired
**Solution**: Refresh token or re-authenticate

**HTTP Status**: 401

---

### AUTH003: Insufficient Permissions

**Message**: `Insufficient permissions to {action} {resource}`
**Cause**: User lacks required role/permission
**Solution**: Contact admin or check permissions

**HTTP Status**: 403

---

### AUTH004: Resource Ownership Required

**Message**: `You can only {action} your own {resource}`
**Cause**: Trying to access another user's resource
**Solution**: Access only your own resources

**HTTP Status**: 403

---

### AUTH005: Condition Not Met

**Message**: `Authorization condition not met: {condition}`
**Cause**: Auth rule condition failed
**Solution**: Meet the required condition

**Example**:

```
Cannot delete Post: Post has Comments
Solution: Remove Comments first
```

**HTTP Status**: 403

---

## Validation Errors (VAL001-099)

### VAL001: Required Field Missing

**Message**: `{field} is required`
**Cause**: Required field not provided
**Solution**: Provide the field

**HTTP Status**: 400

---

### VAL002: Invalid Format

**Message**: `{field} must be valid {format}`
**Cause**: Field doesn't match format
**Solution**: Fix format

**Examples**:

```
email must be valid email format
url must be valid url format
```

**HTTP Status**: 400

---

### VAL003: Length Constraint

**Message**: `{field} must be between {min} and {max} characters`
**Cause**: String too short or long
**Solution**: Adjust length

**HTTP Status**: 400

---

### VAL004: Content Constraint

**Message**: `{field} must contain {requirement}`
**Cause**: Password/content doesn't meet requirements
**Solution**: Meet requirements

**Example**:

```
password must contain uppercase and lowercase and number
```

**HTTP Status**: 400

---

### VAL005: Profanity Detected

**Message**: `{field} contains inappropriate content`
**Cause**: Profanity filter triggered
**Solution**: Remove inappropriate content

**HTTP Status**: 400

---

### VAL006: Spam Detected

**Message**: `{field} contains spam keywords`
**Cause**: Spam filter triggered
**Solution**: Remove spam content

**HTTP Status**: 400

---

### VAL007: Unique Constraint

**Message**: `{field} must be unique`
**Cause**: Value already exists
**Solution**: Use different value

**HTTP Status**: 409

---

### VAL008: Cross-Field Validation

**Message**: `{field1} must match {field2}`
**Cause**: Fields don't match
**Solution**: Ensure fields match

**Example**:

```
confirm_password must match password
```

**HTTP Status**: 400

---

### VAL009: Conditional Validation

**Message**: `{field} must {requirement} when {condition}`
**Cause**: Conditional validation failed
**Solution**: Meet condition or adjust field

**Example**:

```
published_at must exist when published is true
```

**HTTP Status**: 400

---

### VAL010: Rate Limit Exceeded

**Message**: `Rate limit exceeded: {limit} {action} per {window}`
**Cause**: Too many requests
**Solution**: Wait before retrying

**Example**:

```
Rate limit exceeded: 10 creates per minute
```

**HTTP Status**: 429

---

## Configuration Errors (CONFIG001-099)

### CONFIG001: Config File Not Found

**Message**: `Configuration file not found: {path}`
**Cause**: framework.config.ts missing
**Solution**: Run `framework init` or create config

---

### CONFIG002: Invalid Config Format

**Message**: `Invalid configuration: {error}`
**Cause**: Config file has syntax errors
**Solution**: Fix config syntax

---

### CONFIG003: Missing Required Config

**Message**: `Required configuration missing: {key}`
**Cause**: Required config not set
**Solution**: Add required configuration

---

### CONFIG004: Invalid Database Config

**Message**: `Invalid database configuration: {error}`
**Cause**: DB config incomplete or wrong
**Solution**: Check database settings

---

### CONFIG005: Invalid Schema Path

**Message**: `Schema path does not exist: {path}`
**Cause**: schema.path points to non-existent directory
**Solution**: Create directory or fix path

---

## CLI Errors (CLI001-099)

### CLI001: Invalid Command

**Message**: `Unknown command '{command}'`
**Cause**: Command doesn't exist
**Solution**: Run `framework --help` for commands

---

### CLI002: Invalid Option

**Message**: `Unknown option '{option}'`
**Cause**: Option doesn't exist for command
**Solution**: Run `framework {command} --help`

---

### CLI003: Missing Argument

**Message**: `Missing required argument: {arg}`
**Cause**: Required arg not provided
**Solution**: Provide the argument

---

### CLI004: Invalid Argument

**Message**: `Invalid value for {arg}: {value}`
**Cause**: Argument has wrong type or format
**Solution**: Use correct format

---

### CLI005: Operation Cancelled

**Message**: `Operation cancelled by user`
**Cause**: User pressed Ctrl+C or chose No
**Solution**: None (user action)

**Exit Code**: 10

---

## Runtime Errors (RUNTIME001-099)

### RUNTIME001: Server Start Failed

**Message**: `Failed to start server: {error}`
**Cause**: Port in use or config error
**Solution**: Check port availability and config

---

### RUNTIME002: Middleware Error

**Message**: `Middleware error in {middleware}: {error}`
**Cause**: Middleware logic error
**Solution**: Check middleware configuration

---

### RUNTIME003: Route Handler Error

**Message**: `Route handler error: {error}`
**Cause**: Generated route has bugs
**Solution**: Report bug with DSL

---

### RUNTIME004: Database Pool Error

**Message**: `Database pool error: {error}`
**Cause**: Connection pool issue
**Solution**: Check pool configuration

---

### RUNTIME005: Seed Data Error

**Message**: `Seed data failed: {error}`
**Cause**: Seed data invalid or references missing
**Solution**: Check seed definitions

---

## Error Response Format

All API errors follow this format:

```json
{
  "error": {
    "code": "VAL001",
    "message": "email is required",
    "details": [
      {
        "field": "email",
        "message": "This field is required",
        "constraint": "required"
      }
    ]
  },
  "meta": {
    "request_id": "req_123abc",
    "timestamp": "2025-10-04T12:00:00Z"
  }
}
```

### Multiple Errors

```json
{
  "error": {
    "code": "VAL000",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "code": "VAL002",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "code": "VAL003",
        "message": "Password must be at least 8 characters"
      }
    ]
  },
  "meta": {
    "request_id": "req_123abc",
    "timestamp": "2025-10-04T12:00:00Z"
  }
}
```

---

## Exit Codes

| Code | Meaning                       |
| ---- | ----------------------------- |
| 0    | Success                       |
| 1    | General error                 |
| 2    | Validation error (PARSE, VAL) |
| 3    | Migration error (MIG)         |
| 4    | Database error (DB)           |
| 5    | Configuration error (CONFIG)  |
| 6    | Generator error (GEN)         |
| 7    | Authorization error (AUTH)    |
| 10   | User cancellation             |

---

## Logging Error Events

All errors are logged with context:

```typescript
logger.error({
  code: 'PARSE010',
  message: 'Model "Posts" not found',
  location: {
    file: 'auth.dsl',
    line: 12,
    column: 15,
  },
  suggestion: 'Did you mean "Post"?',
  timestamp: new Date(),
  stack: error.stack,
});
```

---

## Error Recovery Strategies

### Parser Errors

- Continue parsing other lines
- Build symbol table from valid definitions
- Report all errors at once

### Generator Errors

- Skip failed generator
- Continue with other generators
- Report which generators failed

### Migration Errors

- Rollback transaction on failure
- Leave database in consistent state
- Log failure for manual review

### Runtime Errors

- Log error with context
- Return appropriate HTTP status
- Don't expose internal details
