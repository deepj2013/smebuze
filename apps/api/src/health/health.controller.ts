import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../common/decorators/public';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Public()
  async check() {
    const ok = await this.health.ping();
    return { status: ok ? 'ok' : 'error', database: ok ? 'connected' : 'disconnected' };
  }
}
