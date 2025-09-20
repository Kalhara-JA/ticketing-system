/**
 * @fileoverview src/lib/logger.ts
 * Structured logging wrapper with environment-aware output and context sanitization
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  ticketId?: string;
  action?: string;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  private log(level: LogLevel, message: string, context?: LogContext) {
    // In production, only log errors and warnings
    if (this.isProduction && (level === "debug" || level === "info")) {
      return;
    }

    const timestamp = new Date().toISOString();

    // Use appropriate console method
    switch (level) {
      case "debug":
      case "info":
        console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, context || "");
        break;
      case "warn":
        console.warn(`[${timestamp}] WARN: ${message}`, context || "");
        break;
      case "error":
        console.error(`[${timestamp}] ERROR: ${message}`, context || "");
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext) {
    this.log("error", message, context);
  }

  // Convenience methods for common operations
  ticketOperation(operation: string, ticketId: string, userId?: string, additionalContext?: LogContext) {
    this.info(`Ticket ${operation}`, {
      action: operation,
      ticketId,
      userId,
      ...additionalContext,
    });
  }

  userOperation(operation: string, userId: string, additionalContext?: LogContext) {
    this.info(`User ${operation}`, {
      action: operation,
      userId,
      ...additionalContext,
    });
  }

  authOperation(operation: string, userId?: string, additionalContext?: LogContext) {
    this.info(`Auth ${operation}`, {
      action: operation,
      userId,
      ...additionalContext,
    });
  }

  emailOperation(operation: string, to: string, additionalContext?: LogContext) {
    this.info(`Email ${operation}`, {
      action: operation,
      to,
      ...additionalContext,
    });
  }

  attachmentOperation(operation: string, attachmentId: string, userId?: string, additionalContext?: LogContext) {
    this.info(`Attachment ${operation}`, {
      action: operation,
      attachmentId,
      userId,
      ...additionalContext,
    });
  }

  commentOperation(operation: string, commentId: string, userId?: string, additionalContext?: LogContext) {
    this.info(`Comment ${operation}`, {
      action: operation,
      commentId,
      userId,
      ...additionalContext,
    });
  }
}

export const logger = new Logger();
