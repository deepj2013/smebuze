import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

/** Minimal context for audit logging (tenant + user only). */
export type AuditContext = { tenantId?: string | null; userId?: string };

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(
    ctx: AuditContext,
    action: string,
    resource: string,
    resourceId?: string | null,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.auditRepo.save(
      this.auditRepo.create({
        tenant_id: ctx.tenantId ?? null,
        user_id: ctx.userId ?? null,
        action,
        resource,
        resource_id: resourceId ?? null,
        details: details ?? {},
      }),
    );
  }

  async findForTenant(
    tenantId: string,
    options?: { from?: Date; to?: Date; resource?: string; limit?: number },
  ): Promise<AuditLog[]> {
    const qb = this.auditRepo
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId })
      .orderBy('a.created_at', 'DESC')
      .take(options?.limit ?? 100);
    if (options?.from) qb.andWhere('a.created_at >= :from', { from: options.from });
    if (options?.to) qb.andWhere('a.created_at <= :to', { to: options.to });
    if (options?.resource) qb.andWhere('a.resource = :resource', { resource: options.resource });
    return qb.getMany();
  }
}
