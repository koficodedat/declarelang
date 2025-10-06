import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../src/tokenizer/tokenizer.js';
import { LOGParser } from '../../src/parsers/log-parser.js';
import { LogLevel } from '../../src/types/ast.js';

describe('LOGParser', () => {
  const parse = (input: string) => {
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const parser = new LOGParser(tokens);
    return parser.parse();
  };

  describe('Log Sections', () => {
    it('should parse log for all mutations', () => {
      const input = `
Log for all mutations:
- user id
- action
- timestamp
`;

      const result = parse(input);

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]!.scope.type).toBe('all_mutations');
      expect(result.logs[0]!.items).toHaveLength(3);
      expect(result.logs[0]!.items[0]!.type).toBe('field');
      expect(result.logs[0]!.items[0]!.field).toBe('user id');
      expect(result.logs[0]!.items[1]!.field).toBe('action');
      expect(result.logs[0]!.items[2]!.field).toBe('timestamp');
    });

    it('should parse log for specific model', () => {
      const input = `
Log for Post[s]:
- create with title and user id
- update with changed fields only
- delete with post id

Audit for Post[s]:
- who created
`;

      const result = parse(input);

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]!.scope.type).toBe('model');
      expect(result.logs[0]!.scope.modelName?.singular).toBe('Post');
      expect(result.logs[0]!.items).toHaveLength(3);
    });

    it('should parse action with full data', () => {
      const input = `
Log for User[s]:
- create with full data

Audit for User[s]:
- who created
`;

      const result = parse(input);

      expect(result.logs[0]!.items[0]!.type).toBe('action_with_detail');
      expect(result.logs[0]!.items[0]!.action).toBe('create');
      expect(result.logs[0]!.items[0]!.detail?.type).toBe('full_data');
    });

    it('should parse action with changed fields only', () => {
      const input = `
Log for Post[s]:
- update with changed fields only

Audit for Post[s]:
- who updated
`;

      const result = parse(input);

      expect(result.logs[0]!.items[0]!.type).toBe('action_with_detail');
      expect(result.logs[0]!.items[0]!.action).toBe('update');
      expect(result.logs[0]!.items[0]!.detail?.type).toBe('changed_fields_only');
    });

    it('should parse action with single field only', () => {
      const input = `
Log for User[s]:
- create with email only

Audit for User[s]:
- who created
`;

      const result = parse(input);

      expect(result.logs[0]!.items[0]!.type).toBe('action_with_detail');
      expect(result.logs[0]!.items[0]!.action).toBe('create');
      expect(result.logs[0]!.items[0]!.detail?.type).toBe('specific_fields');
      expect(result.logs[0]!.items[0]!.detail?.fields).toEqual(['email']);
    });

    it('should parse action with multiple specific fields', () => {
      const input = `
Log for User[s]:
- login with timestamp and ip address

Audit for User[s]:
- when created
`;

      const result = parse(input);

      expect(result.logs[0]!.items[0]!.type).toBe('action_with_detail');
      expect(result.logs[0]!.items[0]!.action).toBe('login');
      expect(result.logs[0]!.items[0]!.detail?.type).toBe('specific_fields');
      expect(result.logs[0]!.items[0]!.detail?.fields).toEqual(['timestamp', 'ip address']);
    });

    it('should parse multi-word actions', () => {
      const input = `
Log for User[s]:
- password change with timestamp
- role change with old role and new role

Audit for User[s]:
- when created
`;

      const result = parse(input);

      expect(result.logs[0]!.items[0]!.action).toBe('password change');
      expect(result.logs[0]!.items[1]!.action).toBe('role change');
      expect(result.logs[0]!.items[1]!.detail?.fields).toEqual(['old role', 'new role']);
    });

    it('should parse multiple log sections', () => {
      const input = `
Log for Post[s]:
- create with title

Log for User[s]:
- create with email

Audit for Post[s]:
- who created

Audit for User[s]:
- who created
`;

      const result = parse(input);

      expect(result.logs).toHaveLength(2);
      expect(result.logs[0]!.scope.modelName?.singular).toBe('Post');
      expect(result.logs[1]!.scope.modelName?.singular).toBe('User');
    });
  });

  describe('Audit Sections', () => {
    it('should parse who actions', () => {
      const input = `
Log for Post[s]:
- create with title

Audit for Post[s]:
- who created
- who updated
- who deleted
`;

      const result = parse(input);

      expect(result.audits).toHaveLength(1);
      expect(result.audits[0]!.modelName.singular).toBe('Post');
      expect(result.audits[0]!.items).toHaveLength(3);
      expect(result.audits[0]!.items[0]!.type).toBe('who_action');
      expect(result.audits[0]!.items[0]!.action).toBe('created');
      expect(result.audits[0]!.items[1]!.action).toBe('updated');
      expect(result.audits[0]!.items[2]!.action).toBe('deleted');
    });

    it('should parse when events', () => {
      const input = `
Log for Post[s]:
- publish with post id

Audit for Post[s]:
- when published
- when created
`;

      const result = parse(input);

      expect(result.audits[0]!.items[0]!.type).toBe('when_event');
      expect(result.audits[0]!.items[0]!.event).toBe('published');
      expect(result.audits[0]!.items[1]!.event).toBe('created');
    });

    it('should parse generic audit items', () => {
      const input = `
Log for User[s]:
- login with timestamp

Audit for User[s]:
- last login
- password changes
- role changes
`;

      const result = parse(input);

      expect(result.audits[0]!.items[0]!.type).toBe('generic');
      expect(result.audits[0]!.items[0]!.field).toBe('last login');
      expect(result.audits[0]!.items[1]!.field).toBe('password changes');
      expect(result.audits[0]!.items[2]!.field).toBe('role changes');
    });

    it('should parse multiple audit sections', () => {
      const input = `
Log for Post[s]:
- create with title

Log for User[s]:
- create with email

Audit for Post[s]:
- who created

Audit for User[s]:
- who created
- last login
`;

      const result = parse(input);

      expect(result.audits).toHaveLength(2);
      expect(result.audits[0]!.modelName.singular).toBe('Post');
      expect(result.audits[1]!.modelName.singular).toBe('User');
      expect(result.audits[1]!.items).toHaveLength(2);
    });
  });

  describe('Log Level Sections', () => {
    it('should parse debug level', () => {
      const input = `
Log for Post[s]:
- create with title

Audit for Post[s]:
- who created

Log level debug for:
- query execution
- cache operations
`;

      const result = parse(input);

      expect(result.levels).toHaveLength(1);
      expect(result.levels[0]!.level).toBe(LogLevel.DEBUG);
      expect(result.levels[0]!.conditions).toHaveLength(2);
      expect(result.levels[0]!.conditions[0]!.description).toBe('query execution');
      expect(result.levels[0]!.conditions[1]!.description).toBe('cache operations');
    });

    it('should parse info level', () => {
      const input = `
Log for Post[s]:
- create with title

Audit for Post[s]:
- who created

Log level info for:
- successful requests
- user actions
`;

      const result = parse(input);

      expect(result.levels[0]!.level).toBe(LogLevel.INFO);
      expect(result.levels[0]!.conditions[0]!.description).toBe('successful requests');
    });

    it('should parse warning level with thresholds', () => {
      const input = `
Log for Post[s]:
- create with title

Audit for Post[s]:
- who created

Log level warning for:
- slow queries over 500 milliseconds
- high memory usage over 80 percent
`;

      const result = parse(input);

      expect(result.levels[0]!.level).toBe(LogLevel.WARNING);
      expect(result.levels[0]!.conditions).toHaveLength(2);

      const slowQuery = result.levels[0]!.conditions[0]!;
      expect(slowQuery.description).toBe('slow queries over 500 milliseconds');
      expect(slowQuery.metric).toBe('slow queries');
      expect(slowQuery.threshold).toBe(500);

      const memoryUsage = result.levels[0]!.conditions[1]!;
      expect(memoryUsage.description).toBe('high memory usage over 80 percent');
      expect(memoryUsage.metric).toBe('high memory usage');
      expect(memoryUsage.threshold).toBe(80);
    });

    it('should parse error level', () => {
      const input = `
Log for Post[s]:
- create with title

Audit for Post[s]:
- who created

Log level error for:
- failed requests
- database errors
`;

      const result = parse(input);

      expect(result.levels[0]!.level).toBe(LogLevel.ERROR);
      expect(result.levels[0]!.conditions[0]!.description).toBe('failed requests');
      expect(result.levels[0]!.conditions[1]!.description).toBe('database errors');
    });

    it('should parse multiple log levels', () => {
      const input = `
Log for Post[s]:
- create with title

Audit for Post[s]:
- who created

Log level debug for:
- query execution

Log level info for:
- user actions

Log level warning for:
- slow queries over 500 milliseconds

Log level error for:
- database errors
`;

      const result = parse(input);

      expect(result.levels).toHaveLength(4);
      expect(result.levels[0]!.level).toBe(LogLevel.DEBUG);
      expect(result.levels[1]!.level).toBe(LogLevel.INFO);
      expect(result.levels[2]!.level).toBe(LogLevel.WARNING);
      expect(result.levels[3]!.level).toBe(LogLevel.ERROR);
    });
  });

  describe('Exclude Section', () => {
    it('should parse exclude from logs', () => {
      const input = `
Log for User[s]:
- create with email

Audit for User[s]:
- who created

Exclude from logs:
- password fields
- sensitive user data
- payment information
`;

      const result = parse(input);

      expect(result.exclude).toBeDefined();
      expect(result.exclude!.items).toHaveLength(3);
      expect(result.exclude!.items[0]).toBe('password fields');
      expect(result.exclude!.items[1]).toBe('sensitive user data');
      expect(result.exclude!.items[2]).toBe('payment information');
    });
  });

  describe('Complete Files', () => {
    it('should parse complete blog example', () => {
      const input = `
Log for all mutations:
- user id
- action
- resource
- timestamp

Log for Post[s]:
- create with title and user id
- update with changed fields only
- delete with post id

Audit for Post[s]:
- who created
- who updated
- when published

Audit for User[s]:
- when created
- last login

Log level debug for:
- query execution

Log level info for:
- successful requests

Log level warning for:
- slow queries over 500 milliseconds

Log level error for:
- database errors

Exclude from logs:
- password fields
`;

      const result = parse(input);

      expect(result.logs).toHaveLength(2);
      expect(result.audits).toHaveLength(2);
      expect(result.levels).toHaveLength(4);
      expect(result.exclude).toBeDefined();
    });
  });

  describe('Model Name Pluralization', () => {
    it('should parse model with bracket pluralization', () => {
      const input = `
Log for User[s]:
- create with email

Audit for User[s]:
- who created
`;

      const result = parse(input);

      expect(result.logs[0]!.scope.modelName?.singular).toBe('User');
      expect(result.logs[0]!.scope.modelName?.plural).toBe('Users');
      expect(result.audits[0]!.modelName.singular).toBe('User');
      expect(result.audits[0]!.modelName.plural).toBe('Users');
    });

    it('should parse model with irregular pluralization', () => {
      const input = `
Log for Categor[y|ies]:
- create with name

Audit for Categor[y|ies]:
- who created
`;

      const result = parse(input);

      expect(result.logs[0]!.scope.modelName?.singular).toBe('Category');
      expect(result.logs[0]!.scope.modelName?.plural).toBe('Categories');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file', () => {
      const input = '';
      const result = parse(input);

      expect(result.logs).toHaveLength(0);
      expect(result.audits).toHaveLength(0);
      expect(result.levels).toHaveLength(0);
    });

    it('should handle file with only comments', () => {
      const input = `
# This is a comment
# Another comment
`;
      const result = parse(input);

      expect(result.logs).toHaveLength(0);
      expect(result.audits).toHaveLength(0);
    });

    it('should throw on duplicate exclude section', () => {
      const input = `
Log for Post[s]:
- create with title

Audit for Post[s]:
- who created

Exclude from logs:
- password

Exclude from logs:
- email
`;

      expect(() => parse(input)).toThrow('Duplicate Exclude section');
    });

    it('should throw on missing log items', () => {
      const input = `
Log for Post[s]:

Audit for Post[s]:
- who created
`;

      expect(() => parse(input)).toThrow();
    });

    it('should throw on missing audit items', () => {
      const input = `
Log for Post[s]:
- create with title

Audit for Post[s]:
`;

      expect(() => parse(input)).toThrow();
    });

    it('should throw on missing level conditions', () => {
      const input = `
Log for Post[s]:
- create with title

Audit for Post[s]:
- who created

Log level debug for:
`;

      expect(() => parse(input)).toThrow();
    });

    it('should throw on invalid log level', () => {
      const input = `
Log for Post[s]:
- create with title

Audit for Post[s]:
- who created

Log level invalid for:
- something
`;

      expect(() => parse(input)).toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw on missing colon after log scope', () => {
      const input = `
Log for Posts
- create with title
`;

      expect(() => parse(input)).toThrow('Expected ":" after log scope');
    });

    it('should throw on missing "for" keyword in log', () => {
      const input = `
Log Posts:
- create with title
`;

      expect(() => parse(input)).toThrow('Expected "for" after "Log"');
    });

    it('should throw on missing "for" keyword in audit', () => {
      const input = `
Log for Post[s]:
- create with title

Audit Posts:
- who created
`;

      expect(() => parse(input)).toThrow('Expected "for" after "Audit"');
    });

    it('should throw on missing model name in audit', () => {
      const input = `
Log for Post[s]:
- create with title

Audit for:
- who created
`;

      expect(() => parse(input)).toThrow();
    });

    it('should throw on missing "from" in exclude', () => {
      const input = `
Log for Post[s]:
- create with title

Audit for Post[s]:
- who created

Exclude logs:
- password
`;

      expect(() => parse(input)).toThrow('Expected "from" after "Exclude"');
    });

    it('should throw on missing "logs" in exclude', () => {
      const input = `
Log for Post[s]:
- create with title

Audit for Post[s]:
- who created

Exclude from:
- password
`;

      expect(() => parse(input)).toThrow('Expected "logs" after "from"');
    });

    it('should throw on unexpected token', () => {
      const input = `
Log for Post[s]:
- create with title

Audit for Post[s]:
- who created

Invalid section here
`;

      expect(() => parse(input)).toThrow('Unexpected token');
    });
  });
});
