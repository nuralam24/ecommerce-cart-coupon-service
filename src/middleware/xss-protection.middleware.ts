import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * XSS (Cross-Site Scripting) Protection Middleware
 * Detects and blocks XSS attack patterns
 */
@Injectable()
export class XssProtectionMiddleware implements NestMiddleware {
  // Common XSS patterns
  private readonly xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi, // onclick, onerror, etc.
    /<img[^>]+src\s*=\s*["']javascript:/gi,
    /<embed\b/gi,
    /<object\b/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /vbscript:/gi,
  ];

  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Check query parameters
      if (req.query) {
        this.checkForXss(req.query, 'Query Parameter');
      }

      // Check body
      if (req.body) {
        this.checkForXss(req.body, 'Request Body');
      }

      next();
    } catch (error) {
      throw new BadRequestException('Invalid input detected');
    }
  }

  private checkForXss(obj: any, location: string): void {
    if (typeof obj === 'string') {
      this.detectXss(obj, location);
    } else if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach((key) => {
        this.checkForXss(obj[key], location);
      });
    }
  }

  private detectXss(value: string, location: string): void {
    for (const pattern of this.xssPatterns) {
      if (pattern.test(value)) {
        console.error(`[SECURITY] XSS attempt detected in ${location}: ${value}`);
        throw new BadRequestException(`Suspicious input detected in ${location}`);
      }
    }
  }

  /**
   * Sanitize string by removing dangerous characters
   * (Optional - can be used instead of blocking)
   */
  private sanitize(value: string): string {
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}

