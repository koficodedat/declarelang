User[s]:
- has email as unique text and required
- has username as unique text and required
- has password as text and required
- has first name as text
- has last name as text
- has bio as long text
- has avatar url as text
- has role as text
- has is active as boolean
- has created at as timestamp
- has updated at as timestamp
- has many Posts
- has many Comments

Post[s]:
- has title as text and required
- has slug as unique text and required
- has content as long text and required
- has excerpt as text
- has featured image as text
- has published as boolean
- has published at as timestamp
- has view count as number
- has created at as timestamp
- has updated at as timestamp
- belongs to User
- belongs to Category
- has many Comments
- has many Tags

Comment[s]:
- has content as text and required
- has is approved as boolean
- has created at as timestamp
- has updated at as timestamp
- belongs to User
- belongs to Post

Categor[y|ies]:
- has name as unique text and required
- has slug as unique text and required
- has description as long text
- has created at as timestamp
- has many Posts

Tag[s]:
- has name as unique text and required
- has slug as unique text and required
- has created at as timestamp
- has many Posts