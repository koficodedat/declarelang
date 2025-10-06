import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../src/tokenizer/tokenizer.js';
import { MONITORParser } from '../../src/parsers/monitor-parser.js';
import { MetricType, AlertComparison, ThresholdUnit, MONITORFile } from '../../src/types/ast.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('MONITORParser', () => {
  function parse(input: string): MONITORFile {
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const parser = new MONITORParser(tokens);
    return parser.parse();
  }

  describe('Track Section', () => {
    it('should parse Track for all endpoints', () => {
      const input = `
Track for all endpoints:
- request count
- response time
- error rate
`;

      const result = parse(input);

      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0]!.scope).toEqual({ type: 'all_endpoints' });
      expect(result.tracks[0]!.metrics).toHaveLength(3);
      expect(result.tracks[0]!.metrics[0]!.name).toBe('request count');
      expect(result.tracks[0]!.metrics[0]!.metricType).toBe(MetricType.REQUEST_COUNT);
      expect(result.tracks[0]!.metrics[1]!.name).toBe('response time');
      expect(result.tracks[0]!.metrics[1]!.metricType).toBe(MetricType.RESPONSE_TIME);
      expect(result.tracks[0]!.metrics[2]!.name).toBe('error rate');
      expect(result.tracks[0]!.metrics[2]!.metricType).toBe(MetricType.ERROR_RATE);
    });

    it('should parse Track for specific model', () => {
      const input = `
Track for Posts:
- create count
- update count
- delete count
`;

      const result = parse(input);

      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0]!.scope).toEqual({ type: 'model', modelName: 'Posts' });
      expect(result.tracks[0]!.metrics).toHaveLength(3);
      expect(result.tracks[0]!.metrics[0]!.metricType).toBe(MetricType.CREATE_COUNT);
      expect(result.tracks[0]!.metrics[1]!.metricType).toBe(MetricType.UPDATE_COUNT);
      expect(result.tracks[0]!.metrics[2]!.metricType).toBe(MetricType.DELETE_COUNT);
    });

    it('should parse multiple Track sections', () => {
      const input = `
Track for all endpoints:
- request count

Track for Users:
- create count
`;

      const result = parse(input);

      expect(result.tracks).toHaveLength(2);
      expect(result.tracks[0]!.scope).toEqual({ type: 'all_endpoints' });
      expect(result.tracks[1]!.scope).toEqual({ type: 'model', modelName: 'Users' });
    });

    it('should handle custom metric names', () => {
      const input = `
Track for Users:
- active sessions
- login attempts
`;

      const result = parse(input);

      expect(result.tracks[0]!.metrics).toHaveLength(2);
      expect(result.tracks[0]!.metrics[0]!.name).toBe('active sessions');
      expect(result.tracks[0]!.metrics[0]!.metricType).toBe(MetricType.CUSTOM);
      expect(result.tracks[0]!.metrics[1]!.name).toBe('login attempts');
      expect(result.tracks[0]!.metrics[1]!.metricType).toBe(MetricType.CUSTOM);
    });
  });

  describe('Alert Section', () => {
    it('should parse Alert when with exceeds comparison', () => {
      const input = `
Track for all endpoints:
- request count

Alert when:
- error rate exceeds 5%
`;

      const result = parse(input);

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0]!.modelName).toBeUndefined();
      expect(result.alerts[0]!.conditions).toHaveLength(1);
      expect(result.alerts[0]!.conditions[0]!.metric).toBe('error rate');
      expect(result.alerts[0]!.conditions[0]!.comparison).toBe(AlertComparison.EXCEEDS);
      expect(result.alerts[0]!.conditions[0]!.threshold).toBe(5);
      expect(result.alerts[0]!.conditions[0]!.thresholdUnit).toBe(ThresholdUnit.PERCENT);
    });

    it('should parse Alert for specific model', () => {
      const input = `
Track for Posts:
- create count

Alert for Posts:
- create count exceeds 100 requests in 1 minute
`;

      const result = parse(input);

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0]!.modelName).toBe('Posts');
      expect(result.alerts[0]!.conditions).toHaveLength(1);
      expect(result.alerts[0]!.conditions[0]!.metric).toBe('create count');
      expect(result.alerts[0]!.conditions[0]!.threshold).toBe(100);
      expect(result.alerts[0]!.conditions[0]!.thresholdUnit).toBe(ThresholdUnit.REQUESTS);
      expect(result.alerts[0]!.conditions[0]!.timeWindow).toBeDefined();
      expect(result.alerts[0]!.conditions[0]!.timeWindow?.value).toBe(1);
      expect(result.alerts[0]!.conditions[0]!.timeWindow?.unit).toBe('minute');
    });

    it('should parse all comparison operators', () => {
      const input = `
Track for all endpoints:
- response time
- error rate
- status codes

Alert when:
- response time exceeds 500 milliseconds
- error rate is above 10%
- response time is below 50 milliseconds
- error rate equals 0%
`;

      const result = parse(input);

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0]!.conditions).toHaveLength(4);
      expect(result.alerts[0]!.conditions[0]!.comparison).toBe(AlertComparison.EXCEEDS);
      expect(result.alerts[0]!.conditions[1]!.comparison).toBe(AlertComparison.IS_ABOVE);
      expect(result.alerts[0]!.conditions[2]!.comparison).toBe(AlertComparison.IS_BELOW);
      expect(result.alerts[0]!.conditions[3]!.comparison).toBe(AlertComparison.EQUALS);
    });

    it('should parse various threshold units', () => {
      const input = `
Track for all endpoints:
- response time
- error rate
- request count

Alert when:
- response time exceeds 500 milliseconds
- error rate exceeds 10%
- request count exceeds 1000 requests
- response time exceeds 2 seconds
`;

      const result = parse(input);

      expect(result.alerts[0]!.conditions).toHaveLength(4);
      expect(result.alerts[0]!.conditions[0]!.thresholdUnit).toBe(ThresholdUnit.MILLISECONDS);
      expect(result.alerts[0]!.conditions[1]!.thresholdUnit).toBe(ThresholdUnit.PERCENT);
      expect(result.alerts[0]!.conditions[2]!.thresholdUnit).toBe(ThresholdUnit.REQUESTS);
      expect(result.alerts[0]!.conditions[3]!.thresholdUnit).toBe(ThresholdUnit.SECONDS);
    });

    it('should parse time windows', () => {
      const input = `
Track for all endpoints:
- request count

Alert when:
- request count exceeds 100 in 1 minute
- request count exceeds 500 in 5 minutes
- request count exceeds 1000 in 1 hour
`;

      const result = parse(input);

      expect(result.alerts[0]!.conditions).toHaveLength(3);
      expect(result.alerts[0]!.conditions[0]!.timeWindow?.value).toBe(1);
      expect(result.alerts[0]!.conditions[0]!.timeWindow?.unit).toBe('minute');
      expect(result.alerts[0]!.conditions[1]!.timeWindow?.value).toBe(5);
      expect(result.alerts[0]!.conditions[1]!.timeWindow?.unit).toBe('minute');
      expect(result.alerts[0]!.conditions[2]!.timeWindow?.value).toBe(1);
      expect(result.alerts[0]!.conditions[2]!.timeWindow?.unit).toBe('hour');
    });

    it('should handle multiple Alert sections', () => {
      const input = `
Track for all endpoints:
- request count

Track for Posts:
- create count

Alert when:
- request count exceeds 1000

Alert for Posts:
- create count exceeds 100
`;

      const result = parse(input);

      expect(result.alerts).toHaveLength(2);
      expect(result.alerts[0]!.modelName).toBeUndefined();
      expect(result.alerts[1]!.modelName).toBe('Posts');
    });
  });

  describe('Monitor Config Section', () => {
    it('should parse Monitor config', () => {
      const input = `
Track for all endpoints:
- request count

Alert when:
- request count exceeds 1000

Monitor:
- retention period: 30 days
- aggregation interval: 1 minute
- alert channels: email, slack
`;

      const result = parse(input);

      expect(result.monitorConfig).toBeDefined();
      expect(result.monitorConfig?.items).toHaveLength(3);
      expect(result.monitorConfig?.items[0]!.name).toBe('retention period');
      expect(result.monitorConfig?.items[0]!.originalName).toBe('retention period');
      expect(result.monitorConfig?.items[1]!.name).toBe('aggregation interval');
      expect(result.monitorConfig?.items[1]!.originalName).toBe('aggregation interval');
      expect(result.monitorConfig?.items[2]!.name).toBe('alert channels');
      expect(result.monitorConfig?.items[2]!.originalName).toBe('alert channels');
    });

    it('should parse config with various value types', () => {
      const input = `
Track for all endpoints:
- request count

Alert when:
- request count exceeds 1000

Monitor:
- enable sampling: true
- sample rate: 0.1
- max data points: 10000
`;

      const result = parse(input);

      expect(result.monitorConfig?.items).toHaveLength(3);
      expect(result.monitorConfig?.items[0]!.name).toBe('enable sampling');
      expect(result.monitorConfig?.items[1]!.name).toBe('sample rate');
      expect(result.monitorConfig?.items[2]!.name).toBe('max data points');
    });

    it('should throw error on duplicate Monitor section', () => {
      const input = `
Track for all endpoints:
- request count

Alert when:
- request count exceeds 1000

Monitor:
- retention period: 30 days

Monitor:
- alert channels: email
`;

      expect(() => parse(input)).toThrow('Duplicate Monitor section');
    });
  });

  describe('Dashboard Section', () => {
    it('should parse Dashboard metrics', () => {
      const input = `
Track for all endpoints:
- request count
- response time

Alert when:
- request count exceeds 1000

Dashboard metrics:
- request count
- response time
- error rate
`;

      const result = parse(input);

      expect(result.dashboard).toBeDefined();
      expect(result.dashboard?.metrics).toHaveLength(3);
      expect(result.dashboard?.metrics[0]!.name).toBe('request count');
      expect(result.dashboard?.metrics[1]!.name).toBe('response time');
      expect(result.dashboard?.metrics[2]!.name).toBe('error rate');
    });

    it('should parse Dashboard with custom metrics', () => {
      const input = `
Track for Users:
- active sessions

Alert when:
- active sessions exceeds 1000

Dashboard metrics:
- active sessions
- top endpoints by traffic
- slowest endpoints
`;

      const result = parse(input);

      expect(result.dashboard?.metrics).toHaveLength(3);
      expect(result.dashboard?.metrics[0]!.name).toBe('active sessions');
      expect(result.dashboard?.metrics[1]!.name).toBe('top endpoints by traffic');
      expect(result.dashboard?.metrics[2]!.name).toBe('slowest endpoints');
    });

    it('should throw error on duplicate Dashboard section', () => {
      const input = `
Track for all endpoints:
- request count

Alert when:
- request count exceeds 1000

Dashboard metrics:
- request count

Dashboard metrics:
- response time
`;

      expect(() => parse(input)).toThrow('Duplicate Dashboard section');
    });
  });

  describe('Complete File', () => {
    it('should parse file with all sections', () => {
      const input = `
Track for all endpoints:
- request count
- response time
- error rate

Track for Posts:
- create count
- update count
- delete count

Alert when:
- response time exceeds 500 ms
- error rate exceeds 5%

Alert for Posts:
- create count exceeds 100 requests in 1 minute

Monitor:
- retention period: 30 days
- aggregation interval: 1 minute
- alert channels: email, slack

Dashboard metrics:
- request count
- response time
- error rate
- top endpoints by traffic
`;

      const result = parse(input);

      expect(result.tracks).toHaveLength(2);
      expect(result.alerts).toHaveLength(2);
      expect(result.monitorConfig).toBeDefined();
      expect(result.dashboard).toBeDefined();
    });

    it('should handle sections in any order', () => {
      const input = `
Dashboard metrics:
- request count

Monitor:
- retention period: 30 days

Alert when:
- request count exceeds 1000

Track for all endpoints:
- request count
`;

      const result = parse(input);

      expect(result.tracks).toHaveLength(1);
      expect(result.alerts).toHaveLength(1);
      expect(result.monitorConfig).toBeDefined();
      expect(result.dashboard).toBeDefined();
    });

    it('should handle empty file', () => {
      const input = '';

      const result = parse(input);

      expect(result.tracks).toHaveLength(0);
      expect(result.alerts).toHaveLength(0);
      expect(result.monitorConfig).toBeUndefined();
      expect(result.dashboard).toBeUndefined();
    });

    it('should handle file with only newlines', () => {
      const input = '\n\n\n';

      const result = parse(input);

      expect(result.tracks).toHaveLength(0);
      expect(result.alerts).toHaveLength(0);
    });

    it('should handle comments', () => {
      const input = `
# Track API metrics
Track for all endpoints:
- request count
# Response time is important
- response time

# Set up alerts
Alert when:
- response time exceeds 500 milliseconds
`;

      const result = parse(input);

      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0]!.metrics).toHaveLength(2);
      expect(result.alerts).toHaveLength(1);
    });
  });

  describe('Real World Example', () => {
    it('should parse complete blog monitor.dsl file', () => {
      const monitorDslPath = join(__dirname, '../../../../examples/blog/schema/monitor.dsl');
      const monitorDsl = readFileSync(monitorDslPath, 'utf-8');

      const result = parse(monitorDsl);

      // Verify structure
      expect(result.tracks.length).toBeGreaterThan(0);
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.monitorConfig).toBeDefined();
      expect(result.dashboard).toBeDefined();

      // Verify specific sections
      const allEndpointsTrack = result.tracks.find((t) => t.scope.type === 'all_endpoints');
      expect(allEndpointsTrack).toBeDefined();
      expect(allEndpointsTrack?.metrics.length).toBeGreaterThan(0);

      const postsTrack = result.tracks.find(
        (t) => t.scope.type === 'model' && t.scope.modelName === 'Posts'
      );
      expect(postsTrack).toBeDefined();

      // Verify alerts
      const globalAlerts = result.alerts.find((a) => !a.modelName);
      expect(globalAlerts).toBeDefined();
      expect(globalAlerts?.conditions.length).toBeGreaterThan(0);

      // Verify monitor config
      expect(result.monitorConfig?.items.length).toBeGreaterThan(0);

      // Verify dashboard
      expect(result.dashboard?.metrics.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all metric types', () => {
      const input = `
Track for all endpoints:
- request count
- response time
- error rate
- status codes

Track for Posts:
- create count
- update count
- delete count
- read count
`;

      const result = parse(input);

      const allMetrics = result.tracks.flatMap((t) => t.metrics);
      expect(allMetrics.some((m) => m.metricType === MetricType.REQUEST_COUNT)).toBe(true);
      expect(allMetrics.some((m) => m.metricType === MetricType.RESPONSE_TIME)).toBe(true);
      expect(allMetrics.some((m) => m.metricType === MetricType.ERROR_RATE)).toBe(true);
      expect(allMetrics.some((m) => m.metricType === MetricType.STATUS_CODES)).toBe(true);
      expect(allMetrics.some((m) => m.metricType === MetricType.CREATE_COUNT)).toBe(true);
      expect(allMetrics.some((m) => m.metricType === MetricType.UPDATE_COUNT)).toBe(true);
      expect(allMetrics.some((m) => m.metricType === MetricType.DELETE_COUNT)).toBe(true);
      expect(allMetrics.some((m) => m.metricType === MetricType.READ_COUNT)).toBe(true);
    });

    it('should handle decimal thresholds', () => {
      const input = `
Track for all endpoints:
- error rate

Alert when:
- error rate exceeds 0.5%
- error rate exceeds 2.75%
`;

      const result = parse(input);

      expect(result.alerts[0]!.conditions[0]!.threshold).toBe(0.5);
      expect(result.alerts[0]!.conditions[1]!.threshold).toBe(2.75);
    });

    it('should handle large threshold values', () => {
      const input = `
Track for all endpoints:
- request count

Alert when:
- request count exceeds 1000000 requests
`;

      const result = parse(input);

      expect(result.alerts[0]!.conditions[0]!.threshold).toBe(1000000);
    });

    it('should throw error on Track without metrics', () => {
      const input = `
Track for all endpoints:
`;

      expect(() => parse(input)).toThrow('Track section must have at least one metric');
    });

    it('should throw error on Alert without conditions', () => {
      const input = `
Track for all endpoints:
- request count

Alert when:
`;

      expect(() => parse(input)).toThrow('Alert section must have at least one condition');
    });

    it('should throw error on Monitor without config items', () => {
      const input = `
Track for all endpoints:
- request count

Alert when:
- request count exceeds 1000

Monitor:
`;

      expect(() => parse(input)).toThrow('Monitor section must have at least one config item');
    });

    it('should throw error on Dashboard without metrics', () => {
      const input = `
Track for all endpoints:
- request count

Alert when:
- request count exceeds 1000

Dashboard metrics:
`;

      expect(() => parse(input)).toThrow('Dashboard section must have at least one metric');
    });
  });

  describe('Error Handling', () => {
    it('should throw error on invalid comparison operator', () => {
      const input = `
Track for all endpoints:
- request count

Alert when:
- request count greater than 1000
`;

      expect(() => parse(input)).toThrow('Expected comparison operator');
    });

    it('should throw error on missing threshold', () => {
      const input = `
Track for all endpoints:
- request count

Alert when:
- request count exceeds
`;

      expect(() => parse(input)).toThrow('Expected numeric threshold');
    });

    it('should throw error on unexpected token', () => {
      const input = `
Track for all endpoints:
- request count

Invalid section:
- something
`;

      expect(() => parse(input)).toThrow('Unexpected token in MONITOR file');
    });
  });
});
