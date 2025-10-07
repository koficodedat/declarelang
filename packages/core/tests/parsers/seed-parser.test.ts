/**
 * SEED Parser Tests
 * Comprehensive test coverage for SEED.DSL parser
 */

import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../src/tokenizer/tokenizer.js';
import { SEEDParser } from '../../src/parsers/seed-parser.js';
import { SEEDFile, LiteralSeed, RandomSeed } from '../../src/types/ast.js';

/**
 * Helper function to parse SEED DSL
 */
function parseSeed(input: string): SEEDFile {
  const tokenizer = new Tokenizer(input);
  const tokens = tokenizer.tokenize();
  const parser = new SEEDParser(tokens);
  return parser.parse();
}

describe('SEEDParser', () => {
  describe('Literal Seeds', () => {
    it('should parse basic literal seed with single attribute', () => {
      const input = `
Seed Users:
- admin@blog.com with password Admin123!
`;

      const result = parseSeed(input);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0]!.modelName).toBe('Users');
      expect(result.sections[0]!.items).toHaveLength(1);

      const seed = result.sections[0]!.items[0]! as LiteralSeed;
      expect(seed.type).toBe('literal');
      expect(seed.primaryValue).toBe('admin@blog.com');
      expect(seed.attributes).toHaveLength(1);
      expect(seed.attributes[0]!.field).toBe('password');
      expect(seed.attributes[0]!.value).toBe('Admin123!');
    });

    it('should parse literal seed with multiple attributes', () => {
      const input = `
Seed Users:
- admin@blog.com with password Admin123! and username admin and role admin
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as LiteralSeed;
      expect(seed.type).toBe('literal');
      expect(seed.primaryValue).toBe('admin@blog.com');
      expect(seed.attributes).toHaveLength(3);
      expect(seed.attributes[0]!.field).toBe('password');
      expect(seed.attributes[0]!.value).toBe('Admin123!');
      expect(seed.attributes[1]!.field).toBe('username');
      expect(seed.attributes[1]!.value).toBe('admin');
      expect(seed.attributes[2]!.field).toBe('role');
      expect(seed.attributes[2]!.value).toBe('admin');
    });

    it('should parse literal seed with model reference using "for"', () => {
      const input = `
Seed Posts:
- "My First Post" with slug my-first-post for john@blog.com User
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as LiteralSeed;
      expect(seed.type).toBe('literal');
      expect(seed.primaryValue).toBe('"My First Post"');
      expect(seed.references).toHaveLength(1);
      expect(seed.references[0]!.value).toBe('john@blog.com');
      expect(seed.references[0]!.modelName).toBe('User');
    });

    it('should parse literal seed with model reference using "in"', () => {
      const input = `
Seed Posts:
- "Category Post" with slug category-post in Technology Category
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as LiteralSeed;
      expect(seed.references).toHaveLength(1);
      expect(seed.references[0]!.value).toBe('Technology');
      expect(seed.references[0]!.modelName).toBe('Category');
    });

    it('should parse literal seed with model reference using "by"', () => {
      const input = `
Seed Posts:
- "Author Post" with slug author-post by admin@blog.com User
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as LiteralSeed;
      expect(seed.references).toHaveLength(1);
      expect(seed.references[0]!.value).toBe('admin@blog.com');
      expect(seed.references[0]!.modelName).toBe('User');
    });

    it('should parse literal seed with multiple references', () => {
      const input = `
Seed Posts:
- "Complete Post" with slug complete-post for john@blog.com User in Technology Category
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as LiteralSeed;
      expect(seed.references).toHaveLength(2);
      expect(seed.references[0]!.value).toBe('john@blog.com');
      expect(seed.references[0]!.modelName).toBe('User');
      expect(seed.references[1]!.value).toBe('Technology');
      expect(seed.references[1]!.modelName).toBe('Category');
    });

    it('should parse literal seed with boolean attributes', () => {
      const input = `
Seed Posts:
- "Published Post" with slug published-post and is published true
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as LiteralSeed;
      expect(seed.attributes).toHaveLength(2);
      expect(seed.attributes[1]!.field).toBe('is_published');
      expect(seed.attributes[1]!.value).toBe(true);
    });

    it('should parse literal seed with multi-word field names', () => {
      const input = `
Seed Users:
- admin@blog.com with first name John and last name Doe
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as LiteralSeed;
      expect(seed.attributes).toHaveLength(2);
      expect(seed.attributes[0]!.field).toBe('first_name');
      expect(seed.attributes[0]!.value).toBe('John');
      expect(seed.attributes[1]!.field).toBe('last_name');
      expect(seed.attributes[1]!.value).toBe('Doe');
    });

    it('should parse literal seed with time expression', () => {
      const input = `
Seed Posts:
- "Old Post" with slug old-post and published at now minus 7 days
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as LiteralSeed;
      expect(seed.attributes[1]!.field).toBe('published_at');
      expect(seed.attributes[1]!.value).toBe('now minus 7 days');
    });
  });

  describe('Random Seeds', () => {
    it('should parse basic random seed', () => {
      const input = `
Seed Users:
- 5 Users with random usernames and emails
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as RandomSeed;
      expect(seed.type).toBe('random');
      expect(seed.count).toBe(5);
      expect(seed.modelName).toBe('Users');
      expect(seed.randomFields).toHaveLength(2);
      expect(seed.randomFields).toContain('usernames');
      expect(seed.randomFields).toContain('emails');
    });

    it('should parse random seed with fixed attributes', () => {
      const input = `
Seed Users:
- 10 Users with random usernames and emails and role user
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as RandomSeed;
      expect(seed.count).toBe(10);
      expect(seed.randomFields).toHaveLength(2);
      expect(seed.attributes).toHaveLength(1);
      expect(seed.attributes[0]!.field).toBe('role');
      expect(seed.attributes[0]!.value).toBe('user');
    });

    it('should parse random seed with "some" quantifier', () => {
      const input = `
Seed Posts:
- 20 Posts with random titles and contents with some published true
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as RandomSeed;
      expect(seed.count).toBe(20);
      expect(seed.quantifier).toBe('some');
      expect(seed.attributes).toHaveLength(1);
      expect(seed.attributes[0]!.field).toBe('published');
      expect(seed.attributes[0]!.value).toBe(true);
    });

    it('should parse random seed with "most" quantifier', () => {
      const input = `
Seed Comments:
- 100 Comments with random contents with most is approved true
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as RandomSeed;
      expect(seed.count).toBe(100);
      expect(seed.quantifier).toBe('most');
      expect(seed.attributes[0]!.field).toBe('is_approved');
    });

    it('should parse random seed with "all" quantifier', () => {
      const input = `
Seed Users:
- 5 Users with random usernames and emails with all is active true
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as RandomSeed;
      expect(seed.quantifier).toBe('all');
    });

    it('should parse random seed with model reference', () => {
      const input = `
Seed Posts:
- 15 Posts with random titles and contents for random active Users
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as RandomSeed;
      expect(seed.count).toBe(15);
      expect(seed.references).toHaveLength(1);
      expect(seed.references[0]!.value).toBe('random active');
      expect(seed.references[0]!.modelName).toBe('Users');
    });

    it('should parse random seed with multiple random fields', () => {
      const input = `
Seed Posts:
- 25 Posts with random titles and slugs and contents and published at
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as RandomSeed;
      expect(seed.randomFields).toHaveLength(4);
      expect(seed.randomFields).toContain('titles');
      expect(seed.randomFields).toContain('slugs');
      expect(seed.randomFields).toContain('contents');
      expect(seed.randomFields).toContain('published_at');
    });
  });

  describe('Environment-based Seeds', () => {
    it('should parse seed for development environment', () => {
      const input = `
Seed for development:
- admin@blog.com with password Admin123!
`;

      const result = parseSeed(input);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0]!.environment).toBe('development');
      expect(result.sections[0]!.modelName).toBeUndefined();
      expect(result.sections[0]!.items).toHaveLength(1);
    });

    it('should parse seed for testing environment', () => {
      const input = `
Seed for testing:
- test@blog.com with password Test123!
`;

      const result = parseSeed(input);

      expect(result.sections[0]!.environment).toBe('testing');
    });

    it('should parse seed for production environment', () => {
      const input = `
Seed for production:
- admin@prod.com with password Prod123!
`;

      const result = parseSeed(input);

      expect(result.sections[0]!.environment).toBe('production');
    });
  });

  describe('Multiple Sections', () => {
    it('should parse multiple seed sections', () => {
      const input = `
Seed Users:
- admin@blog.com with password Admin123!

Seed Posts:
- "First Post" with slug first-post
`;

      const result = parseSeed(input);

      expect(result.sections).toHaveLength(2);
      expect(result.sections[0]!.modelName).toBe('Users');
      expect(result.sections[1]!.modelName).toBe('Posts');
    });

    it('should parse mixed model and environment sections', () => {
      const input = `
Seed Users:
- admin@blog.com with password Admin123!

Seed for development:
- dev@blog.com with password Dev123!
`;

      const result = parseSeed(input);

      expect(result.sections).toHaveLength(2);
      expect(result.sections[0]!.modelName).toBe('Users');
      expect(result.sections[0]!.environment).toBeUndefined();
      expect(result.sections[1]!.environment).toBe('development');
      expect(result.sections[1]!.modelName).toBeUndefined();
    });

    it('should parse multiple items in single section', () => {
      const input = `
Seed Users:
- admin@blog.com with password Admin123! and role admin
- user@blog.com with password User123! and role user
- editor@blog.com with password Editor123! and role editor
`;

      const result = parseSeed(input);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0]!.items).toHaveLength(3);
    });

    it('should parse mixed literal and random seeds in same section', () => {
      const input = `
Seed Users:
- admin@blog.com with password Admin123! and role admin
- 5 Users with random usernames and emails and role user
`;

      const result = parseSeed(input);

      expect(result.sections[0]!.items).toHaveLength(2);
      expect(result.sections[0]!.items[0]!.type).toBe('literal');
      expect(result.sections[0]!.items[1]!.type).toBe('random');
    });
  });

  describe('Complete File', () => {
    it('should parse complete seed file from example', () => {
      const input = `
Seed Users:
- admin@blog.com with password Admin123! and username admin and role admin
- john@blog.com with password User123! and username john and role user
- jane@blog.com with password User123! and username jane and role user

Seed Categories:
- Technology with slug technology and description "Tech related posts"
- Lifestyle with slug lifestyle and description "Lifestyle articles"

Seed Posts:
- "Getting Started with TypeScript" with slug getting-started-typescript and content "TypeScript is a typed superset..." and published at now minus 7 days for john@blog.com User in Technology Category
- "Healthy Living Tips" with slug healthy-living-tips and content "Living a healthy life..." and published at now minus 3 days for jane@blog.com User in Lifestyle Category

Seed for development:
- 5 Users with random usernames and emails and role user
- 20 Posts with random titles and contents for random active Users with some published true
- 100 Comments with random contents for random published Posts by random Users with most is approved true

Seed for testing:
- test@blog.com with password Test123! and username testuser and role user
- 10 Posts with random titles and contents for test@blog.com User
`;

      const result = parseSeed(input);

      expect(result.sections).toHaveLength(5);
      expect(result.sections[0]!.modelName).toBe('Users');
      expect(result.sections[0]!.items).toHaveLength(3);
      expect(result.sections[1]!.modelName).toBe('Categories');
      expect(result.sections[1]!.items).toHaveLength(2);
      expect(result.sections[2]!.modelName).toBe('Posts');
      expect(result.sections[2]!.items).toHaveLength(2);
      expect(result.sections[3]!.environment).toBe('development');
      expect(result.sections[3]!.items).toHaveLength(3);
      expect(result.sections[4]!.environment).toBe('testing');
      expect(result.sections[4]!.items).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file', () => {
      const input = '';
      const result = parseSeed(input);

      expect(result.sections).toHaveLength(0);
    });

    it('should handle file with only comments', () => {
      const input = `
# This is a comment
# Another comment
`;
      const result = parseSeed(input);

      expect(result.sections).toHaveLength(0);
    });

    it('should handle extra newlines between sections', () => {
      const input = `
Seed Users:
- admin@blog.com with password Admin123!


Seed Posts:
- "First Post" with slug first-post
`;

      const result = parseSeed(input);

      expect(result.sections).toHaveLength(2);
    });

    it('should handle quoted values with spaces', () => {
      const input = `
Seed Posts:
- "This is a long title with spaces" with slug long-title
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as LiteralSeed;
      expect(seed.primaryValue).toBe('"This is a long title with spaces"');
    });

    it('should handle numeric values', () => {
      const input = `
Seed Products:
- "Product 1" with price 99.99 and stock 100
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as LiteralSeed;
      expect(seed.attributes[0]!.field).toBe('price');
      expect(seed.attributes[0]!.value).toBe(99.99);
      expect(seed.attributes[1]!.field).toBe('stock');
      expect(seed.attributes[1]!.value).toBe(100);
    });

    it('should handle large random counts', () => {
      const input = `
Seed Users:
- 10000 Users with random usernames and emails
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as RandomSeed;
      expect(seed.count).toBe(10000);
    });
  });

  describe('Error Handling', () => {
    it('should throw on missing colon after Seed', () => {
      const input = `
Seed Users
- admin@blog.com with password Admin123!
`;

      expect(() => parseSeed(input)).toThrow('Expected ":" after');
    });

    it('should throw on missing items after Seed section header', () => {
      const input = `
Seed Users:

Seed Posts:
- "First Post" with slug first-post
`;

      expect(() => parseSeed(input)).toThrow('Expected at least one seed item');
    });

    it('should throw on missing "with" in literal seed', () => {
      const input = `
Seed Users:
- admin@blog.com password Admin123!
`;

      expect(() => parseSeed(input)).toThrow();
    });

    it('should throw on missing "for" keyword after Seed for environment', () => {
      const input = `
Seed development:
- admin@blog.com with password Admin123!
`;

      expect(() => parseSeed(input)).toThrow();
    });

    it('should throw on invalid environment name', () => {
      const input = `
Seed for invalid:
- admin@blog.com with password Admin123!
`;

      expect(() => parseSeed(input)).toThrow();
    });

    it('should throw on missing "random" keyword in random seed', () => {
      const input = `
Seed Users:
- 5 Users with usernames and emails
`;

      expect(() => parseSeed(input)).toThrow();
    });
  });

  describe('Position Tracking', () => {
    it('should track positions for seed sections', () => {
      const input = `
Seed Users:
- admin@blog.com with password Admin123!
`;

      const result = parseSeed(input);

      expect(result.sections[0]!.start).toBeDefined();
      expect(result.sections[0]!.end).toBeDefined();
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });

    it('should track positions for seed items', () => {
      const input = `
Seed Users:
- admin@blog.com with password Admin123!
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]!;
      expect(seed.start).toBeDefined();
      expect(seed.end).toBeDefined();
    });

    it('should track positions for attributes', () => {
      const input = `
Seed Users:
- admin@blog.com with password Admin123!
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as LiteralSeed;
      expect(seed.attributes[0]!.start).toBeDefined();
      expect(seed.attributes[0]!.end).toBeDefined();
    });

    it('should track positions for model references', () => {
      const input = `
Seed Posts:
- "First Post" with slug first-post for john@blog.com User
`;

      const result = parseSeed(input);

      const seed = result.sections[0]!.items[0]! as LiteralSeed;
      expect(seed.references[0]!.start).toBeDefined();
      expect(seed.references[0]!.end).toBeDefined();
    });
  });
});
