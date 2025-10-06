Rate limit:
- 100 requests per minute per user
- 1000 requests per hour per user
- 20 signups per hour per ip address
- 10 logins per minute per ip address

Rate limit for Posts:
- 10 creates per minute per user
- 5 updates per minute per user
- 3 deletes per minute per user
- 100 reads per minute per user

Rate limit for Comments:
- 20 creates per minute per user
- 5 updates per minute per user
- 10 deletes per minute per user

CORS:
- allow origins: https://blog.example.com, https://www.blog.example.com
- allow methods: GET, POST, PUT, DELETE, PATCH
- allow headers: Authorization, Content-Type, X-Requested-With
- allow credentials: true
- max age: 86400

Response envelope:
- data contains the payload
- meta contains pagination, totals, and request info
- errors contains error array when applicable

Success response:
- status code
- data
- meta with request id, timestamp, and pagination

Error response:
- status code
- error with code, message, and details
- fields with validation errors if applicable

Pagination:
- default limit: 20
- max limit: 100
- default sort: created at descending

Pagination for Posts:
- default limit: 50
- max limit: 100
- allowed sort fields: created at, title, published at, view count

Pagination for Comments:
- default limit: 30
- allowed sort fields: created at

Query parameters for Posts:
- published as boolean
- user id as number
- category id as number
- created at as date range
- title as text contains
- content as text contains

Query parameters for Comments:
- is approved as boolean
- post id as number
- user id as number
- created at as date range
- content as text contains

Query parameters for Users:
- role as text
- is active as boolean
- created at as date range
- email as text contains
- username as text contains

API versioning:
- version format: v1
- header: X-API-Version
- default version: v1

Security headers:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000

Response compression:
- enable for responses larger than 1024 bytes
- supported formats: gzip, deflate

Request size limits:
- max body size: 10 megabytes
- max file upload: 5 megabytes
- max query params: 50