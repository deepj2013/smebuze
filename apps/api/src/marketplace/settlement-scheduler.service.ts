import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MallService } from './mall.service';
import { TenantContext } from '../common/tenant-context';

/**
 * Settlement builder without @nestjs/schedule (keeps deps light on VPS).
 * Default cadence T+1: daily ~03:00 local (orders eligible after settle_days).
 * Set MARKETPLACE_SETTLEMENT_CADENCE=weekly for Sunday-only builds.
 * MARKETPLACE_SETTLEMENT_FORCE=1 builds once on boot.
 */
@Injectable()
export class SettlementSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SettlementSchedulerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastRunKey = '';

  constructor(private readonly mall: MallService) {}

  private cadence(): 't1' | 'weekly' {
    const raw = (process.env.MARKETPLACE_SETTLEMENT_CADENCE || 't1').trim().toLowerCase();
    return raw === 'weekly' ? 'weekly' : 't1';
  }

  onModuleInit() {
    const enabled = (process.env.MARKETPLACE_SETTLEMENT_CRON || '1').trim() !== '0';
    if (!enabled) {
      this.logger.log('Settlement cron disabled (MARKETPLACE_SETTLEMENT_CRON=0)');
      return;
    }
    // Hourly tick
    this.timer = setInterval(() => this.tick(), 60 * 60 * 1000);
    // First check shortly after boot
    setTimeout(() => this.tick(true), 15_000);
    this.logger.log(
      `Settlement cron armed (${this.cadence() === 'weekly' ? 'weekly Sunday' : 'daily T+1'} ~03:00 local, hourly check)`,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private platformCtx(): TenantContext {
    return {
      isSuperAdmin: true,
      permissions: ['*'],
      tenantId: null,
      userId: 'system-settlement-cron',
      email: 'system@smebuze.com',
      roleIds: [],
    };
  }

  private shouldRunNow(forceBoot: boolean): boolean {
    if (forceBoot && process.env.MARKETPLACE_SETTLEMENT_FORCE === '1') return true;
    const now = new Date();
    if (now.getHours() !== 3) return false;
    if (this.cadence() === 'weekly' && now.getDay() !== 0) return false;
    const key = `${now.toISOString().slice(0, 10)}-${this.cadence()}`;
    if (key === this.lastRunKey) return false;
    return true;
  }

  async tick(forceBoot = false) {
    try {
      if (!this.shouldRunNow(forceBoot)) return;
      const key = `${new Date().toISOString().slice(0, 10)}-${this.cadence()}`;
      this.lastRunKey = key;
      const result = await this.mall.buildOpenSettlements(this.platformCtx());
      this.logger.log(`Settlements built (${this.cadence()}): ${result.created}`);
    } catch (err) {
      this.logger.warn(`Settlement cron failed: ${(err as Error).message}`);
    }
  }

  /** Manual trigger from admin API. */
  async runNow() {
    const result = await this.mall.buildOpenSettlements(this.platformCtx());
    this.lastRunKey = new Date().toISOString().slice(0, 10) + '-manual';
    return result;
  }
}
