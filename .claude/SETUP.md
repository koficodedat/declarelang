# MCP Server Setup Guide

This document explains how to configure the MCP servers for DeclareLang development with Claude Code.

## Quick Setup

1. **Copy the environment template**:

   ```bash
   cp .env.example .env
   ```

2. **Generate a GitHub Personal Access Token**:
   - Visit: https://github.com/settings/tokens/new
   - Token name: `DeclareLang MCP`
   - Scopes needed:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `read:org` (Read org and team membership)
     - ✅ `read:user` (Read user profile data)
   - Click "Generate token"
   - Copy the token (starts with `ghp_`)

3. **Add configuration to `.env`**:

   ```bash
   # Edit .env file
   ALLOWED_DIRECTORIES=/path/to/declarelang
   POSTGRES_CONNECTION_STRING=postgresql://localhost/declarelang_dev
   GITHUB_TOKEN=ghp_your_actual_token_here
   ```

   **PostgreSQL Setup Options**:
   - **Local (no auth)**: `postgresql://localhost/declarelang_dev`
   - **Local (with auth)**: `postgresql://username:password@localhost:5432/declarelang_dev`
   - **Docker**: `postgresql://postgres:password@localhost:5432/declarelang_dev`
   - **Remote**: `postgresql://user:pass@remote-host:5432/declarelang_dev`

4. **Load environment variables** (choose one):

   **Option A: Shell RC file (recommended)**

   ```bash
   # Add to ~/.zshrc or ~/.bashrc
   export ALLOWED_DIRECTORIES="/Users/kofi/_/declarelang"
   export POSTGRES_CONNECTION_STRING="postgresql://localhost/declarelang_dev"
   export GITHUB_TOKEN="ghp_your_actual_token_here"

   # Reload shell
   source ~/.zshrc
   ```

   **Option B: Session-specific**

   ```bash
   # Run before starting Claude Code
   export ALLOWED_DIRECTORIES="/Users/kofi/_/declarelang"
   export POSTGRES_CONNECTION_STRING="postgresql://localhost/declarelang_dev"
   export GITHUB_TOKEN="ghp_your_actual_token_here"
   ```

5. **Verify setup**:
   ```bash
   echo $ALLOWED_DIRECTORIES           # Should print your project path
   echo $POSTGRES_CONNECTION_STRING    # Should print your database URL
   echo $GITHUB_TOKEN                  # Should print your token
   ```

## MCP Servers Configured

### 1. **postgres** (Local Database)

- **Purpose**: Test generated SQL schemas
- **Setup**: **Requires `POSTGRES_CONNECTION_STRING` environment variable**
- **Token**: None (uses connection string from env)
- **Default**: `postgresql://localhost/declarelang_dev`

### 2. **filesystem** (File Operations)

- **Purpose**: Enhanced file system access
- **Setup**: **Requires `ALLOWED_DIRECTORIES` environment variable**
- **Token**: None (uses project path from env)

### 3. **git** (Repository Operations)

- **Purpose**: Advanced Git analysis and operations
- **Setup**: Works automatically
- **Token**: None

### 4. **github** (GitHub API)

- **Purpose**: Manage issues, PRs, releases
- **Setup**: **Requires `GITHUB_TOKEN` environment variable**
- **Token**: Personal Access Token (PAT)

### 5. **memory** (Persistent Context)

- **Purpose**: Remember decisions across sessions
- **Setup**: Works automatically
- **Token**: None

## Security Notes

⚠️ **NEVER commit your `.env` file!**

- `.env` is in `.gitignore` (already configured)
- Only commit `.env.example` with placeholder values
- Share setup instructions, not actual tokens

## Troubleshooting

### MCP servers not working?

```bash
# Check if all variables are set
echo $ALLOWED_DIRECTORIES
echo $POSTGRES_CONNECTION_STRING
echo $GITHUB_TOKEN

# If empty, export them:
export ALLOWED_DIRECTORIES="/Users/kofi/_/declarelang"
export POSTGRES_CONNECTION_STRING="postgresql://localhost/declarelang_dev"
export GITHUB_TOKEN="ghp_your_token"

# Restart Claude Code
```

### PostgreSQL connection failed?

```bash
# Test connection manually
psql "$POSTGRES_CONNECTION_STRING" -c "SELECT version();"

# Common issues:
# - Database doesn't exist: createdb declarelang_dev
# - Wrong credentials: Update POSTGRES_CONNECTION_STRING in .env
# - PostgreSQL not running: brew services start postgresql
```

### Token expired?

- GitHub tokens don't expire unless configured
- Regenerate at https://github.com/settings/tokens
- Update in `.env` and reload shell

## Alternative: Per-User Config

If you don't want to use shell environment variables, you can create a **local override**:

```bash
# Create a git-ignored local config
cp .claude/mcp-config.json .claude/mcp-config.local.json

# Edit .claude/mcp-config.local.json with your actual token
# Then add to .gitignore:
echo ".claude/mcp-config.local.json" >> .gitignore
```

**Note**: Claude Code currently reads from `mcp-config.json`, so the environment variable approach is recommended.
