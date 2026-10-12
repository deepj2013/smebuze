import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export type PlatformActivity = {
  id: string;
  created_at: string;
  action: string;
  resource: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  tenant_id: string | null;
  tenant_name: string | null;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
};

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

  /** Every workspace. Platform admin only — the caller must already be a super admin. */
  async findPlatform(options?: { tenantId?: string; limit?: number }): Promise<PlatformActivity[]> {
    const limit = Math.min(Math.max(options?.limit ?? 200, 1), 500);
    const params: unknown[] = [];
    let where = 'TRUE';
    if (options?.tenantId) {
      params.push(options.tenantId);
      where += ` AND a.tenant_id = $${params.length}`;
    }
    params.push(limit);
    const rows = await this.auditRepo.query(
      `SELECT a.id, a.created_at, a.action, a.resource, a.resource_id, a.details,
              a.tenant_id, t.name AS tenant_name,
              a.user_id, u.name AS user_name, u.email AS user_email
       FROM audit_logs a
       LEFT JOIN tenants t ON t.id = a.tenant_id
       LEFT JOIN users u ON u.id = a.user_id
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT $${params.length}`,
      params,
    ) as PlatformActivity[];
    return rows;
  }
}
