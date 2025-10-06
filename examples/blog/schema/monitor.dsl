Track for all endpoints:
- request count
- response time
- error rate
- status codes

Track for Posts:
- create count
- update count
- delete count
- read count
- view count total
- publish count
- unpublish count

Track for Comments:
- create count
- approve count
- reject count
- delete count

Track for Users:
- signup count
- login attempts
- failed logins
- active users count

Alert when:
- error rate exceeds 5 percent
- response time exceeds 2000 milliseconds
- failed login attempts exceeds 10 in 5 minutes
- database connection pool exceeds 80 percent

Alert for Posts:
- create rate exceeds 100 per minute
- delete count exceeds 50 per hour

Alert for Comments:
- pending comments exceeds 100
- spam detection score exceeds 0.8

Monitor:
- database query time: tracked
- connection pool usage: monitored
- memory usage: monitored
- CPU usage: monitored
- cache hit rate: monitored
- slow query threshold: 500 milliseconds
- connection pool alert: 80 percent
- memory alert: 85 percent

Dashboard metrics:
- total users
- total posts
- total comments
- posts published today
- comments pending approval
- average response time
- requests per minute