Roles:
- admin
- author
- user
- guest

Rules for Posts:
- authenticated users can create Posts
- users can edit own Posts where published is false
- users can delete own Posts where Post has no Comments
- authors can edit own Posts
- authors can delete own Posts
- admins can edit any Post
- admins can delete any Post
- anyone can read Posts where published is true
- users can read own Posts
- admins can read any Post

Rules for Comments:
- authenticated users can create Comments
- users can edit own Comments where created at is within 5 minutes
- users can delete own Comments
- admins can edit any Comment
- admins can delete any Comment
- anyone can read Comments where is approved is true and Post published is true
- admins can read any Comment

Rules for Categories:
- admins can create Categories
- admins can edit Categories
- admins can delete Categories where Category has no Posts
- anyone can read Categories

Rules for Tags:
- admins can create Tags
- admins can edit Tags
- admins can delete Tags where Tag has no Posts
- anyone can read Tags

Rules for Users:
- anyone can create User
- users can read own User
- users can edit own User
- users can delete own User
- admins can read any User
- admins can edit any User
- admins can delete any User

Field Rules for Users:
- users cannot edit role
- users cannot edit is active
- admins can edit role
- admins can edit is active

Field Rules for Posts:
- users cannot edit view count
- only increment views mutation can edit view count