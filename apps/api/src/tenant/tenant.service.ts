import { Injectable, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { Company } from './entities/company.entity';
import { TenantContext } from '../common/tenant-context';

export interface CreateTenantDto {
  name: string;
  slug: string;
  plan?: string;
  features?: string[];
}

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(dto: CreateTenantDto, ctx: TenantContext): Promise<Tenant> {
    if (!ctx.isSuperAdmin) {
      throw new ForbiddenException('Only platform admin can create tenants');
    }
    const platformOrgId = 'a0000000-0000-0000-0000-000000000001';
    const existing = await this.tenantRepo.findOne({
      where: { platform_org_id: platformOrgId, slug: dto.slug },
    });
    if (existing) throw new ConflictException('Tenant slug already exists');

    const tenant = this.tenantRepo.create({
      platform_org_id: platformOrgId,
      name: dto.name,
      slug: dto.slug,
      plan: dto.plan ?? 'basic',
      features: dto.features ?? ['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports'],
    });
    return this.tenantRepo.save(tenant);
  }

  async findAll(ctx: TenantContext): Promise<Tenant[]> {
    if (!ctx.isSuperAdmin) {
      throw new ForbiddenException('Only platform admin can list tenants');
    }
    return this.tenantRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, ctx: TenantContext): Promise<Tenant | null> {
    if (ctx.isSuperAdmin) {
      return this.tenantRepo.findOne({ where: { id } });
    }
    if (ctx.tenantId !== id) throw new ForbiddenException('Access denied');
    return this.tenantRepo.findOne({ where: { id } });
  }

  async update(
    id: string,
    dto: Partial<{ license_key: string | null; features: string[]; subscription_ends_at: string | null; plan: string }>,
    ctx: TenantContext,
  ): Promise<Tenant> {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Only platform admin can update tenant');
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new ForbiddenException('Tenant not found');
    if (dto.license_key !== undefined) tenant.license_key = dto.license_key;
    if (dto.features !== undefined) tenant.features = dto.features;
    if (dto.subscription_ends_at !== undefined) tenant.subscription_ends_at = dto.subscription_ends_at ? new Date(dto.subscription_ends_at) : null;
    if (dto.plan !== undefined) tenant.plan = dto.plan;
    return this.tenantRepo.save(tenant);
  }
}
