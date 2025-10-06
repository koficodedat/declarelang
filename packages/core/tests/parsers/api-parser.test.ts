/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * API Parser Tests
 * Comprehensive test coverage for API.DSL parser
 */

import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../src/tokenizer/index.js';
import { APIParser } from '../../src/parsers/api-parser.js';
import {
  RateLimitAction,
  RateLimitScope,
  RateLimitTimeUnit,
  type APIFile,
} from '../../src/types/ast.js';

/**
 * Helper function to parse API DSL
 */
function parseAPI(input: string): APIFile {
  const tokenizer = new Tokenizer(input);
  const tokens = tokenizer.tokenize();
  const parser = new APIParser(tokens);
  return parser.parse();
}

describe('APIParser', () => {
  describe('Rate Limiting', () => {
    it('should parse global rate limits', () => {
      const input = `
Rate limit:
- 100 requests per minute per user
- 1000 requests per hour per user
`;
      const result = parseAPI(input);
      expect(result.rateLimits).toHaveLength(2);
      expect(result.rateLimits[0]!.count).toBe(100);
      expect(result.rateLimits[0]!.action).toBe(RateLimitAction.REQUESTS);
      expect(result.rateLimits[0]!.timeUnit).toBe(RateLimitTimeUnit.MINUTE);
      expect(result.rateLimits[0]!.scope).toBe(RateLimitScope.USER);
    });

    it('should parse model-specific rate limits', () => {
      const input = `
Rate limit for Posts:
- 10 creates per minute per user
- 5 updates per minute per user
`;
      const result = parseAPI(input);
      expect(result.rateLimits).toHaveLength(2);
      expect(result.rateLimits[0]!.modelName).toBe('Posts');
      expect(result.rateLimits[0]!.action).toBe(RateLimitAction.CREATES);
    });

    it('should parse different action types', () => {
      const input = `
Rate limit:
- 10 signups per hour per ip address
- 5 logins per minute per ip address
- 100 reads per minute per user
`;
      const result = parseAPI(input);
      expect(result.rateLimits[0]!.action).toBe(RateLimitAction.SIGNUPS);
      expect(result.rateLimits[1]!.action).toBe(RateLimitAction.LOGINS);
      expect(result.rateLimits[2]!.action).toBe(RateLimitAction.READS);
    });

    it('should parse different scopes', () => {
      const input = `
Rate limit:
- 100 requests per minute per user
- 200 requests per minute per ip address
- 500 requests per minute per api key
`;
      const result = parseAPI(input);
      expect(result.rateLimits[0]!.scope).toBe(RateLimitScope.USER);
      expect(result.rateLimits[1]!.scope).toBe(RateLimitScope.IP_ADDRESS);
      expect(result.rateLimits[2]!.scope).toBe(RateLimitScope.API_KEY);
    });
  });

  describe('CORS Configuration', () => {
    it('should parse CORS configuration', () => {
      const input = `
CORS:
- allow origins: https://example.com, https://app.example.com
- allow methods: GET, POST, PUT, DELETE
- allow headers: Authorization, Content-Type
- allow credentials: true
- max age: 86400
`;
      const result = parseAPI(input);
      expect(result.cors).toBeDefined();
      expect(result.cors!.allowOrigins).toHaveLength(2);
      expect(result.cors!.allowMethods).toContain('GET');
      expect(result.cors!.allowHeaders).toContain('Authorization');
      expect(result.cors!.allowCredentials).toBe(true);
      expect(result.cors!.maxAge).toBe(86400);
    });
  });

  describe('Pagination', () => {
    it('should parse global pagination config', () => {
      const input = `
Pagination:
- default limit: 20
- max limit: 100
- default sort: created at descending
`;
      const result = parseAPI(input);
      expect(result.pagination).toHaveLength(1);
      expect(result.pagination[0]!.defaultLimit).toBe(20);
      expect(result.pagination[0]!.maxLimit).toBe(100);
      expect(result.pagination[0]!.defaultSort?.field).toBe('created_at');
    });

    it('should parse model-specific pagination', () => {
      const input = `
Pagination for Posts:
- default limit: 50
- max limit: 100
- allowed sort fields: created at, title, published at
`;
      const result = parseAPI(input);
      expect(result.pagination[0]!.modelName).toBe('Posts');
      expect(result.pagination[0]!.allowedSortFields).toHaveLength(3);
    });
  });

  describe('Query Parameters', () => {
    it('should parse query parameters', () => {
      const input = `
Query parameters for Posts:
- published as boolean
- user id as number
- created at as date range
- title as text contains
`;
      const result = parseAPI(input);
      expect(result.queryParams).toHaveLength(1);
      expect(result.queryParams[0]!.modelName).toBe('Posts');
      expect(result.queryParams[0]!.params).toHaveLength(4);
      expect(result.queryParams[0]!.params[0]!.field).toBe('published');
    });
  });

  describe('Response Configuration', () => {
    it('should parse response envelope', () => {
      const input = `
Response envelope:
- data contains the payload
- meta contains pagination
- errors contains error array
`;
      const result = parseAPI(input);
      expect(result.responseEnvelope).toBeDefined();
      expect(result.responseEnvelope!.dataField).toBe('data');
      expect(result.responseEnvelope!.metaField).toBe('meta');
    });

    it('should parse success response config', () => {
      const input = `
Success response:
- status code
- data
- meta with request id and timestamp
`;
      const result = parseAPI(input);
      expect(result.successResponse).toBeDefined();
      expect(result.successResponse!.includeStatusCode).toBe(true);
      expect(result.successResponse!.includeData).toBe(true);
    });

    it('should parse error response config', () => {
      const input = `
Error response:
- status code
- error with code and message
- fields with validation errors
`;
      const result = parseAPI(input);
      expect(result.errorResponse).toBeDefined();
      expect(result.errorResponse!.includeStatusCode).toBe(true);
      expect(result.errorResponse!.includeFields).toBe(true);
    });
  });

  describe('Security', () => {
    it('should parse security headers', () => {
      const input = `
Security headers:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
`;
      const result = parseAPI(input);
      expect(result.securityHeaders).toHaveLength(2);
      expect(result.securityHeaders![0]!.name).toBe('X-Content-Type-Options');
      expect(result.securityHeaders![0]!.value).toBe('nosniff');
    });

    it('should parse request size limits', () => {
      const input = `
Request size limits:
- max body size: 10 megabytes
- max file upload: 5 megabytes
- max query params: 50
`;
      const result = parseAPI(input);
      expect(result.sizeLimits).toBeDefined();
      expect(result.sizeLimits!.maxBodySize).toBe(10);
      expect(result.sizeLimits!.maxFileUpload).toBe(5);
      expect(result.sizeLimits!.maxQueryParams).toBe(50);
    });
  });

  describe('API Versioning', () => {
    it('should parse API versioning config', () => {
      const input = `
API versioning:
- version format: v1
- header: X-API-Version
- default version: v1
`;
      const result = parseAPI(input);
      expect(result.versioning).toBeDefined();
      expect(result.versioning!.versionFormat).toBe('v1');
      expect(result.versioning!.header).toBe('X-API-Version');
    });
  });

  describe('Response Compression', () => {
    it('should parse response compression config', () => {
      const input = `
Response compression:
- enable for responses larger than 1024 bytes
- supported formats: gzip, deflate
`;
      const result = parseAPI(input);
      expect(result.compression).toBeDefined();
      expect(result.compression!.enabled).toBe(true);
      expect(result.compression!.minSize).toBe(1024);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty API file', () => {
      const input = ``;
      const result = parseAPI(input);
      expect(result.rateLimits).toHaveLength(0);
      expect(result.pagination).toHaveLength(0);
      expect(result.queryParams).toHaveLength(0);
    });

    it('should handle multiple sections', () => {
      const input = `
Rate limit:
- 100 requests per minute per user

CORS:
- allow origins: https://example.com

Pagination:
- default limit: 20
`;
      const result = parseAPI(input);
      expect(result.rateLimits).toHaveLength(1);
      expect(result.cors).toBeDefined();
      expect(result.pagination).toHaveLength(1);
    });

    it('should handle multiple rate limit sections', () => {
      const input = `
Rate limit:
- 100 requests per minute per user

Rate limit for Posts:
- 10 creates per minute per user

Rate limit for Comments:
- 20 creates per minute per user
`;
      const result = parseAPI(input);
      expect(result.rateLimits).toHaveLength(3);
      expect(result.rateLimits[0]!.modelName).toBeUndefined();
      expect(result.rateLimits[1]!.modelName).toBe('Posts');
      expect(result.rateLimits[2]!.modelName).toBe('Comments');
    });

    it('should handle multiple pagination sections', () => {
      const input = `
Pagination:
- default limit: 20

Pagination for Posts:
- default limit: 50

Pagination for Comments:
- default limit: 30
`;
      const result = parseAPI(input);
      expect(result.pagination).toHaveLength(3);
      expect(result.pagination[0]!.modelName).toBeUndefined();
      expect(result.pagination[1]!.modelName).toBe('Posts');
      expect(result.pagination[2]!.modelName).toBe('Comments');
    });

    it('should handle multiple query parameter sections', () => {
      const input = `
Query parameters for Posts:
- published as boolean

Query parameters for Comments:
- is approved as boolean

Query parameters for Users:
- role as text
`;
      const result = parseAPI(input);
      expect(result.queryParams).toHaveLength(3);
      expect(result.queryParams[0]!.modelName).toBe('Posts');
      expect(result.queryParams[1]!.modelName).toBe('Comments');
      expect(result.queryParams[2]!.modelName).toBe('Users');
    });

    it('should handle extra newlines between sections', () => {
      const input = `
Rate limit:
- 100 requests per minute per user


CORS:
- allow origins: https://example.com


Pagination:
- default limit: 20
`;
      const result = parseAPI(input);
      expect(result.rateLimits).toHaveLength(1);
      expect(result.cors).toBeDefined();
      expect(result.pagination).toHaveLength(1);
    });

    it('should handle all rate limit actions', () => {
      const input = `
Rate limit:
- 100 requests per minute per user
- 10 creates per minute per user
- 5 updates per minute per user
- 3 deletes per minute per user
- 50 reads per minute per user
- 20 signups per hour per ip address
- 10 logins per minute per ip address
`;
      const result = parseAPI(input);
      expect(result.rateLimits).toHaveLength(7);
      expect(result.rateLimits[0]!.action).toBe(RateLimitAction.REQUESTS);
      expect(result.rateLimits[1]!.action).toBe(RateLimitAction.CREATES);
      expect(result.rateLimits[2]!.action).toBe(RateLimitAction.UPDATES);
      expect(result.rateLimits[3]!.action).toBe(RateLimitAction.DELETES);
      expect(result.rateLimits[4]!.action).toBe(RateLimitAction.READS);
      expect(result.rateLimits[5]!.action).toBe(RateLimitAction.SIGNUPS);
      expect(result.rateLimits[6]!.action).toBe(RateLimitAction.LOGINS);
    });

    it('should handle all time units', () => {
      const input = `
Rate limit:
- 100 requests per minute per user
- 1000 requests per hour per user
- 10000 requests per day per user
`;
      const result = parseAPI(input);
      expect(result.rateLimits[0]!.timeUnit).toBe(RateLimitTimeUnit.MINUTE);
      expect(result.rateLimits[1]!.timeUnit).toBe(RateLimitTimeUnit.HOUR);
      expect(result.rateLimits[2]!.timeUnit).toBe(RateLimitTimeUnit.DAY);
    });

    it('should handle all query parameter filter types', () => {
      const input = `
Query parameters for Posts:
- published as boolean
- user id as number
- content as text
- created at as date range
- price as number range
- title as text contains
- slug as text starts with
- email as text ends with
`;
      const result = parseAPI(input);
      const params = result.queryParams[0]!.params;
      expect(params).toHaveLength(8);
      expect(params[0]!.filterType).toBe('boolean');
      expect(params[1]!.filterType).toBe('number');
      expect(params[2]!.filterType).toBe('text');
      expect(params[3]!.filterType).toBe('date_range');
      expect(params[4]!.filterType).toBe('number_range');
      expect(params[5]!.filterType).toBe('text_contains');
      expect(params[6]!.filterType).toBe('text_starts_with');
      expect(params[7]!.filterType).toBe('text_ends_with');
    });

    it('should normalize field names with spaces and hyphens', () => {
      const input = `
Query parameters for Posts:
- user id as number
- created-at as date range
`;
      const result = parseAPI(input);
      expect(result.queryParams[0]!.params[0]!.field).toBe('user_id');
      expect(result.queryParams[0]!.params[1]!.field).toBe('created_at');
    });

    it('should handle CORS with false credentials', () => {
      const input = `
CORS:
- allow origins: https://example.com
- allow credentials: false
`;
      const result = parseAPI(input);
      expect(result.cors!.allowCredentials).toBe(false);
    });

    it('should handle pagination with ascending sort', () => {
      const input = `
Pagination:
- default limit: 20
- default sort: created at ascending
`;
      const result = parseAPI(input);
      expect(result.pagination[0]!.defaultSort?.direction).toBe('ascending');
    });
  });

  describe('Position Tracking', () => {
    it('should track positions for rate limits', () => {
      const input = `
Rate limit:
- 100 requests per minute per user
`;
      const result = parseAPI(input);
      expect(result.rateLimits[0]!.start).toBeDefined();
      expect(result.rateLimits[0]!.end).toBeDefined();
    });
  });

  describe('Real World Example', () => {
    it('should parse complete blog api.dsl file', () => {
      const input = `
Rate limit:
- 100 requests per minute per user
- 1000 requests per hour per user
- 20 signups per hour per ip address
- 10 logins per minute per ip address

Rate limit for Posts:
- 10 creates per minute per user
- 5 updates per minute per user
- 3 deletes per minute per user
- 100 reads per minute per user

Rate limit for Comments:
- 20 creates per minute per user
- 5 updates per minute per user
- 10 deletes per minute per user

CORS:
- allow origins: https://blog.example.com, https://www.blog.example.com
- allow methods: GET, POST, PUT, DELETE, PATCH
- allow headers: Authorization, Content-Type, X-Requested-With
- allow credentials: true
- max age: 86400

Response envelope:
- data contains the payload
- meta contains pagination, totals, and request info
- errors contains error array when applicable

Success response:
- status code
- data
- meta with request id, timestamp, and pagination

Error response:
- status code
- error with code, message, and details
- fields with validation errors if applicable

Pagination:
- default limit: 20
- max limit: 100
- default sort: created at descending

Pagination for Posts:
- default limit: 50
- max limit: 100
- allowed sort fields: created at, title, published at, view count

Pagination for Comments:
- default limit: 30
- allowed sort fields: created at

Query parameters for Posts:
- published as boolean
- user id as number
- category id as number
- created at as date range
- title as text contains
- content as text contains

Query parameters for Comments:
- is approved as boolean
- post id as number
- user id as number
- created at as date range
- content as text contains

Query parameters for Users:
- role as text
- is active as boolean
- created at as date range
- email as text contains
- username as text contains

API versioning:
- version format: v1
- header: X-API-Version
- default version: v1

Security headers:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000

Response compression:
- enable for responses larger than 1024 bytes
- supported formats: gzip, deflate

Request size limits:
- max body size: 10 megabytes
- max file upload: 5 megabytes
- max query params: 50
`;
      const result = parseAPI(input);

      // Verify all sections parsed
      expect(result.rateLimits.length).toBeGreaterThan(0);
      expect(result.cors).toBeDefined();
      expect(result.responseEnvelope).toBeDefined();
      expect(result.successResponse).toBeDefined();
      expect(result.errorResponse).toBeDefined();
      expect(result.pagination.length).toBeGreaterThan(0);
      expect(result.queryParams.length).toBeGreaterThan(0);
      expect(result.versioning).toBeDefined();
      expect(result.securityHeaders).toBeDefined();
      expect(result.compression).toBeDefined();
      expect(result.sizeLimits).toBeDefined();

      // Spot check some values
      expect(result.rateLimits).toHaveLength(11); // 4 global + 4 Posts + 3 Comments
      expect(result.pagination).toHaveLength(3); // global + Posts + Comments
      expect(result.queryParams).toHaveLength(3); // Posts + Comments + Users
      expect(result.securityHeaders).toHaveLength(4);
    });
  });
});
