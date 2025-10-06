# Claude Code Configuration

This directory contains Claude Code configuration for the DeclareLang project.

## Slash Commands

- `/test-parser [dsl-type]` - Run parser tests (optionally for specific DSL type)
- `/validate-dsl [file]` - Validate DSL files against grammar spec
- `/impl-spec <feature>` - Implement feature from specification
- `/coverage [package]` - Check test coverage and identify gaps
- `/check-spec <spec-name>` - Compare implementation vs specification
- `/new-package <name>` - Create new monorepo package

## MCP Servers

Configure MCP servers in your Claude Code settings:

### PostgreSQL Server

For testing generated database schemas:

```json
{
  "postgres": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres"],
    "env": {
      "POSTGRES_CONNECTION_STRING": "postgresql://localhost/declarelang_dev"
    }
  }
}
```

### Filesystem Server

Enhanced file operations:

```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem"],
    "env": {
      "ALLOWED_DIRECTORIES": "/Users/kofi/_/declarelang"
    }
  }
}
```

## Hooks

- `user-prompt-submit.md` - Auto-suggests relevant spec files based on user intent

## Usage Tips

1. **Starting a feature**: Use `/impl-spec <feature>` to read specs first
2. **Testing**: Use `/test-parser` frequently during development
3. **Coverage**: Run `/coverage` before committing
4. **Validation**: Use `/validate-dsl` to test DSL examples
5. **Spec alignment**: Use `/check-spec` to ensure implementation matches docs
