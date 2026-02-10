/**
 * Structured JSON Logger (REQ-ERR-013, REQ-ERR-014)
 *
 * Lightweight structured logging for Vercel serverless functions.
 * Outputs JSON to stdout/stderr (Vercel captures these automatically).
 *
 * No external dependencies -- keeps cold starts fast.
 *
 * Layer 2: API infrastructure.
 */

export type LogLevel = 'ERROR' | 'WARN' | 'INFO';

export interface LogContext {
  requestId?: string;
  leagueId?: string;
  userId?: string;
  operation?: string;
  code?: string;
  duration_ms?: number;
  error?: Error;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

function buildEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context) {
    const { error, ...rest } = context;
    // Only include defined values
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        entry[key] = value;
      }
    }
    if (error instanceof Error) {
      entry.stack = error.stack ?? error.message;
    }
  }

  return entry;
}

export const logger = {
  info(message: string, context?: LogContext): void {
    console.log(JSON.stringify(buildEntry('INFO', message, context)));
  },

  warn(message: string, context?: LogContext): void {
    console.log(JSON.stringify(buildEntry('WARN', message, context)));
  },

  error(message: string, context?: LogContext): void {
    console.error(JSON.stringify(buildEntry('ERROR', message, context)));
  },
};
