import { NextRequest } from 'next/server';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  action: string;
  ip: string;
  userAgent?: string;
  referer?: string;
  method?: string;
  url?: string;
  details?: Record<string, any>;
  requestId?: string;
  userId?: string;
  sessionId?: string;
}

class SecurityLogger {
  private static instance: SecurityLogger;
  private requestId: string;

  private constructor() {
    this.requestId = this.generateRequestId();
  }

  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    const xClientIP = request.headers.get('x-client-ip');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIP) {
      return realIP;
    }
    if (cfConnectingIP) {
      return cfConnectingIP;
    }
    if (xClientIP) {
      return xClientIP;
    }

    return request.ip || 'unknown';
  }

  private sanitizeForLogging(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'auth', 'authorization',
      'cookie', 'session', 'private', 'credential'
    ];

    const sanitized = { ...data };

    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();

      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeForLogging(sanitized[key]);
      }
    }

    return sanitized;
  }

  private formatLogEntry(entry: LogEntry): string {
    const logData = {
      ...entry,
      details: entry.details ? this.sanitizeForLogging(entry.details) : undefined
    };

    return JSON.stringify(logData);
  }

  private writeLog(level: LogLevel, action: string, request: NextRequest, details?: Record<string, any>): void {
    return;
  }
  logRequest(request: NextRequest, action: string, details?: Record<string, any>): void {
    this.writeLog(LogLevel.INFO, `REQUEST_${action.toUpperCase()}`, request, details);
  }

  logSuccess(request: NextRequest, action: string, details?: Record<string, any>): void {
    this.writeLog(LogLevel.INFO, `SUCCESS_${action.toUpperCase()}`, request, details);
  }

  logError(request: NextRequest, action: string, error: Error | string, details?: Record<string, any>): void {
    this.writeLog(LogLevel.ERROR, `ERROR_${action.toUpperCase()}`, request, {
      errorMessage: error instanceof Error ? error.message : error,
      errorStack: error instanceof Error ? error.stack : undefined,
      ...details
    });
  }

  logSecurity(request: NextRequest, action: string, details?: Record<string, any>): void {
    this.writeLog(LogLevel.SECURITY, `SECURITY_${action.toUpperCase()}`, request, details);
  }

  
  logUploadAttempt(request: NextRequest, filename: string, size: number, details?: Record<string, any>): void {
    this.logSecurity(request, 'FILE_UPLOAD_ATTEMPT', {
      filename,
      size,
      ...details
    });
  }

  logUploadSuccess(request: NextRequest, filename: string, size: number, details?: Record<string, any>): void {
    this.logSuccess(request, 'FILE_UPLOAD', {
      filename,
      size,
      ...details
    });
  }

  logUploadFailure(request: NextRequest, filename: string, reason: string, details?: Record<string, any>): void {
    this.logError(request, 'FILE_UPLOAD', reason, {
      filename,
      ...details
    });
  }

  logAPIRequest(request: NextRequest, endpoint: string, details?: Record<string, any>): void {
    this.logRequest(request, `API_${endpoint.toUpperCase()}`, details);
  }

  logAPISuccess(request: NextRequest, endpoint: string, details?: Record<string, any>): void {
    this.logSuccess(request, `API_${endpoint.toUpperCase()}`, details);
  }

  logAPIError(request: NextRequest, endpoint: string, error: Error | string, details?: Record<string, any>): void {
    this.logError(request, `API_${endpoint.toUpperCase()}`, error, details);
  }

  logAuthenticationAttempt(request: NextRequest, method: string, details?: Record<string, any>): void {
    this.logSecurity(request, 'AUTH_ATTEMPT', {
      method,
      ...details
    });
  }

  logAuthenticationSuccess(request: NextRequest, method: string, details?: Record<string, any>): void {
    this.logSecurity(request, 'AUTH_SUCCESS', {
      method,
      ...details
    });
  }

  logAuthenticationFailure(request: NextRequest, method: string, reason: string, details?: Record<string, any>): void {
    this.logSecurity(request, 'AUTH_FAILURE', {
      method,
      reason,
      ...details
    });
  }

  logSuspiciousActivity(request: NextRequest, activity: string, details?: Record<string, any>): void {
    this.logSecurity(request, 'SUSPICIOUS_ACTIVITY', {
      activity,
      ...details
    });
  }

  getRequestId(): string {
    return this.requestId;
  }

  newRequestId(): string {
    this.requestId = this.generateRequestId();
    return this.requestId;
  }
}

export const logger = SecurityLogger.getInstance();
export const logRequest = (request: NextRequest, action: string, details?: Record<string, any>) =>
  logger.logRequest(request, action, details);

export const logSuccess = (request: NextRequest, action: string, details?: Record<string, any>) =>
  logger.logSuccess(request, action, details);

export const logError = (request: NextRequest, action: string, error: Error | string, details?: Record<string, any>) =>
  logger.logError(request, action, error, details);

export const logSecurity = (request: NextRequest, action: string, details?: Record<string, any>) =>
  logger.logSecurity(request, action, details);