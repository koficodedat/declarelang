/**
 * Parser for MONITOR.DSL
 * Implements recursive descent parsing based on DSL Grammar Specification v0.1.0
 *
 * Grammar:
 * monitor_file ::= track_def+ alert_def+ monitor_def? dashboard_def?
 *
 * track_def ::= "Track for" scope ":" newline metric_item+
 * scope ::= "all endpoints" | model_name
 * metric_item ::= "-" metric_name newline
 *
 * alert_def ::= "Alert when:" newline alert_condition+
 *             | "Alert for" model_name ":" newline alert_condition+
 * alert_condition ::= "-" metric comparison threshold time_window? newline
 *
 * monitor_def ::= "Monitor:" newline monitor_config_item+
 * monitor_config_item ::= "-" config_key ":" config_value newline
 *
 * dashboard_def ::= "Dashboard metrics:" newline dashboard_item+
 * dashboard_item ::= "-" metric_name newline
 */

import { Token, TokenType } from '../types/token.js';
import {
  MONITORFile,
  TrackDefinition,
  TrackScope,
  MetricItem,
  MetricType,
  AlertDefinition,
  AlertCondition,
  AlertComparison,
  ThresholdUnit,
  TimeWindow,
  MonitorConfig,
  MonitorConfigItem,
  DashboardDefinition,
  DashboardMetric,
} from '../types/ast.js';
import { ParseError } from './ddl-parser.js';

export class MONITORParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    // Filter out comments but keep newlines
    this.tokens = tokens.filter((t) => t.type !== TokenType.COMMENT);
  }

  /**
   * Main parse method
   */
  parse(): MONITORFile {
    const start = this.currentToken().start;
    const tracks: TrackDefinition[] = [];
    const alerts: AlertDefinition[] = [];
    let monitorConfig: MonitorConfig | undefined;
    let dashboard: DashboardDefinition | undefined;

    // Skip leading newlines
    this.skipNewlines();

    // Handle empty files
    if (this.isAtEnd()) {
      return {
        tracks: [],
        alerts: [],
        start,
        end: this.currentToken().end,
      };
    }

    // Parse sections in any order
    while (!this.isAtEnd()) {
      this.skipNewlines();
      if (this.isAtEnd()) break;

      const token = this.currentToken();

      if (token.type === TokenType.TRACK) {
        tracks.push(this.parseTrackSection());
      } else if (token.type === TokenType.ALERT) {
        alerts.push(this.parseAlertSection());
      } else if (token.type === TokenType.MONITOR) {
        if (monitorConfig) {
          throw new ParseError('Duplicate Monitor section', token.start);
        }
        monitorConfig = this.parseMonitorConfigSection();
      } else if (token.type === TokenType.DASHBOARD) {
        if (dashboard) {
          throw new ParseError('Duplicate Dashboard section', token.start);
        }
        dashboard = this.parseDashboardSection();
      } else {
        throw new ParseError(
          `Unexpected token in MONITOR file: ${token.type} "${token.value}"`,
          token.start
        );
      }

      this.skipNewlines();
    }

    const lastToken = this.tokens[this.tokens.length - 1];
    const end = lastToken ? lastToken.end : start;

    return {
      tracks,
      alerts,
      monitorConfig,
      dashboard,
      start,
      end,
    };
  }

  /**
   * Parse Track section
   * track_def ::= "Track for" scope ":" newline metric_item+
   * scope ::= "all endpoints" | model_name
   */
  private parseTrackSection(): TrackDefinition {
    const start = this.currentToken().start;

    this.consume(TokenType.TRACK, 'Expected "Track"');
    this.consume(TokenType.FOR, 'Expected "for" after "Track"');

    // Parse scope
    let scope: TrackScope;
    if (this.check(TokenType.ALL)) {
      this.advance(); // consume "all"
      this.consume(TokenType.IDENTIFIER, 'Expected "endpoints" after "all"');
      // Note: "endpoints" is not a keyword, so it comes as IDENTIFIER
      scope = { type: 'all_endpoints' };
    } else {
      // Model name can be IDENTIFIER or keyword (e.g., "Users" is TokenType.USERS)
      const modelToken = this.advance();
      if (modelToken.type === TokenType.EOF || modelToken.type === TokenType.NEWLINE) {
        throw new ParseError('Expected model name', modelToken.start);
      }
      scope = { type: 'model', modelName: modelToken.value };
    }

    this.consume(TokenType.COLON, 'Expected ":" after scope');
    this.consumeNewlines();

    // Parse metric items
    const metrics: MetricItem[] = [];
    while (this.check(TokenType.DASH)) {
      metrics.push(this.parseMetricItem());
      this.skipNewlines();
    }

    if (metrics.length === 0) {
      throw new ParseError('Track section must have at least one metric', start);
    }

    const end = this.previousToken().end;

    return {
      scope,
      metrics,
      start,
      end,
    };
  }

  /**
   * Parse metric item
   * metric_item ::= "-" metric_name newline
   */
  private parseMetricItem(): MetricItem {
    const start = this.currentToken().start;

    this.consume(TokenType.DASH, 'Expected "-"');

    // Collect metric name tokens until newline
    const metricParts: string[] = [];
    while (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
      metricParts.push(this.advance().value);
    }

    if (metricParts.length === 0) {
      throw new ParseError('Expected metric name after "-"', start);
    }

    const metricName = metricParts.join(' ').toLowerCase();
    const metricType = this.mapMetricType(metricName);

    this.consumeNewlines();

    const end = this.previousToken().end;

    return {
      name: metricName,
      originalName: metricName,
      metricType,
      start,
      end,
    };
  }

  /**
   * Parse Alert section
   * alert_def ::= "Alert when:" newline alert_condition+
   *             | "Alert for" model_name ":" newline alert_condition+
   */
  private parseAlertSection(): AlertDefinition {
    const start = this.currentToken().start;

    this.consume(TokenType.ALERT, 'Expected "Alert"');

    let modelName: string | undefined;

    if (this.check(TokenType.WHEN)) {
      this.advance(); // consume "when"
    } else if (this.check(TokenType.FOR)) {
      this.advance(); // consume "for"
      // Model name can be IDENTIFIER or keyword (e.g., "Users" is TokenType.USERS)
      const modelToken = this.advance();
      if (modelToken.type === TokenType.EOF || modelToken.type === TokenType.NEWLINE) {
        throw new ParseError('Expected model name after "for"', modelToken.start);
      }
      modelName = modelToken.value;
    } else {
      throw new ParseError('Expected "when" or "for" after "Alert"', this.currentToken().start);
    }

    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewlines();

    // Parse alert conditions
    const conditions: AlertCondition[] = [];
    while (this.check(TokenType.DASH)) {
      conditions.push(this.parseAlertCondition());
      this.skipNewlines();
    }

    if (conditions.length === 0) {
      throw new ParseError('Alert section must have at least one condition', start);
    }

    const end = this.previousToken().end;

    return {
      modelName,
      conditions,
      start,
      end,
    };
  }

  /**
   * Parse alert condition
   * alert_condition ::= "-" metric comparison threshold time_window? newline
   * comparison ::= "exceeds" | "is above" | "is below" | "equals"
   * threshold ::= number unit?
   * time_window ::= "in" time_expression
   */
  private parseAlertCondition(): AlertCondition {
    const start = this.currentToken().start;

    this.consume(TokenType.DASH, 'Expected "-"');

    // Collect entire line
    const lineParts: string[] = [];
    while (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
      lineParts.push(this.advance().value);
    }

    if (lineParts.length === 0) {
      throw new ParseError('Expected alert condition after "-"', start);
    }

    // Parse metric name (everything before comparison operator)
    let metric = '';
    let comparison: AlertComparison = AlertComparison.EXCEEDS;
    let threshold = 0;
    let thresholdUnit: ThresholdUnit | undefined;
    let timeWindow: TimeWindow | undefined;

    const line = lineParts.join(' ');
    const lowerLine = line.toLowerCase();

    // Find comparison operator
    let comparisonIndex = -1;
    let comparisonLength = 0;

    if (lowerLine.includes('exceeds')) {
      comparison = AlertComparison.EXCEEDS;
      comparisonIndex = lowerLine.indexOf('exceeds');
      comparisonLength = 7;
    } else if (lowerLine.includes('is above')) {
      comparison = AlertComparison.IS_ABOVE;
      comparisonIndex = lowerLine.indexOf('is above');
      comparisonLength = 8;
    } else if (lowerLine.includes('is below')) {
      comparison = AlertComparison.IS_BELOW;
      comparisonIndex = lowerLine.indexOf('is below');
      comparisonLength = 8;
    } else if (lowerLine.includes('equals')) {
      comparison = AlertComparison.EQUALS;
      comparisonIndex = lowerLine.indexOf('equals');
      comparisonLength = 6;
    } else {
      throw new ParseError(
        'Expected comparison operator (exceeds, is above, is below, equals)',
        start
      );
    }

    // Extract metric name (everything before comparison)
    metric = line.substring(0, comparisonIndex).trim();

    // Extract threshold and optional unit
    let afterComparison = line.substring(comparisonIndex + comparisonLength).trim();

    // Check for time window ("in X minutes/hours/days")
    const inIndex = afterComparison.toLowerCase().indexOf(' in ');
    if (inIndex !== -1) {
      const timeWindowPart = afterComparison.substring(inIndex + 4).trim();
      afterComparison = afterComparison.substring(0, inIndex).trim();

      // Parse time window
      const timeWindowParts = timeWindowPart.split(' ');
      if (timeWindowParts.length >= 2) {
        const valueStr = timeWindowParts[0];
        const unitStr = timeWindowParts[1];

        if (valueStr && unitStr) {
          const value = parseInt(valueStr, 10);
          const unit = unitStr.toLowerCase().replace(/s$/, ''); // Remove plural 's'

          if (!isNaN(value)) {
            timeWindow = {
              value,
              unit,
              start,
              end: this.currentToken().start,
            };
          }
        }
      }
    }

    // Parse threshold
    const thresholdParts = afterComparison.split(' ');
    const thresholdStr = thresholdParts[0];

    if (!thresholdStr) {
      throw new ParseError('Expected numeric threshold after comparison operator', start);
    }

    threshold = parseFloat(thresholdStr);

    if (isNaN(threshold)) {
      throw new ParseError('Expected numeric threshold after comparison operator', start);
    }

    // Check for unit (percent, milliseconds, requests, etc.)
    if (thresholdParts.length > 1) {
      const unitStr = thresholdParts[1];
      if (unitStr) {
        thresholdUnit = this.mapThresholdUnit(unitStr.toLowerCase());
      }
    }

    this.consumeNewlines();

    const end = this.previousToken().end;

    return {
      metric,
      comparison,
      threshold,
      thresholdUnit,
      timeWindow,
      start,
      end,
    };
  }

  /**
   * Parse Monitor config section
   * monitor_def ::= "Monitor:" newline monitor_config_item+
   * monitor_config_item ::= "-" config_key ":" config_value newline
   */
  private parseMonitorConfigSection(): MonitorConfig {
    const start = this.currentToken().start;

    this.consume(TokenType.MONITOR, 'Expected "Monitor"');
    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewlines();

    // Parse config items
    const items: MonitorConfigItem[] = [];
    while (this.check(TokenType.DASH)) {
      items.push(this.parseMonitorConfigItem());
      this.skipNewlines();
    }

    if (items.length === 0) {
      throw new ParseError('Monitor section must have at least one config item', start);
    }

    const end = this.previousToken().end;

    return {
      items,
      start,
      end,
    };
  }

  /**
   * Parse monitor config item
   * monitor_config_item ::= "-" config_key ":" config_value newline
   */
  private parseMonitorConfigItem(): MonitorConfigItem {
    const start = this.currentToken().start;

    this.consume(TokenType.DASH, 'Expected "-"');

    // Collect key (everything before colon)
    const keyParts: string[] = [];
    while (!this.check(TokenType.COLON) && !this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
      keyParts.push(this.advance().value);
    }

    if (keyParts.length === 0) {
      throw new ParseError('Expected config key after "-"', start);
    }

    const key = keyParts.join(' ').toLowerCase();

    this.consume(TokenType.COLON, 'Expected ":" after config key');

    // Collect value (everything after colon until newline)
    // Note: value is parsed but not stored in v0.1.0 MonitorConfigItem interface
    while (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
      this.advance();
    }

    this.consumeNewlines();

    const end = this.previousToken().end;

    return {
      name: key,
      originalName: key,
      start,
      end,
    };
  }

  /**
   * Parse Dashboard section
   * dashboard_def ::= "Dashboard metrics:" newline dashboard_item+
   * dashboard_item ::= "-" metric_name newline
   */
  private parseDashboardSection(): DashboardDefinition {
    const start = this.currentToken().start;

    this.consume(TokenType.DASHBOARD, 'Expected "Dashboard"');

    // "metrics" is not a keyword, comes as IDENTIFIER
    const metricsToken = this.consume(TokenType.IDENTIFIER, 'Expected "metrics" after "Dashboard"');
    if (metricsToken.value.toLowerCase() !== 'metrics') {
      throw new ParseError('Expected "metrics" after "Dashboard"', metricsToken.start);
    }

    this.consume(TokenType.COLON, 'Expected ":"');
    this.consumeNewlines();

    // Parse dashboard metrics
    const metrics: DashboardMetric[] = [];
    while (this.check(TokenType.DASH)) {
      metrics.push(this.parseDashboardMetric());
      this.skipNewlines();
    }

    if (metrics.length === 0) {
      throw new ParseError('Dashboard section must have at least one metric', start);
    }

    const end = this.previousToken().end;

    return {
      metrics,
      start,
      end,
    };
  }

  /**
   * Parse dashboard metric
   * dashboard_item ::= "-" metric_name newline
   */
  private parseDashboardMetric(): DashboardMetric {
    const start = this.currentToken().start;

    this.consume(TokenType.DASH, 'Expected "-"');

    // Collect metric name tokens until newline
    const metricParts: string[] = [];
    while (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
      metricParts.push(this.advance().value);
    }

    if (metricParts.length === 0) {
      throw new ParseError('Expected metric name after "-"', start);
    }

    const name = metricParts.join(' ');

    this.consumeNewlines();

    const end = this.previousToken().end;

    return {
      name,
      originalName: name,
      start,
      end,
    };
  }

  /**
   * Map metric name to MetricType enum
   */
  private mapMetricType(metricName: string): MetricType {
    const normalized = metricName.toLowerCase().replace(/\s+/g, '_');

    if (normalized === 'request_count' || normalized === 'requests') {
      return MetricType.REQUEST_COUNT;
    }
    if (
      normalized === 'response_time' ||
      normalized === 'response_times' ||
      normalized === 'avg_response_time'
    ) {
      return MetricType.RESPONSE_TIME;
    }
    if (normalized === 'error_rate' || normalized === 'errors') {
      return MetricType.ERROR_RATE;
    }
    if (normalized === 'status_codes') {
      return MetricType.STATUS_CODES;
    }
    if (normalized === 'create_count' || normalized === 'creates') {
      return MetricType.CREATE_COUNT;
    }
    if (normalized === 'update_count' || normalized === 'updates') {
      return MetricType.UPDATE_COUNT;
    }
    if (normalized === 'delete_count' || normalized === 'deletes') {
      return MetricType.DELETE_COUNT;
    }
    if (normalized === 'read_count' || normalized === 'reads') {
      return MetricType.READ_COUNT;
    }

    return MetricType.CUSTOM;
  }

  /**
   * Map threshold unit string to ThresholdUnit enum
   */
  private mapThresholdUnit(unit: string): ThresholdUnit {
    const lowerUnit = unit.toLowerCase();

    // v0.1.0: Only full words, no abbreviations (except % symbol)
    switch (lowerUnit) {
      case '%':
      case 'percent':
        return ThresholdUnit.PERCENT;
      case 'millisecond':
      case 'milliseconds':
        return ThresholdUnit.MILLISECONDS;
      case 'second':
      case 'seconds':
        return ThresholdUnit.SECONDS;
      case 'request':
      case 'requests':
        return ThresholdUnit.REQUESTS;
      case 'error':
      case 'errors':
        return ThresholdUnit.ERRORS;
      case 'count':
        return ThresholdUnit.COUNT;
      default:
        return ThresholdUnit.CUSTOM;
    }
  }

  /**
   * Token navigation helpers
   */
  private currentToken(): Token {
    const token = this.tokens[this.current];
    if (token) return token;
    const lastToken = this.tokens[this.tokens.length - 1];
    if (lastToken) return lastToken;
    return {
      type: TokenType.EOF,
      value: '',
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
    };
  }

  private previousToken(): Token {
    if (this.current > 0) {
      const token = this.tokens[this.current - 1];
      if (token) return token;
    }
    const firstToken = this.tokens[0];
    if (firstToken) return firstToken;
    return {
      type: TokenType.EOF,
      value: '',
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
    };
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.currentToken().type === TokenType.EOF;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previousToken();
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.currentToken().type === type;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }

    throw new ParseError(message, this.currentToken().start);
  }

  private skipNewlines(): void {
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
    }
  }

  private consumeNewlines(): void {
    if (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
      throw new ParseError('Expected newline', this.currentToken().start);
    }
    this.skipNewlines();
  }
}
