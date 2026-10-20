import { BadRequestException, Injectable, ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Tenant } from './entities/tenant.entity';
import { Company } from './entities/company.entity';
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import { UserRole } from '../auth/entities/user-role.entity';
import { Customer } from '../crm/entities/customer.entity';
import { Item } from '../inventory/entities/item.entity';
import { SalesInvoice } from '../sales/entities/sales-invoice.entity';
import { SalesOrder } from '../sales/entities/sales-order.entity';
import { LeadIngestEvent } from '../growth/entities/lead-ingest-event.entity';
import { StorefrontSite } from '../growth/entities/storefront-site.entity';
import { TenantContext } from '../common/tenant-context';
import { AuthService } from '../auth/auth.service';
import { getClientPack } from '../growth/client-packs';

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
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
    @InjectRepository(SalesInvoice)
    private readonly invoiceRepo: Repository<SalesInvoice>,
    @InjectRepository(SalesOrder)
    private readonly orderRepo: Repository<SalesOrder>,
    @InjectRepository(LeadIngestEvent)
    private readonly leadIngestRepo: Repository<LeadIngestEvent>,
    @InjectRepository(StorefrontSite)
    private readonly siteRepo: Repository<StorefrontSite>,
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
      const next = { ...(tenant.settings ?? {}), ...dto.settings };
      const type = typeof next.business_type === 'string' ? next.business_type : '';
      const pack = type ? getClientPack(type) : undefined;
      // When platform admin sets business type, shape modules/features to that shop only.
      if (pack && dto.settings.business_type !== undefined) {
        next.enabled_modules = pack.modules;
        const features = new Set([...(tenant.features ?? []), ...pack.features]);
        tenant.features = [...features];
      }
      if (Array.isArray(next.nav_hidden)) {
        const locked = new Set([
          'menu:Organization',
          'item:/organization/menus',
          'item:/organization/companies',
          'item:/organization/users',
          'item:/help',
          'menu:Admin',
          'item:/admin/tenants',
        ]);
        next.nav_hidden = next.nav_hidden.filter(
          (k): k is string => typeof k === 'string' && k.length > 0 && !locked.has(k),
        );
      }
      tenant.settings = next;
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

  async setUserPassword(tenantId: string, userId: string, password: string, ctx: TenantContext) {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Only platform admin can set a password');
    const pwd = String(password || '');
    if (pwd.length < 8) throw new BadRequestException('Password must be at least 8 characters');
    const user = await this.userRepo.findOne({ where: { id: userId, tenant_id: tenantId } });
    if (!user) throw new NotFoundException('User not found');
    user.password_hash = await bcrypt.hash(pwd, 10);
    user.email_verified = true;
    await this.userRepo.save(user);
    return { ok: true, user_id: user.id, email: user.email };
  }

  async createUser(
    tenantId: string,
    dto: { email: string; name?: string; password: string },
    ctx: TenantContext,
  ) {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Only platform admin can create users');
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const email = dto.email.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email is required');
    const pwd = String(dto.password || '');
    if (pwd.length < 8) throw new BadRequestException('Password must be at least 8 characters');
    const clash = await this.userRepo.findOne({ where: { tenant_id: tenantId, email } });
    if (clash) throw new ConflictException('That email is already used in this workspace');

    let adminRole = await this.roleRepo.findOne({ where: { tenant_id: tenantId, slug: 'tenant_admin' } });
    if (!adminRole) {
      adminRole = await this.roleRepo.findOne({ where: { tenant_id: tenantId }, order: { created_at: 'ASC' } });
    }
    const company = await this.companyRepo.findOne({ where: { tenant_id: tenantId, is_default: true } });

    const user = await this.userRepo.save(
      this.userRepo.create({
        email,
        password_hash: await bcrypt.hash(pwd, 10),
        name: dto.name?.trim() || email.split('@')[0],
        tenant_id: tenantId,
        default_company_id: company?.id ?? null,
        is_super_admin: false,
        email_verified: true,
        is_active: true,
      }),
    );
    if (adminRole) {
      await this.userRoleRepo.save(this.userRoleRepo.create({ user_id: user.id, role_id: adminRole.id }));
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      is_active: user.is_active,
      email_verified: true,
    };
  }

  async getUsage(tenantId: string, ctx: TenantContext) {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Only platform admin can view tenant usage');
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const [
      users,
      companies,
      customers,
      items,
      invoices,
      portalOrders,
      leads,
      site,
      lastInvoice,
      lastOrder,
    ] = await Promise.all([
      this.userRepo.count({ where: { tenant_id: tenantId } }),
      this.companyRepo.count({ where: { tenant_id: tenantId } }),
      this.customerRepo.count({ where: { tenant_id: tenantId } }),
      this.itemRepo.count({ where: { tenant_id: tenantId, is_active: true } }),
      this.invoiceRepo.count({ where: { tenant_id: tenantId } }),
      this.orderRepo.count({ where: { tenant_id: tenantId, channel: 'buyer_portal' } }),
      this.leadIngestRepo.count({ where: { tenant_id: tenantId } }),
      this.siteRepo.findOne({ where: { tenant_id: tenantId } }),
      this.invoiceRepo.findOne({ where: { tenant_id: tenantId }, order: { created_at: 'DESC' } }),
      this.orderRepo.findOne({ where: { tenant_id: tenantId, channel: 'buyer_portal' }, order: { created_at: 'DESC' } }),
    ]);

    const loginRows = await this.userRepo.find({
      where: { tenant_id: tenantId },
      select: ['id', 'email', 'name', 'last_login_at', 'created_at'],
      order: { last_login_at: 'DESC' },
      take: 5,
    });

    const origin = (process.env.PUBLIC_WEB_ORIGIN || 'https://smebuze.com').replace(/\/$/, '');
    const settings = tenant.settings ?? {};
    const businessType = typeof settings.business_type === 'string' ? settings.business_type : '';

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        is_active: tenant.is_active,
        subscription_ends_at: tenant.subscription_ends_at,
        business_type: businessType,
        enabled_modules: Array.isArray(settings.enabled_modules) ? settings.enabled_modules : [],
        features: tenant.features ?? [],
        created_at: tenant.created_at,
      },
      counts: {
        users,
        companies,
        customers,
        items,
        invoices,
        portal_orders: portalOrders,
        leads,
      },
      storefront: site
        ? {
            slug: site.slug,
            is_published: site.is_published,
            shop_enabled: site.shop_enabled,
            shop_url: `${origin}/shop/${site.slug}`,
            site_url: `${origin}/site/${site.slug}`,
          }
        : null,
      activity: {
        last_invoice_at: lastInvoice?.created_at ?? null,
        last_portal_order_at: lastOrder?.created_at ?? null,
        recent_logins: loginRows.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          last_login_at: u.last_login_at,
        })),
      },
    };
  }
}
