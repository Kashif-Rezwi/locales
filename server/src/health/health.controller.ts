import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * Health check endpoint — used by deployment platforms to verify the service
 * is running, and by the client settings page to show connection status.
 *
 * GET /api/health → { status, timestamp, version, uptime }
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check — returns server status and uptime' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
    };
  }
}
