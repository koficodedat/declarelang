# Blog Platform Example

Complete DSL example for a blog platform with users, posts, comments, categories, and tags.

## Features

- **User Management**: Registration, roles (admin/author/user), profiles
- **Content**: Posts with categories, tags, comments
- **Publishing**: Draft/publish workflow
- **Moderation**: Comment approval system
- **Analytics**: View tracking, metrics

## DSL Files

### ddl.dsl (Schema)

Defines 5 models:

- User (authentication, profiles, roles)
- Post (articles with metadata)
- Comment (user feedback)
- Category (content organization)
- Tag (content labeling)

### dml.dsl (Queries & Mutations)

Custom operations:

- Filtered queries (published posts, recent posts, etc.)
- Custom mutations (publish, approve, increment views)
- Computed fields (post count, reading time)

### auth.dsl (Authorization)

3 roles with permissions:

- Admin: Full access
- Author: Manage own posts
- User: Create posts/comments, edit own content
- Field-level rules (can't edit view count)

### monitor.dsl (Observability)

Tracking:

- Request metrics (count, latency, errors)
- Business metrics (signups, publishes, approvals)
- Alerts (error rates, resource usage)

### log.dsl (Logging)

Audit trail:

- All mutations logged with user context
- Security events (logins, password changes)
- Exclude sensitive data (passwords)

### validation.dsl (Business Rules)

Input validation:

- Format rules (email, URLs)
- Length constraints
- Profanity/spam filtering
- Cross-field validation
- Rate limiting

### api.dsl (API Config)

API configuration:

- Rate limiting per resource
- CORS settings
- Pagination defaults
- Response envelope format
- Security headers

### seed.dsl (Initial Data)

Bootstrap data:

- 4 categories
- 6 tags
- 3 users (admin, 2 authors)
- 3 sample posts
- Sample comments
- Dev/test data generators

### security.dsl (Security Constraints)

Security enforcement:

- Password hashing requirements
- SQL injection protection
- XSS prevention
- Token expiration rules
- Soft delete enforcement

## Generated Output

This DSL generates:

### Database (PostgreSQL)

```sql
CREATE TABLE users (...);
CREATE TABLE posts (...);
CREATE TABLE comments (...);
CREATE TABLE categories (...);
CREATE TABLE tags (...);
-- + indexes, foreign keys
```

### API Endpoints

```
# Users
GET    /users
POST   /users
GET    /users/:id
PUT    /users/:id
DELETE /users/:id

# Posts
GET    /posts
POST   /posts
GET    /posts/:id
PUT    /posts/:id
DELETE /posts/:id

# ... and more
```

### TypeScript Types

```typescript
interface User {
  id: number;
  email: string;
  username: string;
  // ...
  posts?: Post[];
  comments?: Comment[];
}

interface Post {
  id: number;
  title: string;
  content: string;
  // ...
  user?: User;
  category?: Category;
  comments?: Comment[];
}
```

### Auth Middleware

```typescript
// Role-based checks
canCreate('Post', user); // true for authenticated
canUpdate('Post', user, post); // true if owner or admin
canDelete('Post', user, post); // true if owner/admin + no comments
```

### Validation

```typescript
// Zod schemas
const createPostSchema = z.object({
  title: z.string().min(5).max(200),
  content: z.string().min(100),
  // ...
});
```

## Usage

### Development

```bash
# Start dev server with auto-reload
framework dev --auto-migrate

# Make DSL changes, see updates instantly
```

### Create Migration

```bash
# When ready for production
framework migration create "add blog platform"

# Review generated migration
cat migrations/001_add_blog_platform/up.sql
```

### Apply Migration

```bash
# On other machines or production
framework migrate up
```

## Customization

Extend this example by:

- Adding more post types (video, gallery)
- Implementing likes/favorites
- Adding email notifications
- Supporting post drafts/revisions
- Adding search functionality (V2)
