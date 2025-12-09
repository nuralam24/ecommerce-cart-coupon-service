import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * GET /health - Health check
 */
export function ApiHealthCheck() {
  return applyDecorators(
    ApiOperation({ summary: 'Check service health' }),
    ApiResponse({ status: 200, description: 'Service is healthy' }),
    ApiResponse({ status: 503, description: 'Service is unhealthy' }),
  );
}

/**
 * GET /health/live - Liveness probe
 */
export function ApiLivenessProbe() {
  return applyDecorators(
    ApiOperation({ summary: 'Liveness probe' }),
    ApiResponse({ status: 200, description: 'Service is alive' }),
  );
}

/**
 * GET /health/ready - Readiness probe
 */
export function ApiReadinessProbe() {
  return applyDecorators(
    ApiOperation({ summary: 'Readiness probe' }),
    ApiResponse({ status: 200, description: 'Service is ready' }),
    ApiResponse({ status: 503, description: 'Service is not ready' }),
  );
}

