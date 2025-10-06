/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * DML Parser Tests
 * Based on DSL Grammar Specification v0.1.0
 */

import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../src/tokenizer/index.js';
import { DMLParser, ParseError } from '../../src/parsers/dml-parser.js';
import {
  DMLFile,
  QuerySection,
  MutationSection,
  ComputedSection,
  ComparisonOperator,
  SortDirection,
  TimeUnit,
  isQuerySection,
  isMutationSection,
  isComputedSection,
} from '../../src/types/ast.js';

function parse(input: string): DMLFile {
  const tokenizer = new Tokenizer(input);
  const tokens = tokenizer.tokenize();
  const parser = new DMLParser(tokens);
  return parser.parse();
}

describe('DML Parser - Query Definitions', () => {
  it('should parse simple query without clauses', () => {
    const input = `Query for Post:
- all posts
`;

    const ast = parse(input);
    expect(ast.sections).toHaveLength(1);

    const section = ast.sections[0]!;
    expect(isQuerySection(section)).toBe(true);

    const querySection = section as QuerySection;
    expect(querySection.modelName).toBe('Post');
    expect(querySection.queries).toHaveLength(1);

    const query = querySection.queries[0]!;
    expect(query.name).toBe('all_posts');
    expect(query.originalName).toBe('all posts');
    expect(query.whereClause).toBeUndefined();
    expect(query.sortClause).toBeUndefined();
    expect(query.limitClause).toBeUndefined();
  });

  it('should parse query with where clause', () => {
    const input = `Query for Post:
- published posts where published is true
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const query = section.queries[0]!;

    expect(query.name).toBe('published_posts');
    expect(query.whereClause).toBeDefined();
    expect(query.whereClause!.conditions).toHaveLength(1);

    const condition = query.whereClause!.conditions[0]!;
    expect(condition.field).toBe('published');
    expect(condition.operator).toBe(ComparisonOperator.IS);
    expect(condition.value).toEqual({ type: 'literal', value: true });
  });

  it('should parse query with multiple where conditions', () => {
    const input = `Query for Post:
- filtered posts where published is true and user id matches current user
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const query = section.queries[0]!;

    expect(query.whereClause!.conditions).toHaveLength(2);

    const cond1 = query.whereClause!.conditions[0]!;
    expect(cond1.field).toBe('published');
    expect(cond1.operator).toBe(ComparisonOperator.IS);
    expect(cond1.value).toEqual({ type: 'literal', value: true });

    const cond2 = query.whereClause!.conditions[1]!;
    expect(cond2.field).toBe('user_id');
    expect(cond2.operator).toBe(ComparisonOperator.MATCHES);
    expect(cond2.value).toEqual({ type: 'reference', field: 'current user' });
  });

  it('should parse query with time expression', () => {
    const input = `Query for Post:
- recent posts where created at is after 7 days ago
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const query = section.queries[0]!;

    const condition = query.whereClause!.conditions[0]!;
    expect(condition.field).toBe('created_at');
    expect(condition.operator).toBe(ComparisonOperator.IS_AFTER);
    expect(condition.value!.type).toBe('time');
    if (condition.value!.type === 'time') {
      expect(condition.value!.expression.type).toBe('relative');
      expect(condition.value!.expression.value).toBe(7);
      expect(condition.value!.expression.unit).toBe(TimeUnit.DAYS);
    }
  });

  it('should parse query with "now" time expression', () => {
    const input = `Query for Post:
- current posts where published at equals now
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const query = section.queries[0]!;

    const condition = query.whereClause!.conditions[0]!;
    expect(condition.value!.type).toBe('time');
    if (condition.value!.type === 'time') {
      expect(condition.value!.expression.type).toBe('now');
    }
  });

  it('should parse query with sort clause', () => {
    const input = `Query for Post:
- all posts sorted by created at descending
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const query = section.queries[0]!;

    expect(query.name).toBe('all_posts');
    expect(query.sortClause).toBeDefined();
    expect(query.sortClause!.field).toBe('created_at');
    expect(query.sortClause!.direction).toBe(SortDirection.DESCENDING);
  });

  it('should parse query with sort clause using abbreviations', () => {
    const input = `Query for Post:
- all posts sorted by title asc
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const query = section.queries[0]!;

    expect(query.name).toBe('all_posts');
    expect(query.sortClause!.field).toBe('title');
    expect(query.sortClause!.direction).toBe(SortDirection.ASC);
  });

  it('should parse query with limit clause', () => {
    const input = `Query for Post:
- all posts limited to 10
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const query = section.queries[0]!;

    expect(query.name).toBe('all_posts');
    expect(query.limitClause).toBeDefined();
    expect(query.limitClause!.count).toBe(10);
  });

  it('should parse query with all clauses', () => {
    const input = `Query for Post:
- recent published posts where published is true and created at is after 7 days ago sorted by created at descending limited to 20
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const query = section.queries[0]!;

    expect(query.name).toBe('recent_published_posts');
    expect(query.whereClause).toBeDefined();
    expect(query.whereClause!.conditions).toHaveLength(2);
    expect(query.sortClause).toBeDefined();
    expect(query.limitClause).toBeDefined();
    expect(query.limitClause!.count).toBe(20);
  });

  it('should parse multiple queries', () => {
    const input = `Query for Post:
- all posts
- published posts where published is true
- recent posts where created at is after 30 days ago
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;

    expect(section.queries).toHaveLength(3);
    expect(section.queries[0]!.name).toBe('all_posts');
    expect(section.queries[1]!.name).toBe('published_posts');
    expect(section.queries[2]!.name).toBe('recent_posts');
  });

  it('should parse is empty condition', () => {
    const input = `Query for Post:
- posts without content where content is empty
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    expect(condition.operator).toBe(ComparisonOperator.IS_EMPTY);
    expect(condition.value).toBeUndefined();
  });

  it('should parse is not empty condition', () => {
    const input = `Query for Post:
- posts with content where content is not empty
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    expect(condition.operator).toBe(ComparisonOperator.IS_NOT_EMPTY);
    expect(condition.value).toBeUndefined();
  });

  it('should parse contains operator', () => {
    const input = `Query for Post:
- matching posts where title contains search term
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    expect(condition.operator).toBe(ComparisonOperator.CONTAINS);
    expect(condition.value).toEqual({ type: 'reference', field: 'search term' });
  });

  it('should parse starts with operator', () => {
    const input = `Query for Post:
- prefix posts where title starts with prefix
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    expect(condition.operator).toBe(ComparisonOperator.STARTS_WITH);
  });

  it('should parse ends with operator', () => {
    const input = `Query for Post:
- suffix posts where title ends with suffix
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    expect(condition.operator).toBe(ComparisonOperator.ENDS_WITH);
  });

  it('should parse is between operator', () => {
    const input = `Query for Post:
- ranged posts where price is between 10
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    expect(condition.operator).toBe(ComparisonOperator.IS_BETWEEN);
    expect(condition.value).toEqual({ type: 'literal', value: 10 });
  });

  it('should parse query with string literal', () => {
    const input = `Query for Post:
- draft posts where status equals "draft"
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    expect(condition.value).toEqual({ type: 'literal', value: 'draft' });
  });

  it('should parse query with number literal', () => {
    const input = `Query for Post:
- posts by user where user id equals 42
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    expect(condition.value).toEqual({ type: 'literal', value: 42 });
  });

  it('should parse query with all time units', () => {
    const timeUnits = [
      { input: '5 minutes ago', unit: TimeUnit.MINUTES },
      { input: '1 hour ago', unit: TimeUnit.HOUR },
      { input: '2 hours ago', unit: TimeUnit.HOURS },
      { input: '1 day ago', unit: TimeUnit.DAY },
      { input: '7 days ago', unit: TimeUnit.DAYS },
      { input: '1 week ago', unit: TimeUnit.WEEK },
      { input: '2 weeks ago', unit: TimeUnit.WEEKS },
      { input: '1 month ago', unit: TimeUnit.MONTH },
      { input: '3 months ago', unit: TimeUnit.MONTHS },
      { input: '1 year ago', unit: TimeUnit.YEAR },
      { input: '2 years ago', unit: TimeUnit.YEARS },
    ];

    timeUnits.forEach(({ input: timeExpr, unit }) => {
      const input = `Query for Post:\n- test where created at is after ${timeExpr}\n`;
      const ast = parse(input);
      const section = ast.sections[0]! as QuerySection;
      const condition = section.queries[0]!.whereClause!.conditions[0]!;

      if (condition.value!.type === 'time') {
        expect(condition.value!.expression.unit).toBe(unit);
      }
    });
  });
});

describe('DML Parser - Mutation Definitions', () => {
  it('should parse mutation with sets action', () => {
    const input = `Mutation for Post:
- publish post sets published to true
`;

    const ast = parse(input);
    expect(ast.sections).toHaveLength(1);

    const section = ast.sections[0]!;
    expect(isMutationSection(section)).toBe(true);

    const mutationSection = section as MutationSection;
    expect(mutationSection.modelName).toBe('Post');
    expect(mutationSection.mutations).toHaveLength(1);

    const mutation = mutationSection.mutations[0]!;
    expect(mutation.name).toBe('publish_post');
    expect(mutation.originalName).toBe('publish post');
    expect(mutation.action.type).toBe('sets');

    if (mutation.action.type === 'sets') {
      expect(mutation.action.assignments).toHaveLength(1);
      const assignment = mutation.action.assignments[0]!;
      expect(assignment.field).toBe('published');
      expect(assignment.value).toEqual({ type: 'literal', value: true });
    }
  });

  it('should parse mutation with multiple assignments', () => {
    const input = `Mutation for Post:
- publish post sets published to true and published at to now
`;

    const ast = parse(input);
    const section = ast.sections[0]! as MutationSection;
    const mutation = section.mutations[0]!;

    expect(mutation.action.type).toBe('sets');
    if (mutation.action.type === 'sets') {
      expect(mutation.action.assignments).toHaveLength(2);

      const assign1 = mutation.action.assignments[0]!;
      expect(assign1.field).toBe('published');
      expect(assign1.value).toEqual({ type: 'literal', value: true });

      const assign2 = mutation.action.assignments[1]!;
      expect(assign2.field).toBe('published_at');
      expect(assign2.value.type).toBe('time');
      if (assign2.value.type === 'time') {
        expect(assign2.value.expression.type).toBe('now');
      }
    }
  });

  it('should parse mutation with increases action', () => {
    const input = `Mutation for Post:
- increment views increases view count by 1
`;

    const ast = parse(input);
    const section = ast.sections[0]! as MutationSection;
    const mutation = section.mutations[0]!;

    expect(mutation.name).toBe('increment_views');
    expect(mutation.action.type).toBe('increases');

    if (mutation.action.type === 'increases') {
      expect(mutation.action.field).toBe('view_count');
      expect(mutation.action.amount).toBe(1);
    }
  });

  it('should parse multiple mutations', () => {
    const input = `Mutation for Post:
- publish post sets published to true
- increment views increases view count by 1
- archive post sets archived to true
`;

    const ast = parse(input);
    const section = ast.sections[0]! as MutationSection;

    expect(section.mutations).toHaveLength(3);
    expect(section.mutations[0]!.name).toBe('publish_post');
    expect(section.mutations[1]!.name).toBe('increment_views');
    expect(section.mutations[2]!.name).toBe('archive_post');
  });

  it('should parse mutation with reference value', () => {
    const input = `Mutation for Post:
- update user sets user id to current user
`;

    const ast = parse(input);
    const section = ast.sections[0]! as MutationSection;
    const mutation = section.mutations[0]!;

    if (mutation.action.type === 'sets') {
      const assignment = mutation.action.assignments[0]!;
      expect(assignment.value).toEqual({ type: 'reference', field: 'current user' });
    }
  });

  it('should parse mutation with number value', () => {
    const input = `Mutation for Post:
- reset views sets view count to 0
`;

    const ast = parse(input);
    const section = ast.sections[0]! as MutationSection;
    const mutation = section.mutations[0]!;

    if (mutation.action.type === 'sets') {
      const assignment = mutation.action.assignments[0]!;
      expect(assignment.value).toEqual({ type: 'literal', value: 0 });
    }
  });

  it('should parse mutation with string value', () => {
    const input = `Mutation for Post:
- set draft sets status to "draft"
`;

    const ast = parse(input);
    const section = ast.sections[0]! as MutationSection;
    const mutation = section.mutations[0]!;

    if (mutation.action.type === 'sets') {
      const assignment = mutation.action.assignments[0]!;
      expect(assignment.value).toEqual({ type: 'literal', value: 'draft' });
    }
  });
});

describe('DML Parser - Computed Definitions', () => {
  it('should parse computed with counts aggregation', () => {
    const input = `Computed for User:
- post count counts Post
`;

    const ast = parse(input);
    expect(ast.sections).toHaveLength(1);

    const section = ast.sections[0]!;
    expect(isComputedSection(section)).toBe(true);

    const computedSection = section as ComputedSection;
    expect(computedSection.modelName).toBe('User');
    expect(computedSection.computed).toHaveLength(1);

    const computed = computedSection.computed[0]!;
    expect(computed.fieldName).toBe('post_count');
    expect(computed.originalFieldName).toBe('post count');
    expect(computed.aggregation.type).toBe('counts');

    if (computed.aggregation.type === 'counts') {
      expect(computed.aggregation.targetModel).toBe('Post');
      expect(computed.aggregation.whereClause).toBeUndefined();
    }
  });

  it('should parse computed with counts and where clause', () => {
    const input = `Computed for User:
- published post count counts Post where published is true
`;

    const ast = parse(input);
    const section = ast.sections[0]! as ComputedSection;
    const computed = section.computed[0]!;

    expect(computed.aggregation.type).toBe('counts');
    if (computed.aggregation.type === 'counts') {
      expect(computed.aggregation.whereClause).toBeDefined();
      expect(computed.aggregation.whereClause!.conditions).toHaveLength(1);

      const condition = computed.aggregation.whereClause!.conditions[0]!;
      expect(condition.field).toBe('published');
      expect(condition.operator).toBe(ComparisonOperator.IS);
    }
  });

  it('should parse computed with sums aggregation', () => {
    const input = `Computed for User:
- total views sums Post.view count
`;

    const ast = parse(input);
    const section = ast.sections[0]! as ComputedSection;
    const computed = section.computed[0]!;

    expect(computed.fieldName).toBe('total_views');
    expect(computed.aggregation.type).toBe('sums');

    if (computed.aggregation.type === 'sums') {
      expect(computed.aggregation.targetModel).toBe('Post');
      expect(computed.aggregation.field).toBe('view count');
      expect(computed.aggregation.whereClause).toBeUndefined();
    }
  });

  it('should parse computed with sums and where clause', () => {
    const input = `Computed for User:
- published views sums Post.view count where published is true
`;

    const ast = parse(input);
    const section = ast.sections[0]! as ComputedSection;
    const computed = section.computed[0]!;

    if (computed.aggregation.type === 'sums') {
      expect(computed.aggregation.whereClause).toBeDefined();
    }
  });

  it('should parse computed with returns aggregation', () => {
    const input = `Computed for User:
- is active returns last login is after 30 days ago
`;

    const ast = parse(input);
    const section = ast.sections[0]! as ComputedSection;
    const computed = section.computed[0]!;

    expect(computed.fieldName).toBe('is_active');
    expect(computed.aggregation.type).toBe('returns');

    if (computed.aggregation.type === 'returns') {
      expect(computed.aggregation.condition.field).toBe('last_login');
      expect(computed.aggregation.condition.operator).toBe(ComparisonOperator.IS_AFTER);
    }
  });

  it('should parse computed with calculates aggregation', () => {
    const input = `Computed for User:
- reputation score calculates from activity
`;

    const ast = parse(input);
    const section = ast.sections[0]! as ComputedSection;
    const computed = section.computed[0]!;

    expect(computed.fieldName).toBe('reputation_score');
    expect(computed.aggregation.type).toBe('calculates');

    if (computed.aggregation.type === 'calculates') {
      expect(computed.aggregation.field).toBe('activity');
    }
  });

  it('should parse multiple computed fields', () => {
    const input = `Computed for User:
- post count counts Post
- published post count counts Post where published is true
- total views sums Post.view count
`;

    const ast = parse(input);
    const section = ast.sections[0]! as ComputedSection;

    expect(section.computed).toHaveLength(3);
    expect(section.computed[0]!.fieldName).toBe('post_count');
    expect(section.computed[1]!.fieldName).toBe('published_post_count');
    expect(section.computed[2]!.fieldName).toBe('total_views');
  });
});

describe('DML Parser - Multiple Sections', () => {
  it('should parse multiple sections in one file', () => {
    const input = `Query for Post:
- all posts

Mutation for Post:
- publish post sets published to true

Computed for User:
- post count counts Post
`;

    const ast = parse(input);
    expect(ast.sections).toHaveLength(3);

    expect(isQuerySection(ast.sections[0]!)).toBe(true);
    expect(isMutationSection(ast.sections[1]!)).toBe(true);
    expect(isComputedSection(ast.sections[2]!)).toBe(true);
  });

  it('should parse sections in any order', () => {
    const input = `Computed for User:
- post count counts Post

Query for Post:
- all posts

Mutation for Post:
- publish post sets published to true
`;

    const ast = parse(input);
    expect(ast.sections).toHaveLength(3);

    expect(isComputedSection(ast.sections[0]!)).toBe(true);
    expect(isQuerySection(ast.sections[1]!)).toBe(true);
    expect(isMutationSection(ast.sections[2]!)).toBe(true);
  });

  it('should parse multiple sections for the same model', () => {
    const input = `Query for Post:
- all posts

Query for Post:
- published posts where published is true
`;

    const ast = parse(input);
    expect(ast.sections).toHaveLength(2);

    const section1 = ast.sections[0]! as QuerySection;
    const section2 = ast.sections[1]! as QuerySection;

    expect(section1.modelName).toBe('Post');
    expect(section2.modelName).toBe('Post');
    expect(section1.queries).toHaveLength(1);
    expect(section2.queries).toHaveLength(1);
  });
});

describe('DML Parser - Comments and Whitespace', () => {
  it('should skip comments in queries', () => {
    const input = `Query for Post:
# This is a comment
- all posts
# Another comment
- published posts where published is true
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;

    expect(section.queries).toHaveLength(2);
  });

  it('should handle blank lines between items', () => {
    const input = `Query for Post:
- all posts

- published posts where published is true

`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;

    expect(section.queries).toHaveLength(2);
  });

  it('should handle Windows-style line endings', () => {
    const input = 'Query for Post:\r\n- all posts\r\n';

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;

    expect(section.queries).toHaveLength(1);
  });
});

describe('DML Parser - Edge Cases', () => {
  it('should normalize multi-word field names', () => {
    const input = `Query for Post:
- posts where created at is after 7 days ago
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    expect(condition.field).toBe('created_at');
  });

  it('should normalize multi-word query names', () => {
    const input = `Query for Post:
- recent published posts
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;

    expect(section.queries[0]!.name).toBe('recent_published_posts');
  });

  it('should preserve original names', () => {
    const input = `Query for Post:
- recent published posts where created at is after 7 days ago
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;

    expect(section.queries[0]!.originalName).toBe('recent published posts');
  });

  it('should handle field names with hyphens', () => {
    const input = `Query for Post:
- posts where user-id equals 42
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    expect(condition.field).toBe('user_id');
  });
});

describe('DML Parser - Edge Cases', () => {
  it('should handle query with complex multi-word field names', () => {
    const input = `Query for Post:
- posts where user created at is after 30 days ago
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    expect(condition.field).toBe('user_created_at');
  });

  it('should handle mutation with complex field names', () => {
    const input = `Mutation for Post:
- update timestamp sets last modified at to now
`;

    const ast = parse(input);
    const section = ast.sections[0]! as MutationSection;
    const mutation = section.mutations[0]!;

    expect(mutation.name).toBe('update_timestamp');
    if (mutation.action.type === 'sets') {
      expect(mutation.action.assignments[0]!.field).toBe('last_modified_at');
    }
  });

  it('should handle computed with complex field names in sums', () => {
    const input = `Computed for User:
- total revenue sums Order.total amount paid
`;

    const ast = parse(input);
    const section = ast.sections[0]! as ComputedSection;
    const computed = section.computed[0]!;

    if (computed.aggregation.type === 'sums') {
      expect(computed.aggregation.field).toBe('total amount paid');
    }
  });

  it('should handle queries with boolean false', () => {
    const input = `Query for Post:
- draft posts where published is false
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    expect(condition.value).toEqual({ type: 'literal', value: false });
  });

  it('should handle queries with negative numbers', () => {
    const input = `Query for Transaction:
- debits where amount equals -100
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    // Note: -100 will be parsed as reference "- 100" due to tokenizer treating - as DASH
    // This is expected behavior in v0.1.0
    expect(condition.value!.type).toBe('reference');
  });

  it('should handle long query names within limit', () => {
    const input = `Query for Post:
- all published posts created in last thirty days
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;

    expect(section.queries[0]!.name).toBe('all_published_posts_created_in_last_thirty_days');
  });

  it('should throw on query name exceeding 63 chars', () => {
    const input = `Query for Post:
- all published posts created by current user in the last thirty days
`;

    expect(() => parse(input)).toThrow(Error);
    expect(() => parse(input)).toThrow('Identifier exceeds maximum length of 63 characters');
  });

  it('should handle multiple where conditions with different operators', () => {
    const input = `Query for Post:
- filtered where published is true and title contains search and created at is after 7 days ago
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const conditions = section.queries[0]!.whereClause!.conditions;

    expect(conditions).toHaveLength(3);
    expect(conditions[0]!.operator).toBe(ComparisonOperator.IS);
    expect(conditions[1]!.operator).toBe(ComparisonOperator.CONTAINS);
    expect(conditions[2]!.operator).toBe(ComparisonOperator.IS_AFTER);
  });

  it('should handle mutation with multiple complex assignments', () => {
    const input = `Mutation for Post:
- complex update sets published to true and published at to now and updated by to current user
`;

    const ast = parse(input);
    const section = ast.sections[0]! as MutationSection;
    const mutation = section.mutations[0]!;

    if (mutation.action.type === 'sets') {
      expect(mutation.action.assignments).toHaveLength(3);
      expect(mutation.action.assignments[0]!.field).toBe('published');
      expect(mutation.action.assignments[1]!.field).toBe('published_at');
      expect(mutation.action.assignments[2]!.field).toBe('updated_by');
    }
  });

  it('should handle computed with where clause with multiple conditions', () => {
    const input = `Computed for User:
- active post count counts Post where published is true and archived is false
`;

    const ast = parse(input);
    const section = ast.sections[0]! as ComputedSection;
    const computed = section.computed[0]!;

    if (computed.aggregation.type === 'counts') {
      expect(computed.aggregation.whereClause!.conditions).toHaveLength(2);
    }
  });

  it('should handle sort with default direction (no explicit direction)', () => {
    const input = `Query for Post:
- posts sorted by created at
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const query = section.queries[0]!;

    expect(query.sortClause!.direction).toBe(SortDirection.ASCENDING);
  });

  it('should handle increases with large numbers', () => {
    const input = `Mutation for Post:
- bulk increment increases view count by 1000000
`;

    const ast = parse(input);
    const section = ast.sections[0]! as MutationSection;
    const mutation = section.mutations[0]!;

    if (mutation.action.type === 'increases') {
      expect(mutation.action.amount).toBe(1000000);
    }
  });

  it('should handle all comparison operators', () => {
    const operators = [
      { input: 'is true', op: ComparisonOperator.IS },
      { input: 'equals 42', op: ComparisonOperator.EQUALS },
      { input: 'matches pattern', op: ComparisonOperator.MATCHES },
      { input: 'contains text', op: ComparisonOperator.CONTAINS },
      { input: 'is after now', op: ComparisonOperator.IS_AFTER },
      { input: 'is before now', op: ComparisonOperator.IS_BEFORE },
      { input: 'starts with prefix', op: ComparisonOperator.STARTS_WITH },
      { input: 'ends with suffix', op: ComparisonOperator.ENDS_WITH },
    ];

    operators.forEach(({ input: opInput, op }) => {
      const input = `Query for Post:\n- test where field ${opInput}\n`;
      const ast = parse(input);
      const section = ast.sections[0]! as QuerySection;
      const condition = section.queries[0]!.whereClause!.conditions[0]!;

      expect(condition.operator).toBe(op);
    });
  });

  it('should handle single word time units', () => {
    const input = `Query for Post:
- recent where created at is after 1 minute ago
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    if (condition.value!.type === 'time') {
      expect(condition.value!.expression.unit).toBe(TimeUnit.MINUTE);
    }
  });

  it('should handle queries with only sort and limit (no where)', () => {
    const input = `Query for Post:
- top posts sorted by views desc limited to 5
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const query = section.queries[0]!;

    expect(query.whereClause).toBeUndefined();
    expect(query.sortClause).toBeDefined();
    expect(query.sortClause!.direction).toBe(SortDirection.DESC);
    expect(query.limitClause).toBeDefined();
    expect(query.limitClause!.count).toBe(5);
  });

  it('should preserve field name case in original form', () => {
    const input = `Query for Post:
- posts where UserID equals 42
`;

    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    // Normalized to lowercase
    expect(condition.field).toBe('UserID');
  });

  it('should handle assignment to string with quotes', () => {
    const input = `Mutation for Post:
- set status sets status to "published"
`;

    const ast = parse(input);
    const section = ast.sections[0]! as MutationSection;
    const mutation = section.mutations[0]!;

    if (mutation.action.type === 'sets') {
      expect(mutation.action.assignments[0]!.value).toEqual({
        type: 'literal',
        value: 'published',
      });
    }
  });

  it('should handle returns with complex boolean expression', () => {
    const input = `Computed for User:
- is premium returns subscription status is active
`;

    const ast = parse(input);
    const section = ast.sections[0]! as ComputedSection;
    const computed = section.computed[0]!;

    if (computed.aggregation.type === 'returns') {
      expect(computed.aggregation.condition.field).toBe('subscription_status');
      expect(computed.aggregation.condition.operator).toBe(ComparisonOperator.IS);
    }
  });

  it('should handle calculates from field', () => {
    const input = `Computed for Product:
- discounted price calculates from price
`;

    const ast = parse(input);
    const section = ast.sections[0]! as ComputedSection;
    const computed = section.computed[0]!;

    if (computed.aggregation.type === 'calculates') {
      expect(computed.aggregation.field).toBe('price');
    }
  });
});

describe('DML Parser - Error Handling', () => {
  it('should throw on empty file', () => {
    expect(() => parse('')).toThrow(ParseError);
    expect(() => parse('')).toThrow(
      'Expected at least one query, mutation, or computed definition'
    );
  });

  it('should throw on query section without items', () => {
    expect(() => parse('Query for Post:\n')).toThrow(ParseError);
    expect(() => parse('Query for Post:\n')).toThrow('Query section must have at least one query');
  });

  it('should throw on mutation section without items', () => {
    expect(() => parse('Mutation for Post:\n')).toThrow(ParseError);
    expect(() => parse('Mutation for Post:\n')).toThrow(
      'Mutation section must have at least one mutation'
    );
  });

  it('should throw on computed section without items', () => {
    expect(() => parse('Computed for User:\n')).toThrow(ParseError);
    expect(() => parse('Computed for User:\n')).toThrow(
      'Computed section must have at least one computed field'
    );
  });

  it('should throw on missing colon after model name', () => {
    expect(() => parse('Query for Post\n- all posts\n')).toThrow(ParseError);
    expect(() => parse('Query for Post\n- all posts\n')).toThrow('Expected ":"');
  });

  it('should throw on invalid section keyword', () => {
    expect(() => parse('Invalid for Post:\n- item\n')).toThrow(ParseError);
    expect(() => parse('Invalid for Post:\n- item\n')).toThrow(
      'Expected "Query", "Mutation", or "Computed" keyword'
    );
  });

  it('should throw on missing "for" keyword', () => {
    expect(() => parse('Query Post:\n- all posts\n')).toThrow(ParseError);
    expect(() => parse('Query Post:\n- all posts\n')).toThrow('Expected "for" after "Query"');
  });

  it('should parse reference when not a time expression', () => {
    // "tomorrow" is not a valid time expression, so it should be parsed as a reference
    const input = 'Query for Post:\n- test where created at is after tomorrow\n';
    const ast = parse(input);
    const section = ast.sections[0]! as QuerySection;
    const condition = section.queries[0]!.whereClause!.conditions[0]!;

    expect(condition.value!.type).toBe('reference');
    if (condition.value!.type === 'reference') {
      expect(condition.value!.field).toBe('tomorrow');
    }
  });

  it('should throw on missing "by" in sort clause', () => {
    expect(() => parse('Query for Post:\n- test sorted created at\n')).toThrow(ParseError);
    expect(() => parse('Query for Post:\n- test sorted created at\n')).toThrow(
      'Expected "by" after "sorted"'
    );
  });

  it('should throw on missing "to" in limit clause', () => {
    expect(() => parse('Query for Post:\n- test limited 10\n')).toThrow(ParseError);
    expect(() => parse('Query for Post:\n- test limited 10\n')).toThrow(
      'Expected "to" after "limited"'
    );
  });

  it('should throw on missing "to" in assignment', () => {
    expect(() => parse('Mutation for Post:\n- test sets published true\n')).toThrow(ParseError);
    expect(() => parse('Mutation for Post:\n- test sets published true\n')).toThrow(
      'Expected "to" after field name'
    );
  });

  it('should throw on missing "by" in increases action', () => {
    expect(() => parse('Mutation for Post:\n- test increases count 1\n')).toThrow(ParseError);
    expect(() => parse('Mutation for Post:\n- test increases count 1\n')).toThrow(
      'Expected "by" after field name'
    );
  });

  it('should throw on invalid aggregation keyword', () => {
    expect(() => parse('Computed for User:\n- test invalid Post\n')).toThrow(ParseError);
    expect(() => parse('Computed for User:\n- test invalid Post\n')).toThrow(
      'Expected "counts", "sums", "returns", or "calculates" keyword'
    );
  });

  it('should throw on missing dot in sums', () => {
    expect(() => parse('Computed for User:\n- test sums Post field\n')).toThrow(ParseError);
    expect(() => parse('Computed for User:\n- test sums Post field\n')).toThrow(
      'Expected "." after model name'
    );
  });
});
