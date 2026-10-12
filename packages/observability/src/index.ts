export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRecord {
  level: LogLevel;
  message: string;
  service: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const redactedKeys = new Set(['authorization', 'cookie', 'password', 'secret', 'token']);

export function redactContext(context: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      redactedKeys.has(key.toLocaleLowerCase('en-US')) ? '[REDACTED]' : value,
    ]),
  );
}

export function createLogRecord(
  service: string,
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): LogRecord {
  return {
    level,
    message,
    service,
    timestamp: new Date().toISOString(),
    ...(context ? { context: redactContext(context) } : {}),
  };
}
