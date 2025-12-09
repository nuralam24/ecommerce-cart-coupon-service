import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * SQL Injection Detection Middleware
 * Detects and blocks common SQL injection patterns in requests
 */
@Injectable()
export class SqlInjectionDetectorMiddleware implements NestMiddleware {
  // Common SQL injection patterns
  private readonly sqlInjectionPatterns = [
    /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|eval)(\s|$)/gi,
    /(\bor\b|\band\b)(\s+)?\d+(\s+)?=(\s+)?\d+/gi, // OR 1=1, AND 1=1
    /;(\s+)?(drop|delete|truncate|update|insert)/gi,
    /\/\*.*\*\//gi, // SQL comments
    /--[\s\S]*/gi,   // SQL comments
    /'(\s+)?(or|and)(\s+)?'/gi, // ' OR '
    /\bxp_\w+/gi,    // Extended stored procedures
    /\bsp_\w+/gi,    // System stored procedures
  ];

  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Check query parameters
      if (req.query) {
        this.checkForSqlInjection(req.query, 'Query Parameter');
      }

      // Check body
      if (req.body) {
        this.checkForSqlInjection(req.body, 'Request Body');
      }

      // Check URL params
      if (req.params) {
        this.checkForSqlInjection(req.params, 'URL Parameter');
      }

      next();
    } catch (error) {
      throw new BadRequestException('Invalid input detected');
    }
  }

  private checkForSqlInjection(obj: any, location: string): void {
    if (typeof obj === 'string') {
      this.detectSqlInjection(obj, location);
    } else if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach((key) => {
        this.checkForSqlInjection(obj[key], location);
      });
    }
  }

  private detectSqlInjection(value: string, location: string): void {
    for (const pattern of this.sqlInjectionPatterns) {
      if (pattern.test(value)) {
        console.error(`[SECURITY] SQL Injection attempt detected in ${location}: ${value}`);
        throw new BadRequestException(`Suspicious input detected in ${location}`);
      }
    }
  }
}

