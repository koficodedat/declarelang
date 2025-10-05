# DeclareLang CLI Reference

Complete command-line interface documentation for the `framework` CLI tool.

---

## Installation

```bash
npm install -g @declarelang/cli
# or
yarn global add @declarelang/cli
# or
pnpm add -g @declarelang/cli
```

---

## Global Flags

Available for all commands:

```bash
--help, -h              Show help for command
--version, -v           Show DeclareLang version
--config, -c <path>     Path to config file (default: framework.config.ts)
--verbose               Enable verbose output
--quiet, -q             Suppress non-error output
--no-color              Disable colored output
```

---

## Commands

### `framework init`

Initialize a new DeclareLang project.

**Usage:**

```bash
framework init [project-name] [options]
```

**Arguments:**

- `project-name` - Optional project name (default: current directory)

**Options:**

```bash
--template <name>       Use template (blog, todo, ecommerce)
--database <type>       Database type (postgresql) - V1 only supports PostgreSQL
--typescript            Use TypeScript (default: true)
--git                   Initialize git repository (default: true)
--install               Install dependencies (default: true)
```

**Examples:**

```bash
# Create new project in current directory
framework init

# Create new project in new directory
framework init my-blog-api

# Use blog template
framework init my-blog --template blog

# Skip dependency installation
framework init my-app --no-install
```

**Output Structure:**

```
my-project/
├── schema/
│   ├── ddl.dsl
│   ├── dml.dsl
│   ├── auth.dsl
│   ├── validation.dsl
│   ├── api.dsl
│   ├── monitor.dsl
│   ├── log.dsl
│   ├── seed.dsl
│   └── security.dsl
├── generated/          (gitignored)
├── migrations/
├── framework.config.ts
├── .env.example
├── .gitignore
└── package.json
```

---

### `framework generate`

Generate code from DSL files.

**Usage:**

```bash
framework generate [options]
```

**Options:**

```bash
--watch, -w             Watch mode (regenerate on file change)
--incremental, -i       Only regenerate changed files
--output <path>         Output directory (default: ./generated)
--dry-run              Show what would be generated
--force                 Force full regeneration
```

**Examples:**

```bash
# Generate all code
framework generate

# Generate and watch for changes
framework generate --watch

# Incremental generation (faster)
framework generate --incremental

# See what would be generated
framework generate --dry-run
```

**Generated Output:**

```
generated/
├── schema/
│   ├── drizzle.ts         # Drizzle schema
│   └── types.ts           # TypeScript types
├── api/
│   └── routes.ts          # Fastify routes
├── middleware/
│   ├── auth.ts            # Auth middleware
│   ├── validation.ts      # Validation schemas
│   └── logging.ts         # Logging middleware
└── config/
    ├── cors.ts            # CORS config
    ├── monitoring.ts      # Monitoring setup
    └── rate-limit.ts      # Rate limiting
```

---

### `framework dev`

Start development server with hot reload.

**Usage:**

```bash
framework dev [options]
```

**Options:**

```bash
--port <number>         Server port (default: 3000)
--host <address>        Server host (default: localhost)
--auto-migrate          Apply schema changes automatically (DEV ONLY)
--no-reload             Disable hot reload
--inspect               Enable Node.js inspector
--debug                 Enable debug mode
```

**Examples:**

```bash
# Start dev server
framework dev

# Custom port
framework dev --port 8080

# With auto-migration (dangerous - dev only)
framework dev --auto-migrate

# Debug mode with inspector
framework dev --debug --inspect
```

**Behavior:**

- Watches `schema/**/*.dsl` files
- Regenerates code on file change
- Hot reloads server
- Shows compilation errors in real-time
- **Warning**: `--auto-migrate` applies schema changes without review (dev only)

---

### `framework migrate`

Manage database migrations.

**Usage:**

```bash
framework migrate <command> [options]
```

#### `framework migrate up`

Apply pending migrations.

**Options:**

```bash
--dry-run              Show SQL without executing
--steps <number>       Apply specific number of migrations
--to <migration>       Migrate up to specific migration
--rollback-on-error    Rollback if any migration fails
```

**Examples:**

```bash
# Apply all pending migrations
framework migrate up

# Apply next 2 migrations
framework migrate up --steps 2

# Apply up to specific migration
framework migrate up --to 003_add_comments

# Dry run (show SQL)
framework migrate up --dry-run
```

#### `framework migrate down`

Rollback migrations.

**Options:**

```bash
--dry-run              Show SQL without executing
--steps <number>       Rollback specific number of migrations (default: 1)
--to <migration>       Rollback to specific migration
--force                Required for destructive rollbacks
```

**Examples:**

```bash
# Rollback last migration
framework migrate down

# Rollback last 3 migrations
framework migrate down --steps 3

# Rollback to specific migration
framework migrate down --to 001_initial --force

# Dry run
framework migrate down --dry-run
```

#### `framework migrate status`

Show migration status.

**Options:**

```bash
--json                 Output as JSON
```

**Example:**

```bash
framework migrate status
```

**Output:**

```
Migration Status:

✅ 001_initial_schema        Applied: 2025-10-01 10:30:22
✅ 002_add_posts            Applied: 2025-10-02 14:15:33
✅ 003_add_comments         Applied: 2025-10-03 09:22:11
⏸️  004_add_categories       Pending
⏸️  005_add_tags            Pending

Database: my_blog_dev
Last migration: 003_add_comments
```

---

### `framework migration create`

Create a new migration from DSL changes.

**Usage:**

```bash
framework migration create <description> [options]
```

**Arguments:**

- `description` - Migration description (kebab-case recommended)

**Options:**

```bash
--empty                Create empty migration
--auto                 Auto-generate from schema diff
--sql-only             Only generate SQL (skip config migrations)
```

**Examples:**

```bash
# Auto-generate from schema changes
framework migration create "add user roles"

# Create empty migration for manual editing
framework migration create "custom-data-migration" --empty

# Only SQL migration
framework migration create "add indexes" --sql-only
```

**Process:**

1. Compares current DSL files to last migration
2. Detects changes (added/removed/modified)
3. Generates migration files
4. Shows breaking changes (if any)
5. Prompts for confirmation

**Generated Migration:**

```
migrations/004_add_user_roles/
├── up.sql              # Apply changes
├── down.sql            # Rollback changes
├── manifest.json       # Metadata + breaking changes
├── auth.json          # Auth rule changes (if any)
├── validation.json    # Validation changes (if any)
└── api.json           # API config changes (if any)
```

---

### `framework validate`

Validate DSL syntax without generating code.

**Usage:**

```bash
framework validate [files...] [options]
```

**Arguments:**

- `files` - Specific DSL files to validate (default: all)

**Options:**

```bash
--strict               Treat warnings as errors
--fix                  Auto-fix issues when possible
--json                 Output as JSON
```

**Examples:**

```bash
# Validate all DSL files
framework validate

# Validate specific files
framework validate schema/ddl.dsl schema/auth.dsl

# Strict mode (warnings = errors)
framework validate --strict

# Auto-fix issues
framework validate --fix
```

**Output:**

```
Validating DSL files...

✅ ddl.dsl (5 models, 32 fields)
✅ auth.dsl (3 roles, 12 rules)
⚠️  validation.dsl
   Line 15: 'mins' is not a valid time unit. Use 'minutes'

✅ api.dsl
❌ monitor.dsl
   Line 8: Invalid metric name 'req_count'. Use 'request count'

Summary: 1 error, 1 warning
```

---

### `framework check`

Check for schema drift (DSL vs. database).

**Usage:**

```bash
framework check [options]
```

**Options:**

```bash
--database <name>      Database to check (default: from config)
--auto-migrate         Create migration if drift detected
--json                 Output as JSON
```

**Examples:**

```bash
# Check for drift
framework check

# Auto-create migration if drift found
framework check --auto-migrate
```

**Output:**

```
Checking for schema drift...

🔍 Comparing DSL to database...

Changes detected:
  + Added: Post.featured_image (text)
  - Removed: User.old_field (text)
  ~ Modified: Post.view_count (number → decimal)

⚠️  Breaking changes detected!
   - Removed column: User.old_field (data will be lost)

Run: framework migration create "sync schema"
```

---

### `framework db:seed`

Run seed data.

**Usage:**

```bash
framework db:seed [options]
```

**Options:**

```bash
--env <environment>    Environment (development, testing, production)
--file <path>          Specific seed file
--reset                Drop all data before seeding
--models <names>       Seed specific models only
```

**Examples:**

```bash
# Seed all data
framework db:seed

# Seed development data only
framework db:seed --env development

# Reset and seed
framework db:seed --reset

# Seed specific models
framework db:seed --models User,Post
```

---

### `framework db:reset`

Reset database (drop all + migrate + seed).

**Usage:**

```bash
framework db:reset [options]
```

**Options:**

```bash
--force                Required for production
--no-seed              Skip seeding
--env <environment>    Environment to reset
```

**Examples:**

```bash
# Reset dev database
framework db:reset

# Reset without seeding
framework db:reset --no-seed

# Reset production (requires --force)
framework db:reset --env production --force
```

**⚠️ Warning**: Destructive operation. All data will be lost.

---

### `framework introspect`

Generate DSL from existing database (V2 feature).

**Usage:**

```bash
framework introspect [options]
```

**Options:**

```bash
--database <url>       Database connection URL
--output <path>        Output directory for DSL files
--overwrite            Overwrite existing DSL files
--tables <names>       Introspect specific tables only
```

**Examples:**

```bash
# Introspect database
framework introspect --database postgresql://localhost/mydb

# Specific tables only
framework introspect --tables users,posts,comments
```

**Status**: V2 feature (not available in V1)

---

### `framework export`

Export generated code as standalone project (V2 feature).

**Usage:**

```bash
framework export [options]
```

**Options:**

```bash
--output <path>        Export directory
--no-framework         Remove framework dependencies
--docker               Include Dockerfile
```

**Status**: V2 feature (not available in V1)

---

### `framework plugin`

Manage plugins (V2 feature).

**Usage:**

```bash
framework plugin <command> [options]
```

**Commands:**

```bash
framework plugin add <name>       Add plugin
framework plugin remove <name>    Remove plugin
framework plugin list            List installed plugins
framework plugin update <name>    Update plugin
```

**Status**: V2 feature (not available in V1)

---

## Configuration File

### `framework.config.ts`

```typescript
export default {
  // Database configuration
  database: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'myapp_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    },
    pool: {
      min: 2,
      max: 10,
    },
  },

  // DSL schema paths
  schema: {
    path: './schema',
    files: [
      'ddl.dsl',
      'dml.dsl',
      'auth.dsl',
      'validation.dsl',
      'api.dsl',
      'monitor.dsl',
      'log.dsl',
      'seed.dsl',
      'security.dsl',
    ],
  },

  // Generated code output
  output: {
    path: './generated',
    clean: true, // Clean before regenerating
  },

  // Migrations
  migrations: {
    path: './migrations',
    tableName: '_migrations',
    lockTableName: '_migrations_lock',
  },

  // Development server
  server: {
    port: 3000,
    host: 'localhost',
    cors: true, // Use CORS from api.dsl
  },

  // Dev mode settings
  dev: {
    autoMigrate: false,
    hotReload: true,
    watch: ['./schema/**/*.dsl'],
    debounce: 300, // ms
  },

  // Code generation
  generation: {
    typescript: {
      strict: true,
      target: 'ES2022',
    },
    formatting: {
      prettier: true,
      eslint: true,
    },
  },
};
```

---

## Environment Variables

### Required

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp_dev
DB_USER=postgres
DB_PASSWORD=secret
```

### Optional

```bash
NODE_ENV=development              # development, production, test
LOG_LEVEL=info                    # debug, info, warning, error
FRAMEWORK_CONFIG=./custom.config.ts
```

---

## Exit Codes

```
0   Success
1   General error
2   Validation error
3   Migration error
4   Database error
5   Configuration error
6   Parse error
10  User cancellation
```

---

## Tips & Best Practices

### Development Workflow

```bash
# 1. Start dev server
framework dev --auto-migrate

# 2. Edit DSL files
# (code auto-regenerates)

# 3. When satisfied, create migration
framework migration create "add feature X"

# 4. Review migration files
cat migrations/XXX_add_feature_x/up.sql

# 5. Commit DSL + migration
git add schema/ migrations/
git commit -m "Add feature X"
```

### Production Deployment

```bash
# 1. Pull latest code
git pull

# 2. Check migration status
framework migrate status

# 3. Dry-run migrations
framework migrate up --dry-run

# 4. Apply migrations
framework migrate up

# 5. Generate production code
framework generate

# 6. Start server
npm start
```

### Debugging

```bash
# Verbose output
framework generate --verbose

# Debug mode
framework dev --debug

# Validate before generating
framework validate --strict

# Check for issues
framework check
```

### Performance

```bash
# Incremental generation (faster)
framework generate --incremental

# Watch mode for development
framework generate --watch

# Disable hot reload if not needed
framework dev --no-reload
```

---

## Common Errors & Solutions

### Error: "Model 'Posts' not found"

**Cause**: Using plural form in relationship
**Solution**: Use singular form

```dsl
# Wrong
belongs to Users

# Correct
belongs to User
```

### Error: "Schema drift detected"

**Cause**: DSL doesn't match database
**Solution**: Create migration

```bash
framework migration create "sync schema"
framework migrate up
```

### Error: "Invalid time unit 'mins'"

**Cause**: Using abbreviation
**Solution**: Use full word

```dsl
# Wrong
where created at is after 5 mins ago

# Correct
where created at is after 5 minutes ago
```

### Error: "Migration failed: column already exists"

**Cause**: Running migration twice
**Solution**: Check migration status

```bash
framework migrate status
# Rollback if needed
framework migrate down
```

---

## Keyboard Shortcuts (Interactive Mode)

In `framework dev`:

```
Ctrl+C          Quit
R               Restart server
C               Clear console
G               Force regenerate
M               Show migration status
V               Validate DSL files
```

---

## See Also

- [DSL Syntax Guide](./dsl-syntax.md)
- [Migration Guide](./migration-strategy.md)
- [API Reference](./api-reference.md)
- [Troubleshooting](./troubleshooting.md)
