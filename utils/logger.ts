/**
 * Logger Utility
 * 
 * Centralized logging utility that:
 * - Only logs in development mode
 * - Can send errors to monitoring service in production
 * - Provides consistent logging interface
 */

type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
  context?: string;
}

class Logger {
  private isDev = import.meta.env.DEV;
  private isProd = import.meta.env.PROD;

  /**
   * Log a message (only in development)
   */
  log(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`[LOG] ${message}`, ...args);
    }
  }

  /**
   * Log an error
   * In production: can send to monitoring service
   */
  error(message: string, error?: any, context?: string): void {
    const entry: LogEntry = {
      level: 'error',
      message,
      data: error,
      timestamp: new Date(),
      context,
    };

    if (this.isDev) {
      console.error(`[ERROR] ${context ? `[${context}] ` : ''}${message}`, error);
    } else if (this.isProd) {
      // In production: send to monitoring service (e.g., Sentry, LogRocket)
      // Example: monitoringService.captureException(error, { extra: { message, context } });
      console.error(`[ERROR] ${message}`);
    }
  }

  /**
   * Log a warning (only in development)
   */
  warn(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Log info (only in development)
   */
  info(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Debug log (only in development)
   */
  debug(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Group related logs
   */
  group(label: string): void {
    if (this.isDev) {
      console.group(label);
    }
  }

  /**
   * End log group
   */
  groupEnd(): void {
    if (this.isDev) {
      console.groupEnd();
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing
export { Logger };

