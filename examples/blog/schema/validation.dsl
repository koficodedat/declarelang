Validate User:
- email must be valid email format
- email domain must not be in disposable email list
- username must be alphanumeric and dashes only
- username must be between 3 and 30 characters
- username must not contain profanity
- password must be at least 8 characters
- password must contain uppercase and lowercase and number and special character
- first name must be between 1 and 50 characters if provided
- last name must be between 1 and 50 characters if provided
- bio must be at most 500 characters
- avatar url must be valid url if provided

Validate Post:
- title must be between 5 and 200 characters
- title must not contain profanity
- slug must be lowercase alphanumeric and dashes only
- slug must be between 5 and 200 characters
- slug must be unique within all Posts
- content must be at least 100 characters
- content must not contain spam keywords
- excerpt must be at most 300 characters if provided
- featured image must be valid url if provided
- published at must exist when published is true
- published at must be empty when published is false

Validate Comment:
- content must be between 1 and 1000 characters
- content must not contain profanity
- content must not contain spam keywords
- content must not contain malicious links

Validate Category:
- name must be between 2 and 50 characters
- slug must be lowercase alphanumeric and dashes only
- slug must be unique within all Categories
- description must be at most 500 characters if provided

Validate Tag:
- name must be between 2 and 30 characters
- slug must be lowercase alphanumeric and dashes only
- slug must be unique within all Tags

Cross-field Validation:
- Post published at must be in the past or now when published is true
- User password must match confirm password on creation
- Comment post must exist and be published
- Post category must exist when provided
- Post user must be active

Rate Limiting Validation:
- User can create at most 10 Posts per day
- User can create at most 50 Comments per day
- User can update password at most 3 times per hour

Custom Business Rules:
- Post cannot be deleted if it has approved Comments
- User cannot be deactivated if they have published Posts
- Category cannot be deleted if it has Posts
- Tag cannot be deleted if it has Posts