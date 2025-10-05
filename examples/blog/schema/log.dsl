Log for all mutations:
- user id
- action
- resource
- timestamp
- ip address
- user agent

Log for Posts:
- create with title, user id, published status
- update with changed fields only
- delete with post id and title
- publish with post id and published at
- unpublish with post id

Log for Comments:
- create with content preview and post id
- approve with comment id and moderator id
- reject with comment id and reason
- delete with comment id

Log for Users:
- create with email only
- login with timestamp and ip address
- failed login with email and ip address
- password change with timestamp
- role change with old role and new role
- deactivate with reason

Audit for Posts:
- who created
- who updated
- who deleted
- when published
- who published

Audit for Comments:
- who created
- who approved
- who rejected
- who deleted

Audit for Users:
- when created
- last login
- password changes
- role changes
- deactivations

Log level debug for:
- query execution
- cache operations

Log level info for:
- successful requests
- user actions
- data mutations

Log level warning for:
- slow queries over 500 milliseconds
- high memory usage over 80 percent
- authentication failures

Log level error for:
- failed requests
- exceptions
- database errors
- validation failures

Exclude from logs:
- password fields
- sensitive user data
- payment information