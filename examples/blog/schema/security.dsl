Constraints:
- all password fields must be hashed with bcrypt
- all password fields must have minimum 12 rounds
- all queries must use parameterized statements
- all timestamps must be UTC
- all foreign keys must have indexes
- all user input must be sanitized
- all auth endpoints must have rate limiting
- all DELETE operations must be soft deletes for Posts and Comments

Enforce:
- no raw SQL in generated code
- no eval or dynamic code execution
- no credentials in logs
- no sensitive data in error responses
- JWT tokens must expire within 24 hours
- sessions must be HttpOnly and Secure
- CORS must be explicitly configured in api.dsl

Password Rules:
- password must not be logged
- password must not be in responses
- password reset tokens must expire within 1 hour
- failed login attempts must be rate limited

Data Protection:
- user email must be unique and validated
- user data must not be exposed in error messages
- session tokens must be regenerated on privilege change

API Security:
- all endpoints must validate content type
- all responses must not expose stack traces
- all file uploads must validate file type and size
- SQL injection protection must be enforced
- XSS protection must be enabled