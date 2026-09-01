import { Injectable, ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { Company } from './entities/company.entity';
import { User } from '../auth/entities/user.entity';
import { TenantContext } from '../common/tenant-context';
import { AuthService } from '../auth/auth.service';

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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly authService: AuthService,
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
    dto: Partial<{
      name: string;
      license_key: string | null;
      features: string[];
      subscription_ends_at: string | null;
      plan: string;
      is_active: boolean;
      settings: Record<string, unknown>;
    }>,
    ctx: TenantContext,
  ): Promise<Tenant> {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Only platform admin can update tenant');
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new ForbiddenException('Tenant not found');
    if (dto.name !== undefined) tenant.name = dto.name;
    if (dto.license_key !== undefined) tenant.license_key = dto.license_key;
    if (dto.features !== undefined) tenant.features = dto.features;
    if (dto.subscription_ends_at !== undefined) tenant.subscription_ends_at = dto.subscription_ends_at ? new Date(dto.subscription_ends_at) : null;
    if (dto.plan !== undefined) tenant.plan = dto.plan;
    if (dto.is_active !== undefined) tenant.is_active = dto.is_active;
    if (dto.settings !== undefined) {
      tenant.settings = { ...(tenant.settings ?? {}), ...dto.settings };
    }
    return this.tenantRepo.save(tenant);
  }

  async listUsers(tenantId: string, ctx: TenantContext) {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Only platform admin can list tenant users');
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const users = await this.userRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'ASC' },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      is_active: u.is_active,
      email_verified: u.email_verified !== false,
      last_login_at: u.last_login_at,
    }));
  }

  async updateUser(
    tenantId: string,
    userId: string,
    dto: Partial<{ email: string; name: string; is_active: boolean; email_verified: boolean }>,
    ctx: TenantContext,
  ) {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Only platform admin can update tenant users');
    const user = await this.userRepo.findOne({ where: { id: userId, tenant_id: tenantId } });
    if (!user) throw new NotFoundException('User not found');
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (!email) throw new ForbiddenException('Email is required');
      const clash = await this.userRepo.findOne({ where: { tenant_id: tenantId, email } });
      if (clash && clash.id !== user.id) throw new ConflictException('That email is already used in this workspace');
      user.email = email;
    }
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.is_active !== undefined) user.is_active = dto.is_active;
    if (dto.email_verified !== undefined) user.email_verified = dto.email_verified;
    const saved = await this.userRepo.save(user);
    return {
      id: saved.id,
      email: saved.email,
      name: saved.name,
      is_active: saved.is_active,
      email_verified: saved.email_verified !== false,
      last_login_at: saved.last_login_at,
    };
  }

  async sendUserPasswordReset(tenantId: string, userId: string, ctx: TenantContext) {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Only platform admin can send a reset');
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const user = await this.userRepo.findOne({ where: { id: userId, tenant_id: tenantId } });
    if (!user) throw new NotFoundException('User not found');
    return this.authService.forgotPassword({ email: user.email, tenantSlug: tenant.slug });
  }
}
