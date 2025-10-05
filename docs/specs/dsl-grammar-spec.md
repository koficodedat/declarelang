# DSL Grammar Specification v0.1.0

## Overview

Complete formal specification of DeclareLang DSL syntax with all ambiguities resolved for v0.1.0.

**Version**: 0.1.0 (Internal Development)  
**Target**: 1.0.0 (Production Release)  
**Parser Strategy**: Recursive Descent  
**Case Sensitivity**: Keywords case-insensitive, identifiers preserve case  
**Whitespace**: Significant for line breaks, insignificant otherwise

---

## Common Rules

### Identifiers

```ebnf
identifier ::= letter (letter | digit | underscore | hyphen | space)*

letter     ::= [a-zA-Z]
digit      ::= [0-9]
underscore ::= "_"
hyphen     ::= "-"
space      ::= " "
```

**Conversion Rules**:

- Spaces → underscores
- Hyphens → underscores
- Must start with letter
- Max length: 63 characters

**Examples**:

```
user name      → user_name     ✅
user-name      → user_name     ✅
2fa enabled    → ERROR         ❌ (starts with digit)
user.name      → ERROR         ❌ (invalid character)
```

### Model Names with Pluralization

```ebnf
model_declaration ::= model_name ":" | model_name "has:"
model_name        ::= simple_name | bracketed_name

simple_name       ::= identifier
bracketed_name    ::= stem "[" suffix "]" | stem "[" singular "|" plural "]"

stem              ::= identifier
suffix            ::= identifier
singular          ::= identifier
plural            ::= identifier
```

**Pluralization Examples**:

```
User[s]:              → singular: User,     plural: Users
Post[s]:              → singular: Post,     plural: Posts
Categor[y|ies]:       → singular: Category, plural: Categories
Person[|People]:      → singular: Person,   plural: People
```

### Time Expressions

```ebnf
time_expr ::= number time_unit "ago" | "now"

number    ::= digit+
time_unit ::= "minute" | "minutes"
            | "hour" | "hours"
            | "day" | "days"
            | "week" | "weeks"
            | "month" | "months"
            | "year" | "years"
```

**v0.1.0 Restriction**: No abbreviations (no "mins", "hrs", etc.)

**Examples**:

```
5 minutes ago    ✅
1 day ago        ✅
30 days ago      ✅
now              ✅
5 mins ago       ❌ v0.1.0 (use "minutes")
```

### Boolean Expressions

```ebnf
bool_expr ::= field "is" bool_value
            | field "is not" bool_value
            | field "is empty"
            | field "is not empty"

bool_value ::= "true" | "false"
```

---

## DDL.DSL Grammar

### Model Definition

```ebnf
ddl_file       ::= model_def+
model_def      ::= model_declaration newline field_list

field_list     ::= field_item+
field_item     ::= "-" field_def newline
                 | "-" relationship newline

field_def      ::= "has" field_name "as" type_spec
type_spec      ::= constraint* field_type constraint*

field_type     ::= "text" | "long text" | "number" | "decimal"
                 | "boolean" | "timestamp" | "json" | "uuid"

constraint     ::= "unique" | "required" | "indexed"
                 | "and" | ","
```

### Relationships

```ebnf
relationship ::= has_many | belongs_to

has_many     ::= ("has many" | "many") model_reference
belongs_to   ::= "belongs to" model_reference

model_reference ::= identifier  # Must match a declared model name (singular)
```

**Resolution Rule for Relationships**:

- References MUST use the model's singular name exactly as declared
- Error if plural form used
- Error if model doesn't exist

**Examples**:

```
# Given: User[s] and Post[s] are declared

Post[s]:
- belongs to User     ✅ (correct - singular)
- belongs to Users    ❌ (error - use singular)
- has many Comment    ✅ (auto-pluralized internally)
- has many Comments   ❌ (error - use singular)
```

### Complete DDL Example

```
User[s]:
- has email as unique text and required
- has username as unique text and required
- has created at as timestamp
- has many Post

Post[s]:
- has title as text and required
- has content as long text
- belongs to User
- has created at as timestamp
```

---

## DML.DSL Grammar

### Query Definitions

```ebnf
dml_file    ::= (query_def | mutation_def | computed_def)+

query_def   ::= "Query for" model_name ":" newline query_item+
query_item  ::= "-" query_name where_clause? sort_clause? limit_clause? newline

query_name  ::= identifier

where_clause ::= "where" condition ("and" condition)*
condition    ::= field comparison value
               | field "is empty"
               | field "is not empty"

comparison   ::= "is" | "equals" | "matches" | "contains"
               | "is after" | "is before" | "is between"
               | "starts with" | "ends with"

sort_clause  ::= "sorted by" field ("ascending" | "descending" | "asc" | "desc")
limit_clause ::= "limited to" number
```

### Mutation Definitions

```ebnf
mutation_def  ::= "Mutation for" model_name ":" newline mutation_item+
mutation_item ::= "-" mutation_name action_clause newline

mutation_name ::= identifier
action_clause ::= "sets" assignments | "increases" field "by" number

assignments   ::= assignment ("and" assignment)*
assignment    ::= field "to" value
```

### Computed Fields

```ebnf
computed_def  ::= "Computed for" model_name ":" newline computed_item+
computed_item ::= "-" field_name aggregation newline

aggregation   ::= "counts" model_reference where_clause?
                | "sums" model_reference "." field where_clause?
                | "returns" bool_expr
                | "calculates from" field  # v2: Custom logic
```

### Complete DML Example

```
Query for Post:
- published posts where published is true
- recent posts where created at is after 7 days ago sorted by created at descending
- user posts where user id matches current user

Mutation for Post:
- publish post sets published to true and published at to now
- increment views increases view count by 1

Computed for User:
- post count counts Post
- published post count counts Post where published is true
```

---

## AUTH.DSL Grammar

### Authorization Rules

```ebnf
auth_file ::= role_def rule_def+ field_rule_def*

role_def  ::= "Roles:" newline role_item+
role_item ::= "-" identifier newline

rule_def  ::= "Rules for" model_name ":" newline permission_item+

permission_item ::= "-" subject "can" action target_spec condition? newline

subject    ::= "anyone" | "authenticated users" | "users" | role_name
action     ::= "create" | "read" | "edit" | "update" | "delete"
target_spec ::= model_reference | "own" model_reference | "any" model_reference

condition  ::= "where" bool_expr ("and" bool_expr)*
```

### Field-Level Rules

```ebnf
field_rule_def ::= "Field Rules for" model_name ":" newline field_permission+

field_permission ::= "-" subject "can" field_action field_name newline
                   | "-" subject "cannot" field_action field_name newline

field_action ::= "edit" | "read" | "set"
```

---

## VALIDATION.DSL Grammar

### Validation Rules

```ebnf
validation_file ::= validate_def+ cross_field_def? rate_limit_def? business_rule_def?

validate_def ::= "Validate" model_name ":" newline validation_item+

validation_item ::= "-" field "must" constraint_expr newline

constraint_expr ::= "be" format_type
                  | "be between" value "and" value "characters"
                  | "be at least" number "characters"
                  | "be at most" number "characters"
                  | "contain" requirement
                  | "not contain" requirement
                  | "match" pattern
                  | "exist when" condition
                  | "be empty when" condition

format_type ::= "valid email format" | "valid url" | "alphanumeric"
              | "lowercase alphanumeric and dashes only"

requirement ::= "uppercase and lowercase and number"
              | "special character"
              | "profanity" | "spam keywords"
```

---

## API.DSL Grammar (UPDATED v0.1.0)

### API Configuration

```ebnf
api_file ::= rate_limit_def? cors_def? response_def? pagination_def? query_param_def? security_def?

rate_limit_def ::= "Rate limit:" newline limit_item+
                 | "Rate limit for" model_name ":" newline limit_item+

limit_item ::= "-" number action "per" time_unit "per" scope newline

action ::= "requests" | "creates" | "updates" | "deletes" | "reads" | "signups" | "logins"
scope  ::= "user" | "ip address" | "api key"
```

### CORS Configuration

```ebnf
cors_def ::= "CORS:" newline cors_item+

cors_item ::= "-" "allow origins:" origin_list newline
            | "-" "allow methods:" method_list newline
            | "-" "allow headers:" header_list newline
            | "-" "allow credentials:" bool_value newline
            | "-" "max age:" number newline

origin_list ::= url ("," url)*
method_list ::= http_method ("," http_method)*
header_list ::= header_name ("," header_name)*
```

### Query Parameters (UPDATED - Consistent Syntax)

```ebnf
query_param_def ::= "Query parameters for" model_name ":" newline param_item+

param_item ::= "-" field "as" filter_type newline

filter_type ::= "boolean"
              | "number"
              | "text"
              | "date range"
              | "number range"
              | "text contains"
              | "text starts with"
              | "text ends with"
```

**Breaking Change from Pre-v0.1.0**: Query parameter syntax now requires "as" keyword consistently.

**Old Syntax (Inconsistent)**:

```dsl
Query parameters for Post:
- published as boolean        ✅ (had "as")
- created at range            ❌ (missing "as")
- title contains text         ❌ (wrong order)
```

**New Syntax (v0.1.0 - Consistent)**:

```dsl
Query parameters for Post:
- published as boolean        ✅
- user id as number          ✅
- created at as date range   ✅ (now has "as")
- title as text contains     ✅ (consistent order)
- content as text contains   ✅
```

**Migration Guide**:

```dsl
# Pattern: field as <type> <operation>

# Type filters
published as boolean
user_id as number

# Range filters
created_at as date range
price as number range

# Text search filters
title as text contains
slug as text starts with
email as text ends with
```

### Complete API Example (v0.1.0)

```
Rate limit:
- 100 requests per minute per user
- 1000 requests per hour per user

Rate limit for Post:
- 10 creates per minute per user
- 100 reads per minute per user

CORS:
- allow origins: https://example.com, https://app.example.com
- allow methods: GET, POST, PUT, DELETE
- allow headers: Authorization, Content-Type
- allow credentials: true
- max age: 86400

Pagination:
- default limit: 20
- max limit: 100
- default sort: created at descending

Query parameters for Post:
- published as boolean
- user id as number
- category id as number
- created at as date range
- title as text contains
- content as text contains
```

---

## MONITOR.DSL Grammar

### Monitoring Configuration

```ebnf
monitor_file ::= track_def+ alert_def+ monitor_def? dashboard_def?

track_def ::= "Track for" scope ":" newline metric_item+

scope ::= "all endpoints" | model_name

metric_item ::= "-" metric_name newline

metric_name ::= "request count" | "response time" | "error rate"
              | "create count" | "update count" | "delete count" | "read count"
              | identifier "count" | identifier "total"
```

### Alerts

```ebnf
alert_def ::= "Alert when:" newline alert_condition+
            | "Alert for" model_name ":" newline alert_condition+

alert_condition ::= "-" metric comparison threshold time_window? newline

threshold ::= number ("percent" | "milliseconds" | "per" time_unit)
time_window ::= "in" number time_unit
```

---

## LOG.DSL Grammar

### Logging Configuration

```ebnf
log_file ::= log_def+ audit_def+ level_def+ exclude_def?

log_def ::= "Log for" scope ":" newline log_item+

log_item ::= "-" field newline
           | "-" action "with" detail newline

detail ::= "full data" | "changed fields only" | field "only"
         | field "and" field
```

### Audit Trail

```ebnf
audit_def ::= "Audit for" model_name ":" newline audit_item+

audit_item ::= "-" "who" action newline
             | "-" "when" event newline
             | "-" identifier newline
```

---

## SEED.DSL Grammar

### Seed Data

```ebnf
seed_file ::= seed_def+

seed_def ::= "Seed" model_name ":" newline seed_item+
           | "Seed for" environment ":" newline seed_item+

environment ::= "development" | "testing" | "production"

seed_item ::= "-" literal_seed newline
            | "-" random_seed newline

literal_seed ::= value+ "with" attribute_assignments

attribute_assignments ::= attribute ("and" attribute)*
attribute ::= field value

random_seed ::= number model_name "with random" random_spec
random_spec ::= field_list
```

---

## SECURITY.DSL Grammar

### Security Constraints

```ebnf
security_file ::= constraint_def+ enforce_def+ password_def? data_protection_def? api_security_def?

constraint_def ::= "Constraints:" newline constraint_item+

constraint_item ::= "-" "all" subject "must" requirement newline

requirement ::= "be hashed with bcrypt"
              | "have minimum" number "rounds"
              | "use parameterized statements"
              | "be" constraint_type
              | "have indexes"
              | "be" action

constraint_type ::= "UTC" | "sanitized" | "virus scanned"
action ::= "soft deletes" | "rate limited" | "validated"
```

---

## Grammar Ambiguity Resolution

### Query Parameter Syntax (RESOLVED v0.1.0)

**Problem**: Inconsistent use of "as" keyword
**Solution**: Always use `field as type/operation` pattern

```dsl
✅ Correct (v0.1.0):
- published as boolean
- created_at as date range
- title as text contains

❌ Incorrect (pre-v0.1.0):
- created_at range
- title contains text
```

### Field Name Conversion

**Rule**: Spaces and hyphens → underscores, must start with letter

```
user name          → user_name
first-name         → first_name
email-address      → email_address
2fa-enabled        → ERROR (starts with digit)
```

### Constraint Ordering

**Rule**: Type appears once, constraints can be anywhere

```
Valid:
  as unique text and required
  as text and unique and required
  as required unique text

Invalid:
  as text text              (type appears twice)
  unique required           (missing type)
```

### Relationship References

**Rule**: Always use singular form as declared

```
# Models declared:
User[s]:
Post[s]:

# References:
belongs to User      ✅
belongs to Users     ❌
has many Post        ✅
has many Posts       ❌
```

---

## Future Extensions (v1.0.0+)

### Planned Grammar Additions

- OR conditions in queries
- Complex boolean expressions
- Custom type definitions
- Many-to-many relationships
- Nested computed fields
- Data transformation expressions
- Plugin extension points

### Backward Compatibility

- v0.1.0 DSL files will parse in v1.0.0
- New features opt-in via syntax
- Migration path for deprecated syntax

---

## Version History

**v0.1.0** (Current):

- Query parameter syntax standardized
- All ambiguities resolved
- Ready for implementation

**v1.0.0** (Future):

- Additional features
- Production-ready
- Stable API

---

**Version**: 0.1.0  
**Last Updated**: October 2025  
**Status**: Implementation Ready
