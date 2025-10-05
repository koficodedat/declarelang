# Type Mapping Specification

Complete type mapping between DSL types, PostgreSQL, Drizzle, and TypeScript.

---

## Type Mapping Table

| DSL Type  | PostgreSQL    | Drizzle     | TypeScript | Zod               | Default | Max Size                  |
| --------- | ------------- | ----------- | ---------- | ----------------- | ------- | ------------------------- |
| text      | VARCHAR(255)  | text()      | string     | z.string()        | null    | 255 chars                 |
| long text | TEXT          | text()      | string     | z.string()        | null    | unlimited                 |
| number    | INTEGER       | integer()   | number     | z.number()        | null    | -2147483648 to 2147483647 |
| decimal   | DECIMAL(10,2) | decimal()   | number     | z.number()        | null    | precision 10, scale 2     |
| boolean   | BOOLEAN       | boolean()   | boolean    | z.boolean()       | false   | -                         |
| timestamp | TIMESTAMPTZ   | timestamp() | Date       | z.date()          | null    | -                         |
| json      | JSONB         | jsonb()     | object     | z.object()        | null    | -                         |
| uuid      | UUID          | uuid()      | string     | z.string().uuid() | null    | -                         |

---

## PostgreSQL Type Mappings

### Text Types

#### `text` (VARCHAR)

**PostgreSQL**: `VARCHAR(255)`
**Usage**: Short strings (names, titles, slugs, emails)
**Max Length**: 255 characters
**Index**: Can be indexed efficiently

**Drizzle**:

```typescript
text('field_name', { length: 255 });
```

**Generated SQL**:

```sql
field_name VARCHAR(255)
```

**Constraints**:

```sql
-- Unique
field_name VARCHAR(255) UNIQUE

-- Required
field_name VARCHAR(255) NOT NULL

-- Both
field_name VARCHAR(255) NOT NULL UNIQUE
```

---

#### `long text` (TEXT)

**PostgreSQL**: `TEXT`
**Usage**: Long content (articles, descriptions, comments)
**Max Length**: ~1GB (practically unlimited)
**Index**: Can be indexed but slower

**Drizzle**:

```typescript
text('field_name');
```

**Generated SQL**:

```sql
field_name TEXT
```

**Use Cases**:

- Blog post content
- User bio
- Long descriptions
- Comments

---

### Numeric Types

#### `number` (INTEGER)

**PostgreSQL**: `INTEGER`
**Usage**: Whole numbers (counts, IDs, quantities)
**Range**: -2,147,483,648 to 2,147,483,647
**Size**: 4 bytes

**Drizzle**:

```typescript
integer('field_name');
```

**Generated SQL**:

```sql
field_name INTEGER
```

**Use Cases**:

- Counters (view_count, like_count)
- Quantities
- Age
- Year

**Default Value**:

```typescript
integer('view_count').default(0);
```

---

#### `decimal` (DECIMAL)

**PostgreSQL**: `DECIMAL(10, 2)`
**Usage**: Precise decimal numbers (money, measurements)
**Precision**: 10 digits total, 2 after decimal
**Range**: -99999999.99 to 99999999.99

**Drizzle**:

```typescript
decimal('field_name', { precision: 10, scale: 2 });
```

**Generated SQL**:

```sql
field_name DECIMAL(10, 2)
```

**Use Cases**:

- Prices
- Ratings (e.g., 4.75)
- Percentages
- Measurements

**Why not FLOAT/DOUBLE?**

- DECIMAL is exact (no rounding errors)
- Required for financial calculations
- Use FLOAT only for scientific data (V2)

---

### Boolean Type

#### `boolean`

**PostgreSQL**: `BOOLEAN`
**Usage**: True/false flags
**Values**: `TRUE`, `FALSE`, `NULL`
**Size**: 1 byte

**Drizzle**:

```typescript
boolean('field_name');
```

**Generated SQL**:

```sql
field_name BOOLEAN
```

**Default Value**:

```typescript
boolean('is_active').default(false);
boolean('published').default(false);
```

**Use Cases**:

- Feature flags (is_active, is_published)
- User settings (email_notifications)
- Status (is_approved, is_deleted)

---

### Temporal Types

#### `timestamp`

**PostgreSQL**: `TIMESTAMPTZ` (with timezone)
**Usage**: Date and time
**Timezone**: Always stored as UTC
**Size**: 8 bytes

**Drizzle**:

```typescript
timestamp('field_name', { withTimezone: true });
```

**Generated SQL**:

```sql
field_name TIMESTAMPTZ
```

**Default Values**:

```typescript
// Current timestamp
timestamp('created_at').defaultNow();

// Required with default
timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
```

**Use Cases**:

- created_at
- updated_at
- published_at
- deleted_at (soft deletes)
- Any date/time

**V2 Additions**:

- `date` - Date only (no time)
- `time` - Time only (no date)

---

### JSON Type

#### `json`

**PostgreSQL**: `JSONB` (binary JSON, indexed)
**Usage**: Structured data, flexible schemas
**Size**: Variable
**Indexing**: Supports GIN indexes

**Drizzle**:

```typescript
jsonb('field_name');
```

**Generated SQL**:

```sql
field_name JSONB
```

**Use Cases**:

- User preferences (key-value pairs)
- Metadata
- Configuration
- Flexible attributes

**Example Data**:

```json
{
  "theme": "dark",
  "notifications": {
    "email": true,
    "push": false
  },
  "settings": {
    "language": "en"
  }
}
```

**Querying** (V2):

```sql
SELECT * FROM users WHERE preferences->>'theme' = 'dark';
```

---

### UUID Type

#### `uuid`

**PostgreSQL**: `UUID`
**Usage**: Globally unique identifiers
**Size**: 16 bytes
**Format**: `550e8400-e29b-41d4-a716-446655440000`

**Drizzle**:

```typescript
uuid('field_name');
```

**Generated SQL**:

```sql
field_name UUID
```

**Default Value**:

```typescript
uuid('id').defaultRandom().primaryKey();
```

**Use Cases**:

- Alternative to serial IDs
- Distributed systems
- Public identifiers (not sequential)
- API keys

**V1 Note**: Auto-increment INTEGER used for primary keys by default
**V2**: Option to use UUID for primary keys

---

## TypeScript Type Mappings

### Base Types

```typescript
// Generated type interfaces
interface User {
  id: number; // INTEGER
  email: string; // VARCHAR(255)
  bio: string | null; // TEXT (nullable)
  age: number | null; // INTEGER (nullable)
  price: number; // DECIMAL(10,2)
  is_active: boolean; // BOOLEAN
  created_at: Date; // TIMESTAMPTZ
  preferences: object | null; // JSONB (nullable)
  api_key: string | null; // UUID (nullable)
}
```

### Nullable vs. Required

**Required (NOT NULL)**:

```typescript
email: string; // NOT NULL in DB
```

**Nullable (NULL allowed)**:

```typescript
bio: string | null; // NULL allowed in DB
```

**Optional (undefined in TS, NULL in DB)**:

```typescript
bio?: string;            // NULL in DB, optional in TS
```

### Default Values in TypeScript

```typescript
interface Post {
  view_count: number; // Default: 0
  published: boolean; // Default: false
  created_at: Date; // Default: NOW()
}

// In create operations, these are optional:
type CreatePost = Omit<Post, 'view_count' | 'created_at'> & {
  view_count?: number;
  created_at?: Date;
};
```

---

## Zod Schema Mappings

### Validation Schemas

```typescript
import { z } from 'zod';

// text (VARCHAR)
const textSchema = z.string().max(255);

// long text (TEXT)
const longTextSchema = z.string();

// number (INTEGER)
const numberSchema = z.number().int();

// decimal (DECIMAL)
const decimalSchema = z.number();

// boolean
const booleanSchema = z.boolean();

// timestamp
const timestampSchema = z.date();
// Or from string:
const timestampFromString = z.string().datetime();

// json
const jsonSchema = z.object({
  // Define structure or use z.record() for flexible
});

// uuid
const uuidSchema = z.string().uuid();
```

### With Constraints

```typescript
// Unique email (required)
email: z.string().email().max(255),

// Optional bio
bio: z.string().optional(),

// Number with range
age: z.number().int().min(13).max(120),

// Boolean with default
is_active: z.boolean().default(false),

// Timestamp (auto-generated, not in create schema)
created_at: z.date().optional(),
```

### Create vs. Update Schemas

```typescript
// Create schema (strict requirements)
const createUserSchema = z.object({
  email: z.string().email().max(255),
  username: z.string().min(3).max(30),
  password: z.string().min(8),
  first_name: z.string().max(50).optional(),
  bio: z.string().optional(),
});

// Update schema (all optional)
const updateUserSchema = createUserSchema.partial();
```

---

## Auto-Generated Fields

### Primary Key

**DSL**: Implicit (not in DSL)
**PostgreSQL**: `SERIAL PRIMARY KEY`
**TypeScript**: `number`

```sql
id SERIAL PRIMARY KEY
```

```typescript
id: number;
```

### Foreign Keys

**DSL**:

```dsl
Post[s]:
- belongs to User
```

**Generated PostgreSQL**:

```sql
user_id INTEGER REFERENCES users(id)
CREATE INDEX idx_posts_user_id ON posts(user_id);
```

**Generated TypeScript**:

```typescript
interface Post {
  id: number;
  user_id: number | null;
  user?: User; // Relation
}
```

### Timestamps

**DSL**:

```dsl
User[s]:
- has created at as timestamp
- has updated at as timestamp
```

**Generated PostgreSQL**:

```sql
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
```

**Generated Drizzle**:

```typescript
(timestamp('created_at', { withTimezone: true }).defaultNow(),
  timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()));
```

---

## Type Conversion Rules

### String to Number

```typescript
// Query param: ?limit=20
const limit = parseInt(req.query.limit);
```

### String to Boolean

```typescript
// Query param: ?published=true
const published = req.query.published === 'true';
```

### String to Date

```typescript
// ISO string to Date
const date = new Date(req.body.published_at);
```

### Number to Decimal

```typescript
// Ensure 2 decimal places
const price = parseFloat(value.toFixed(2));
```

---

## Size and Performance

### Storage Size

| Type          | Size                    | Notes                 |
| ------------- | ----------------------- | --------------------- |
| VARCHAR(255)  | Variable (1-256 bytes)  | Length prefix + chars |
| TEXT          | Variable (1 byte - 1GB) | Length prefix + chars |
| INTEGER       | 4 bytes                 | Fixed                 |
| DECIMAL(10,2) | Variable (~9 bytes)     | Precision dependent   |
| BOOLEAN       | 1 byte                  | Fixed                 |
| TIMESTAMPTZ   | 8 bytes                 | Fixed                 |
| JSONB         | Variable                | Compressed            |
| UUID          | 16 bytes                | Fixed                 |

### Index Performance

**Fast to Index**:

- INTEGER (fastest)
- UUID
- VARCHAR (up to 255)
- BOOLEAN

**Slower to Index**:

- TEXT (especially long)
- JSONB (requires GIN)
- DECIMAL

**Recommendation**: Index foreign keys, unique constraints, and commonly queried fields

---

## V1 Limitations

**Not Supported in V1**:

- BIGINT (large numbers)
- FLOAT/DOUBLE (approximate decimals)
- DATE (date only)
- TIME (time only)
- INTERVAL (time intervals)
- ARRAY types
- ENUM types
- Custom types
- Composite types

**V2 Additions**: All of the above

---

## Type Coercion Rules

### Request Input → Database

```typescript
// String → Number
"123" → 123

// String → Boolean
"true" → true
"false" → false
"" → false
"1" → true
"0" → false

// String → Date
"2025-10-04T12:00:00Z" → Date object

// String → JSON
'{"key": "value"}' → { key: "value" }
```

### Database → Response Output

```typescript
// Date → ISO String
Date object → "2025-10-04T12:00:00.000Z"

// Decimal → Number
DECIMAL(10,2) → JavaScript Number

// JSONB → Object
JSONB → Plain JavaScript object

// UUID → String
UUID → "550e8400-e29b-41d4-a716-446655440000"
```

---

## Null Handling

### Database NULL

**PostgreSQL**:

```sql
-- Nullable field
bio TEXT NULL

-- Non-nullable (required)
email VARCHAR(255) NOT NULL
```

### TypeScript null vs undefined

**Drizzle/TypeScript**:

```typescript
// NULL in DB = null in TypeScript
bio: string | null

// NOT NULL in DB = no null in TypeScript
email: string

// Optional in TS (undefined) maps to NULL in DB
bio?: string
// Equivalent to: bio: string | null | undefined
```

### Default Values

**If no value provided**:

```sql
-- Uses default
is_active BOOLEAN DEFAULT false
→ Inserted as: false

-- Uses NULL
bio TEXT
→ Inserted as: NULL

-- Requires value (error if missing)
email VARCHAR(255) NOT NULL
→ Error if not provided
```

---

## Best Practices

### Choose the Right Type

✅ **DO**:

- Use `text` for short strings (< 255 chars)
- Use `long text` for content
- Use `decimal` for money
- Use `boolean` for flags
- Use `timestamp` for dates
- Use `json` for flexible structured data

❌ **DON'T**:

- Use `text` for everything (performance)
- Use `number` for money (precision loss)
- Use strings for booleans
- Store dates as strings
- Store arrays as comma-separated strings

### Constraints

✅ **DO**:

- Mark email as unique
- Mark required fields
- Index foreign keys (auto)
- Index commonly queried fields

❌ **DON'T**:

- Index everything (slow writes)
- Make everything unique
- Over-constrain (inflexible)

### Naming

✅ **DO**:

- Use snake_case (first_name)
- Be descriptive (published_at)
- Use standard names (created_at, updated_at)

❌ **DON'T**:

- Use abbreviations (pub_dt)
- Use reserved words
- Mix naming styles

---

## Migration Type Changes

### Safe Changes

✅ Can be done without data loss:

- VARCHAR → TEXT
- INTEGER → BIGINT (V2)
- Add nullable column

### Unsafe Changes

⚠️ Require data migration:

- TEXT → VARCHAR (truncation risk)
- VARCHAR → INTEGER (conversion needed)
- Add NOT NULL (need default or populate)
- DECIMAL precision decrease

### Breaking Changes

❌ Will lose data:

- Remove column
- Change incompatible types
- Decrease precision
