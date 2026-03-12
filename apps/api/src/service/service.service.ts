import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceTicket } from './entities/service-ticket.entity';
import { AmcContract } from './entities/amc-contract.entity';
import { TenantContext } from '../common/tenant-context';

@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(ServiceTicket)
    private readonly ticketRepo: Repository<ServiceTicket>,
    @InjectRepository(AmcContract)
    private readonly amcRepo: Repository<AmcContract>,
  ) {}

  private assertTenant(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant required');
    return ctx.tenantId;
  }

  async findTickets(ctx: TenantContext, companyId?: string): Promise<ServiceTicket[]> {
    const tenantId = this.assertTenant(ctx);
    const where: { tenant_id: string; company_id?: string } = { tenant_id: tenantId };
    if (companyId) where.company_id = companyId;
    return this.ticketRepo.find({ where, relations: ['customer', 'company'], order: { created_at: 'DESC' } });
  }

  async createTicket(
    ctx: TenantContext,
    dto: { company_id: string; customer_id?: string; number?: string; subject: string; description?: string; status?: string; priority?: string },
  ): Promise<ServiceTicket> {
    const tenantId = this.assertTenant(ctx);
    const number = dto.number ?? `TKT-${Date.now()}`;
    const ticket = this.ticketRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id,
      customer_id: dto.customer_id ?? null,
      number,
      subject: dto.subject,
      description: dto.description ?? null,
      status: dto.status ?? 'open',
      priority: dto.priority ?? 'medium',
      created_by: ctx.userId,
    });
    return this.ticketRepo.save(ticket);
  }

  async findAmcContracts(ctx: TenantContext, companyId?: string): Promise<AmcContract[]> {
    const tenantId = this.assertTenant(ctx);
    const where: { tenant_id: string; company_id?: string } = { tenant_id: tenantId };
    if (companyId) where.company_id = companyId;
    return this.amcRepo.find({ where, relations: ['customer', 'company'], order: { end_date: 'DESC' } });
  }

  async createAmcContract(
    ctx: TenantContext,
    dto: { company_id: string; customer_id: string; contract_number: string; start_date: string; end_date: string; renewal_date?: string; amount?: number; status?: string },
  ): Promise<AmcContract> {
    const tenantId = this.assertTenant(ctx);
    const amc = this.amcRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id,
      customer_id: dto.customer_id,
      contract_number: dto.contract_number,
      start_date: new Date(dto.start_date),
      end_date: new Date(dto.end_date),
      renewal_date: dto.renewal_date ? new Date(dto.renewal_date) : null,
      amount: String(dto.amount ?? 0),
      status: dto.status ?? 'active',
    });
    return this.amcRepo.save(amc);
  }
}
