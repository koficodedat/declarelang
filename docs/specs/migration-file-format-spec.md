# Migration File Format Specification

Complete specification for DeclareLang migration files.

---

## Overview

Migrations in DeclareLang track changes across **all DSL files**, not just database schema. Each migration is a directory containing multiple files.

**Migration Scope**:

- Database schema changes (SQL)
- Authorization rules (middleware)
- Validation rules (schemas)
- API configuration (CORS, rate limits, etc.)
- Logging configuration
- Monitoring rules

---

## Directory Structure

```
migrations/
├── 001_initial_schema/
│   ├── up.sql              # REQUIRED: Schema changes to apply
│   ├── down.sql            # REQUIRED: Rollback SQL
│   ├── manifest.json       # REQUIRED: Metadata and breaking changes
│   ├── auth.json          # OPTIONAL: Auth rule changes
│   ├── validation.json    # OPTIONAL: Validation changes
│   ├── api.json           # OPTIONAL: API config changes
│   ├── monitor.json       # OPTIONAL: Monitoring changes
│   ├── log.json           # OPTIONAL: Logging changes
│   └── data.sql           # OPTIONAL: Data migration (manual)
│
├── 002_add_posts/
│   ├── up.sql
│   ├── down.sql
│   ├── manifest.json
│   ├── auth.json
│   └── api.json
│
└── 003_add_categories/
    └── ...
```

---

## File Naming Convention

**Format**: `{number}_{description}/`

**Rules**:

- Number: Zero-padded, sequential (001, 002, 003...)
- Description: snake_case, descriptive
- No dates (number provides chronology)

**Examples**:

```
✅ Good:
001_initial_schema
002_add_posts_table
003_add_user_roles
100_refactor_comments

❌ Bad:
1_initial              (not zero-padded)
add-posts             (no number)
2023_10_04_posts     (includes date)
AddPosts              (not snake_case)
```

---

## Required Files

### 1. up.sql

**Purpose**: SQL statements to apply migration

**Format**: Standard PostgreSQL SQL

**Rules**:

- Must be idempotent when possible
- Must succeed or fail atomically (transaction)
- Must not contain comments with `--` (use `/* */`)

**Example**:

```sql
/* Create posts table */
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  published BOOLEAN DEFAULT false,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

/* Create index on foreign key */
CREATE INDEX idx_posts_user_id ON posts(user_id);

/* Create index on published */
CREATE INDEX idx_posts_published ON posts(published);
```

**Transaction Handling**:

```sql
/* Framework wraps in transaction automatically */
BEGIN;
  -- migration statements
COMMIT;
```

---

### 2. down.sql

**Purpose**: SQL to rollback migration

**Format**: Standard PostgreSQL SQL

**Rules**:

- Must reverse changes from up.sql
- Must succeed or fail atomically
- Order matters (reverse order of up.sql)

**Example**:

```sql
/* Drop indexes first */
DROP INDEX IF EXISTS idx_posts_published;
DROP INDEX IF EXISTS idx_posts_user_id;

/* Drop table */
DROP TABLE IF EXISTS posts;
```

**Important**:

- Drop dependent objects first (indexes, constraints)
- Drop tables last
- Use `IF EXISTS` for safety

---

### 3. manifest.json

**Purpose**: Migration metadata, breaking changes, dependencies

**JSON Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "version", "description", "timestamp", "dslHashes"],
  "properties": {
    "id": { "type": "string" },
    "version": { "type": "integer" },
    "description": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" },
    "author": { "type": "string" },
    "dslHashes": { "type": "object" },
    "changes": { "type": "object" },
    "breaking": { "type": "array" },
    "dependencies": { "type": "array" },
    "estimatedDuration": { "type": "string" },
    "requiresDowntime": { "type": "boolean" }
  }
}
```

**Example**:

```json
{
  "id": "002_add_posts",
  "version": 1,
  "description": "Add posts table and CRUD endpoints",
  "timestamp": "2025-10-04T14:30:00Z",
  "author": "dev@example.com",

  "dslHashes": {
    "ddl.dsl": "sha256:abc123...",
    "dml.dsl": "sha256:def456...",
    "auth.dsl": "sha256:xyz789...",
    "validation.dsl": "sha256:unchanged",
    "api.dsl": "sha256:ghi012..."
  },

  "changes": {
    "added": {
      "models": ["Post"],
      "fields": {
        "Post": ["title", "content", "published", "user_id", "created_at", "updated_at"]
      },
      "relationships": {
        "Post": ["belongs_to:User"]
      },
      "endpoints": [
        "GET /posts",
        "POST /posts",
        "GET /posts/:id",
        "PUT /posts/:id",
        "DELETE /posts/:id"
      ]
    },
    "modified": {},
    "removed": {}
  },

  "breaking": [
    {
      "type": "NEW_REQUIRED_RELATIONSHIP",
      "severity": "medium",
      "message": "Post.user_id is required - existing posts would fail",
      "impact": "Must ensure users exist before creating posts",
      "mitigation": "Seed users first"
    }
  ],

  "dependencies": ["001_initial_schema"],
  "estimatedDuration": "< 1 second",
  "requiresDowntime": false
}
```

**Field Descriptions**:

- `id`: Migration identifier (matches directory name)
- `version`: Migration format version (always 1 for V1)
- `description`: Human-readable description
- `timestamp`: When migration was created (ISO 8601)
- `author`: Who created it (email or username)
- `dslHashes`: SHA-256 hash of each DSL file at migration time
- `changes`: Detailed diff of what changed
- `breaking`: List of breaking changes with severity
- `dependencies`: Which migrations must run first
- `estimatedDuration`: How long migration should take
- `requiresDowntime`: Whether app should be stopped

---

## Optional Files

### 4. auth.json

**Purpose**: Authorization rule changes

**When Generated**: Only if auth.dsl changed

**Format**:

```json
{
  "version": 1,
  "added": [
    {
      "model": "Post",
      "subject": { "type": "users" },
      "action": "create",
      "ownership": "own",
      "conditions": []
    },
    {
      "model": "Post",
      "subject": { "type": "role", "role": "admin" },
      "action": "delete",
      "ownership": "any",
      "conditions": []
    }
  ],
  "modified": [],
  "removed": []
}
```

**Usage**: Framework regenerates auth middleware from this

---

### 5. validation.json

**Purpose**: Validation rule changes

**When Generated**: Only if validation.dsl changed

**Format**:

```json
{
  "version": 1,
  "added": {
    "Post": {
      "title": [
        { "type": "length", "min": 5, "max": 200 },
        { "type": "content", "requirement": "noProfanity" }
      ],
      "content": [{ "type": "length", "min": 100 }]
    }
  },
  "modified": {},
  "removed": {}
}
```

**Usage**: Framework regenerates validation schemas

---

### 6. api.json

**Purpose**: API configuration changes

**When Generated**: Only if api.dsl changed

**Format**:

```json
{
  "version": 1,
  "rateLimits": {
    "added": [
      {
        "model": "Post",
        "action": "create",
        "limit": 10,
        "window": { "value": 1, "unit": "minute" },
        "scope": "user"
      }
    ],
    "modified": [],
    "removed": []
  },
  "cors": {
    "changed": false
  },
  "pagination": {
    "added": {
      "Post": {
        "defaultLimit": 50,
        "maxLimit": 100,
        "allowedSortFields": ["created_at", "title", "published_at"]
      }
    }
  },
  "queryParameters": {
    "added": {
      "Post": [
        { "field": "published", "type": "boolean" },
        { "field": "user_id", "type": "number" }
      ]
    }
  }
}
```

**Usage**: Framework regenerates API middleware

---

### 7. monitor.json

**Purpose**: Monitoring configuration changes

**When Generated**: Only if monitor.dsl changed

**Format**:

```json
{
  "version": 1,
  "metrics": {
    "added": [
      {
        "scope": "Post",
        "metrics": ["create_count", "read_count", "update_count", "delete_count"]
      }
    ]
  },
  "alerts": {
    "added": [
      {
        "model": "Post",
        "metric": "create_rate",
        "condition": {
          "operator": "exceeds",
          "threshold": 100,
          "unit": "per minute"
        }
      }
    ]
  }
}
```

---

### 8. log.json

**Purpose**: Logging configuration changes

**When Generated**: Only if log.dsl changed

**Format**:

```json
{
  "version": 1,
  "logRules": {
    "added": [
      {
        "scope": "Post",
        "action": "create",
        "fields": ["title", "user_id", "published"],
        "detail": "full"
      }
    ]
  },
  "auditRules": {
    "added": [
      {
        "model": "Post",
        "events": [
          { "type": "who", "action": "create" },
          { "type": "when", "action": "published" }
        ]
      }
    ]
  }
}
```

---

### 9. data.sql (Manual)

**Purpose**: Data transformations or backfills

**When Needed**:

- Adding NOT NULL column to existing table
- Transforming data format
- Backfilling computed values
- Cleaning up invalid data

**Example**:

```sql
/* Set default status for existing users */
UPDATE users
SET status = 'active'
WHERE last_login > NOW() - INTERVAL '30 days'
  AND status IS NULL;

UPDATE users
SET status = 'inactive'
WHERE status IS NULL;

/* Now safe to add NOT NULL constraint */
ALTER TABLE users ALTER COLUMN status SET NOT NULL;
```

**Note**: V1 requires manual SQL. V2 will support data transformation DSL.

---

## Breaking Change Types

### Schema Breaking Changes

```json
{
  "type": "REMOVED_COLUMN",
  "severity": "critical",
  "message": "Column users.old_field removed",
  "impact": "Data will be lost",
  "mitigation": "Backup data before migration"
}
```

Types:

- `REMOVED_COLUMN` - Column deleted
- `REMOVED_TABLE` - Table deleted
- `TYPE_CHANGE_INCOMPATIBLE` - Type changed (e.g., TEXT → INTEGER)
- `ADDED_NOT_NULL` - NOT NULL added to existing column
- `ADDED_UNIQUE` - UNIQUE constraint added
- `PRECISION_DECREASED` - DECIMAL precision reduced

### API Breaking Changes

```json
{
  "type": "REMOVED_ENDPOINT",
  "severity": "critical",
  "message": "DELETE /old-route removed",
  "impact": "Clients using this endpoint will fail",
  "mitigation": "Update clients to use new endpoint"
}
```

Types:

- `REMOVED_ENDPOINT` - Endpoint deleted
- `REMOVED_FIELD` - Response field removed
- `ADDED_REQUIRED_FIELD` - Required request field added
- `CHANGED_RESPONSE_TYPE` - Response type changed

### Auth Breaking Changes

```json
{
  "type": "PERMISSION_TIGHTENED",
  "severity": "medium",
  "message": "Users can no longer delete posts with comments",
  "impact": "Some operations will fail",
  "mitigation": "Inform users of new restrictions"
}
```

---

## Migration Application Process

### 1. Check Status

```sql
SELECT * FROM _migrations ORDER BY id;
```

**Tracking Table**:

```sql
CREATE TABLE _migrations (
  id VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER,
  success BOOLEAN NOT NULL,
  error TEXT
);
```

### 2. Apply Migration

**Steps**:

1. Start transaction
2. Execute up.sql
3. Record in \_migrations table
4. Apply config changes (auth.json, etc.)
5. Regenerate code
6. Commit transaction

**Rollback on Failure**:

- Transaction rollback (SQL changes reverted)
- Don't record in \_migrations
- Log error for investigation

### 3. Verify

```bash
framework migrate status
```

**Output**:

```
✅ 001_initial_schema    Applied: 2025-10-01 10:30:22 (124ms)
✅ 002_add_posts         Applied: 2025-10-04 14:32:15 (89ms)
```

---

## Migration Rollback

### Process

1. Verify migration is applied
2. Start transaction
3. Execute down.sql
4. Remove from \_migrations table
5. Revert config changes
6. Regenerate code
7. Commit transaction

### Rollback Limitations

**Safe Rollbacks**:

- Remove added columns
- Drop added tables
- Revert config changes

**Unsafe Rollbacks**:

- Restore deleted data (need backup)
- Revert destructive type changes
- Undo data transformations

### Rollback down.sql

**Generated from up.sql**:

```sql
/* up.sql */
CREATE TABLE posts (...);
ALTER TABLE users ADD COLUMN status VARCHAR(20);

/* down.sql (auto-generated) */
ALTER TABLE users DROP COLUMN IF EXISTS status;
DROP TABLE IF EXISTS posts;
```

---

## Migration Locking

**Purpose**: Prevent concurrent migrations

**Lock Table**:

```sql
CREATE TABLE _migrations_lock (
  id INTEGER PRIMARY KEY DEFAULT 1,
  locked_at TIMESTAMPTZ,
  locked_by VARCHAR(255),
  process_id INTEGER,
  CHECK (id = 1)
);
```

**Acquire Lock**:

```sql
INSERT INTO _migrations_lock (locked_at, locked_by, process_id)
VALUES (NOW(), 'framework-cli', pg_backend_pid())
ON CONFLICT (id) DO UPDATE
  SET locked_at = NOW(),
      locked_by = 'framework-cli',
      process_id = pg_backend_pid()
WHERE _migrations_lock.locked_at < NOW() - INTERVAL '1 hour';
```

**Release Lock**:

```sql
DELETE FROM _migrations_lock WHERE id = 1;
```

---

## Migration Dry Run

**Purpose**: Preview changes without applying

**Process**:

1. Parse migration files
2. Show SQL that would run
3. Show config changes
4. Show breaking changes
5. **Don't apply anything**

**Output**:

```
Migration: 002_add_posts
Description: Add posts table and CRUD endpoints

SQL to execute:
---
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  ...
);
---

Config Changes:
- Auth: Add rule for Post creation (users)
- API: Add rate limit (10 creates/min)

Breaking Changes:
⚠️  None

Estimated duration: < 1 second
```

---

## Best Practices

### DO ✅

1. **Always include rollback**

   ```sql
   /* up.sql */
   ALTER TABLE users ADD COLUMN status VARCHAR(20);

   /* down.sql */
   ALTER TABLE users DROP COLUMN IF EXISTS status;
   ```

2. **Use IF EXISTS / IF NOT EXISTS**

   ```sql
   CREATE TABLE IF NOT EXISTS posts (...);
   DROP TABLE IF EXISTS posts;
   ```

3. **Test migrations**
   - Test up on clean DB
   - Test down after up
   - Test with real data volume

4. **Include data migrations when needed**

   ```sql
   /* data.sql */
   UPDATE users SET status = 'active' WHERE status IS NULL;
   ```

5. **Document breaking changes**
   ```json
   "breaking": [
     {
       "type": "REMOVED_COLUMN",
       "mitigation": "Backup data before migration"
     }
   ]
   ```

### DON'T ❌

1. **Don't edit applied migrations**
   - Create new migration instead

2. **Don't skip migration numbers**

   ```
   ❌ 001, 002, 005  (missing 003, 004)
   ✅ 001, 002, 003, 004, 005
   ```

3. **Don't include non-deterministic SQL**

   ```sql
   ❌ UPDATE users SET login_count = RANDOM();
   ✅ UPDATE users SET login_count = 0;
   ```

4. **Don't mix schema and data**
   - Use separate data.sql for data migrations

5. **Don't forget indexes**
   ```sql
   /* Always index foreign keys */
   CREATE INDEX idx_posts_user_id ON posts(user_id);
   ```

---

## Migration Templates

### Add Table

```sql
/* up.sql */
CREATE TABLE {table_name} (
  id SERIAL PRIMARY KEY,
  {fields},
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

/* down.sql */
DROP TABLE IF EXISTS {table_name};
```

### Add Column

```sql
/* up.sql */
ALTER TABLE {table} ADD COLUMN {column} {type} {constraints};

/* down.sql */
ALTER TABLE {table} DROP COLUMN IF EXISTS {column};
```

### Add Foreign Key

```sql
/* up.sql */
ALTER TABLE {table} ADD COLUMN {fk}_id INTEGER REFERENCES {target}(id);
CREATE INDEX idx_{table}_{fk}_id ON {table}({fk}_id);

/* down.sql */
DROP INDEX IF EXISTS idx_{table}_{fk}_id;
ALTER TABLE {table} DROP COLUMN IF EXISTS {fk}_id;
```

### Add Unique Constraint

```sql
/* up.sql */
ALTER TABLE {table} ADD CONSTRAINT {constraint_name} UNIQUE ({column});

/* down.sql */
ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint_name};
```

---

## Error Handling

### Migration Failure

**Log Format**:

```json
{
  "migration_id": "002_add_posts",
  "timestamp": "2025-10-04T14:32:15Z",
  "error": "ERROR:  duplicate key value violates unique constraint",
  "sql_state": "23505",
  "detail": "Key (email)=(test@example.com) already exists.",
  "phase": "up",
  "line": 15,
  "rollback": true
}
```

**Recovery**:

1. Transaction auto-rolled back
2. Error logged
3. Migration not recorded in \_migrations
4. Fix issue
5. Retry migration

### Partial Failure

**If down.sql fails**:

1. Log error
2. Mark migration as "partial rollback"
3. Require manual intervention
4. Provide SQL to fix

---

## Version History

**V1.0**: Initial migration format

- All features documented above

**V2.0** (planned):

- Data transformation DSL
- Multi-phase migrations
- Blue-green deployment support
- Automatic rollback triggers
