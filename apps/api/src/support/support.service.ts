import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TenantContext } from '../common/tenant-context';
import { Tenant } from '../tenant/entities/tenant.entity';
import { User } from '../auth/entities/user.entity';
import { PlatformSupportTicket } from './entities/platform-support-ticket.entity';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(PlatformSupportTicket)
    private readonly ticketRepo: Repository<PlatformSupportTicket>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createForTenant(
    ctx: TenantContext,
    dto: { subject: string; description?: string; category?: string; priority?: string },
  ) {
    if (!ctx.tenantId) throw new ForbiddenException('Open a workspace to raise a support ticket');
    const subject = String(dto.subject || '').trim();
    if (subject.length < 3) throw new BadRequestException('Subject is required');
    const ticket = await this.ticketRepo.save(
      this.ticketRepo.create({
        tenant_id: ctx.tenantId,
        created_by: ctx.userId,
        number: `SUP-${Date.now().toString(36).toUpperCase()}`,
        subject,
        description: dto.description?.trim() || null,
        category: dto.category || 'general',
        priority: dto.priority || 'medium',
        status: 'open',
      }),
    );
    return ticket;
  }

  async listMine(ctx: TenantContext) {
    if (!ctx.tenantId) throw new ForbiddenException('Workspace required');
    return this.ticketRepo.find({
      where: { tenant_id: ctx.tenantId },
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  async listAll(ctx: TenantContext, status?: string) {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Platform admin only');
    const where = status ? { status } : {};
    const rows = await this.ticketRepo.find({ where, order: { created_at: 'DESC' }, take: 300 });
    const tenantIds = [...new Set(rows.map((r) => r.tenant_id).filter(Boolean))] as string[];
    const userIds = [...new Set(rows.map((r) => r.created_by).filter(Boolean))] as string[];
    const tenants =
      tenantIds.length > 0
        ? await this.tenantRepo.find({ where: { id: In(tenantIds) }, select: ['id', 'name', 'slug'] })
        : [];
    const users =
      userIds.length > 0
        ? await this.userRepo.find({ where: { id: In(userIds) }, select: ['id', 'email', 'name'] })
        : [];
    const tMap = Object.fromEntries(tenants.map((t) => [t.id, t]));
    const uMap = Object.fromEntries(users.map((u) => [u.id, u]));
    return rows.map((r) => ({
      ...r,
      tenant: r.tenant_id ? tMap[r.tenant_id] || null : null,
      created_by_user: r.created_by ? uMap[r.created_by] || null : null,
    }));
  }

  async updateAdmin(
    ctx: TenantContext,
    id: string,
    dto: { status?: string; admin_notes?: string; priority?: string },
  ) {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Platform admin only');
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (dto.status) {
      ticket.status = dto.status;
      if (dto.status === 'resolved' || dto.status === 'closed') {
        ticket.resolved_at = new Date();
      }
    }
    if (dto.admin_notes !== undefined) ticket.admin_notes = dto.admin_notes;
    if (dto.priority) ticket.priority = dto.priority;
    await this.ticketRepo.save(ticket);
    return ticket;
  }
}
