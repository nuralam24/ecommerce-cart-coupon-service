import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthService, HealthCheckResult } from './health.service';
import { ApiHealthCheck, ApiLivenessProbe, ApiReadinessProbe } from './decorators';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiHealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }

  @Get('live')
  @ApiLivenessProbe()
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiReadinessProbe()
  async ready(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
