Query for Posts:
- published posts where published is true
- recent posts where created at is after 7 days ago, sorted by created at descending
- popular posts sorted by view count descending
- user posts where user id matches current user
- featured posts where featured image is not empty and published is true
- posts by category where category id matches given category
- posts by tag where tag id matches given tag

Query for Comments:
- approved comments where is approved is true
- pending comments where is approved is false
- post comments where post id matches given post
- user comments where user id matches given user
- recent comments where created at is after 24 hours ago, sorted by created at descending

Query for Users:
- active users where is active is true
- admins where role is admin
- authors where role is author

Mutation for Posts:
- publish post sets published to true and published at to now
- unpublish post sets published to false and published at to empty
- increment views increases view count by 1
- feature post sets featured image to given url

Mutation for Comments:
- approve comment sets is approved to true
- reject comment sets is approved to false

Mutation for Users:
- activate user sets is active to true
- deactivate user sets is active to false
- promote to admin sets role to admin
- promote to author sets role to author

Computed for User:
- post count counts Posts
- published post count counts Posts where published is true
- comment count counts Comments

Computed for Post:
- comment count counts Comments
- approved comment count counts Comments where is approved is true
- is published returns published is true
- reading time calculates from content length

Computed for Category:
- post count counts Posts
- published post count counts Posts where published is true