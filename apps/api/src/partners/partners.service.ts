import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { TenantContext } from '../common/tenant-context';
import { Tenant } from '../tenant/entities/tenant.entity';
import { User } from '../auth/entities/user.entity';
import { PlatformPartner } from './entities/platform-partner.entity';
import { PlatformCommission } from './entities/platform-commission.entity';
import { BdeLead } from './entities/bde-lead.entity';
import {
  CreateBdeLeadDto,
  CreateBdeUserDto,
  CreatePartnerDto,
  UpdateBdeLeadDto,
  UpdateCommissionStatusDto,
  UpdatePartnerDto,
} from './dto/partners.dto';

const FRONTEND = () =>
  (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3001').replace(/\/$/, '');

function normalizeCode(code: string): string {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 40);
}

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(PlatformPartner)
    private readonly partnerRepo: Repository<PlatformPartner>,
    @InjectRepository(PlatformCommission)
    private readonly commissionRepo: Repository<PlatformCommission>,
    @InjectRepository(BdeLead)
    private readonly leadRepo: Repository<BdeLead>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private assertSuperAdmin(ctx: TenantContext) {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Platform admin only');
  }

  private assertBdeOrAdmin(ctx: TenantContext) {
    if (ctx.isSuperAdmin) return;
    if (ctx.platformRole === 'bde' || ctx.permissions.includes('admin.bde.leads') || ctx.permissions.includes('*')) {
      return;
    }
    throw new ForbiddenException('BDE access required');
  }

  private assertPartnerOrAdmin(ctx: TenantContext) {
    if (ctx.isSuperAdmin) return;
    if (
      ctx.platformRole === 'partner' ||
      ctx.permissions.includes('admin.partner.mine') ||
      ctx.permissions.includes('admin.partner.manage') ||
      ctx.permissions.includes('*')
    ) {
      return;
    }
    throw new ForbiddenException('Partner access required');
  }

  async findActivePartnerByCode(code?: string | null): Promise<PlatformPartner | null> {
    const normalized = normalizeCode(code || '');
    if (!normalized) return null;
    return this.partnerRepo.findOne({
      where: { code: normalized, status: 'active' },
    });
  }

  /** Called from signup — attach referral on tenant. */
  async attributeSignup(tenantId: string, code?: string | null): Promise<void> {
    const partner = await this.findActivePartnerByCode(code);
    if (!partner) return;
    await this.tenantRepo.update(tenantId, {
      referred_by_partner_id: partner.id,
      referral_code: partner.code,
    });
  }

  /** Called when a subscription payment succeeds. Idempotent per payment. */
  async recordCommissionForPayment(opts: {
    tenantId: string;
    paymentId: string;
    amountPaise: number;
  }): Promise<PlatformCommission | null> {
    const tenant = await this.tenantRepo.findOne({ where: { id: opts.tenantId } });
    if (!tenant?.referred_by_partner_id) return null;

    const existing = await this.commissionRepo.findOne({ where: { payment_id: opts.paymentId } });
    if (existing) return existing;

    const partner = await this.partnerRepo.findOne({ where: { id: tenant.referred_by_partner_id } });
    if (!partner || partner.status !== 'active') return null;

    const pct = Number(partner.commission_percent) || 0;
    const commissionPaise = Math.round((opts.amountPaise * pct) / 100);
    if (commissionPaise <= 0) return null;

    return this.commissionRepo.save(
      this.commissionRepo.create({
        partner_id: partner.id,
        tenant_id: tenant.id,
        payment_id: opts.paymentId,
        amount_paise: opts.amountPaise,
        commission_paise: commissionPaise,
        status: 'pending',
        notes: `${pct}% of ₹${(opts.amountPaise / 100).toFixed(0)} for ${tenant.slug}`,
      }),
    );
  }

  // ── Partners (agency) ──────────────────────────────────────────────

  async listPartners(ctx: TenantContext) {
    this.assertSuperAdmin(ctx);
    const rows = await this.partnerRepo.find({ order: { created_at: 'DESC' } });
    const frontend = FRONTEND();
    return rows.map((p) => ({
      ...p,
      commission_percent: Number(p.commission_percent),
      referral_link: `${frontend}/signup?ref=${encodeURIComponent(p.code)}`,
      coupon_code: p.code,
    }));
  }

  async createPartner(ctx: TenantContext, dto: CreatePartnerDto) {
    this.assertSuperAdmin(ctx);
    const code = normalizeCode(dto.code);
    if (code.length < 3) throw new BadRequestException('Referral code must be at least 3 characters');
    const clash = await this.partnerRepo.findOne({ where: { code: ILike(code) } });
    if (clash) throw new BadRequestException('That referral / coupon code is already in use');

    let userId: string | null = null;
    if (dto.login_email && dto.login_password) {
      const email = dto.login_email.trim().toLowerCase();
      const exists = await this.userRepo.findOne({ where: { email, tenant_id: IsNull() } });
      if (exists) throw new BadRequestException('Login email already exists on the platform');
      const password_hash = await bcrypt.hash(dto.login_password, 10);
      const user = await this.userRepo.save(
        this.userRepo.create({
          email,
          password_hash,
          name: dto.contact_name || dto.name,
          phone: dto.contact_phone || null,
          tenant_id: null,
          is_super_admin: false,
          platform_role: 'partner',
          email_verified: true,
          is_active: true,
        }),
      );
      userId = user.id;
    }

    const partner = await this.partnerRepo.save(
      this.partnerRepo.create({
        name: dto.name.trim(),
        code,
        contact_name: dto.contact_name?.trim() || null,
        contact_email: dto.contact_email?.trim().toLowerCase() || null,
        contact_phone: dto.contact_phone?.trim() || null,
        commission_percent: dto.commission_percent ?? 20,
        status: 'active',
        user_id: userId,
        notes: dto.notes?.trim() || null,
      }),
    );

    const frontend = FRONTEND();
    return {
      ...partner,
      commission_percent: Number(partner.commission_percent),
      referral_link: `${frontend}/signup?ref=${encodeURIComponent(partner.code)}`,
      coupon_code: partner.code,
    };
  }

  async updatePartner(ctx: TenantContext, id: string, dto: UpdatePartnerDto) {
    this.assertSuperAdmin(ctx);
    const partner = await this.partnerRepo.findOne({ where: { id } });
    if (!partner) throw new NotFoundException('Partner not found');
    if (dto.name !== undefined) partner.name = dto.name.trim();
    if (dto.contact_name !== undefined) partner.contact_name = dto.contact_name?.trim() || null;
    if (dto.contact_email !== undefined) partner.contact_email = dto.contact_email?.trim().toLowerCase() || null;
    if (dto.contact_phone !== undefined) partner.contact_phone = dto.contact_phone?.trim() || null;
    if (dto.commission_percent !== undefined) partner.commission_percent = dto.commission_percent;
    if (dto.status !== undefined) partner.status = dto.status;
    if (dto.notes !== undefined) partner.notes = dto.notes?.trim() || null;
    await this.partnerRepo.save(partner);
    return { ...partner, commission_percent: Number(partner.commission_percent) };
  }

  async listCommissions(ctx: TenantContext, partnerId?: string) {
    this.assertPartnerOrAdmin(ctx);
    let filterPartnerId = partnerId;
    if (!ctx.isSuperAdmin) {
      const mine = await this.partnerRepo.findOne({ where: { user_id: ctx.userId } });
      if (!mine) throw new ForbiddenException('No partner profile linked to this login');
      filterPartnerId = mine.id;
    }
    const where = filterPartnerId ? { partner_id: filterPartnerId } : {};
    const rows = await this.commissionRepo.find({ where, order: { created_at: 'DESC' }, take: 200 });
    const tenantIds = [...new Set(rows.map((r) => r.tenant_id))];
    const tenants =
      tenantIds.length > 0
        ? await this.tenantRepo.find({
            where: { id: In(tenantIds) },
            select: ['id', 'name', 'slug', 'plan'],
          })
        : [];
    const byId = Object.fromEntries(tenants.map((t) => [t.id, t]));
    return rows.map((r) => ({
      ...r,
      tenant: byId[r.tenant_id] || null,
      amount_rupees: r.amount_paise / 100,
      commission_rupees: r.commission_paise / 100,
    }));
  }

  async updateCommissionStatus(ctx: TenantContext, id: string, dto: UpdateCommissionStatusDto) {
    this.assertSuperAdmin(ctx);
    const row = await this.commissionRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Commission not found');
    row.status = dto.status;
    await this.commissionRepo.save(row);
    return row;
  }

  async partnerDashboard(ctx: TenantContext) {
    this.assertPartnerOrAdmin(ctx);
    let partner: PlatformPartner | null = null;
    if (ctx.isSuperAdmin) {
      const first = await this.partnerRepo.find({ order: { created_at: 'DESC' }, take: 1 });
      partner = first[0] || null;
      if (!partner) {
        return {
          partner: null,
          referred_tenants: [],
          commissions: [],
          totals: { pending_rupees: 0, approved_rupees: 0, paid_rupees: 0 },
          message: 'No partners yet. Create one under Partners & coupons.',
        };
      }
    } else {
      partner = await this.partnerRepo.findOne({ where: { user_id: ctx.userId } });
      if (!partner) throw new NotFoundException('Partner profile not found');
    }
    const commissions = await this.listCommissions(ctx, partner.id);
    const referred = await this.tenantRepo.find({
      where: { referred_by_partner_id: partner.id },
      select: ['id', 'name', 'slug', 'plan', 'subscription_ends_at', 'created_at', 'is_active'],
      order: { created_at: 'DESC' },
      take: 100,
    });
    const pending = commissions.filter((c) => c.status === 'pending').reduce((s, c) => s + c.commission_paise, 0);
    const approved = commissions.filter((c) => c.status === 'approved').reduce((s, c) => s + c.commission_paise, 0);
    const paid = commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + c.commission_paise, 0);
    const frontend = FRONTEND();
    return {
      partner: {
        ...partner,
        commission_percent: Number(partner.commission_percent),
        referral_link: `${frontend}/signup?ref=${encodeURIComponent(partner.code)}`,
        coupon_code: partner.code,
      },
      referred_tenants: referred,
      commissions,
      totals: {
        pending_rupees: pending / 100,
        approved_rupees: approved / 100,
        paid_rupees: paid / 100,
      },
    };
  }

  // ── BDE ────────────────────────────────────────────────────────────

  async createBdeUser(ctx: TenantContext, dto: CreateBdeUserDto) {
    this.assertSuperAdmin(ctx);
    const email = dto.email.trim().toLowerCase();
    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) throw new BadRequestException('Email already registered');
    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.save(
      this.userRepo.create({
        email,
        password_hash,
        name: dto.name?.trim() || email.split('@')[0],
        phone: dto.phone?.trim() || null,
        tenant_id: null,
        is_super_admin: false,
        platform_role: 'bde',
        email_verified: true,
        is_active: true,
      }),
    );
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      platform_role: user.platform_role,
    };
  }

  async listBdeUsers(ctx: TenantContext) {
    this.assertSuperAdmin(ctx);
    const users = await this.userRepo.find({
      where: { platform_role: 'bde', tenant_id: IsNull() },
      select: ['id', 'email', 'name', 'phone', 'is_active', 'created_at', 'last_login_at'],
      order: { created_at: 'DESC' },
    });
    return users;
  }

  async listLeads(ctx: TenantContext) {
    this.assertBdeOrAdmin(ctx);
    const where = ctx.isSuperAdmin ? {} : { owner_user_id: ctx.userId };
    const leads = await this.leadRepo.find({ where, order: { updated_at: 'DESC' }, take: 500 });
    const ownerIds = [...new Set(leads.map((l) => l.owner_user_id))];
    const owners =
      ownerIds.length > 0
        ? await this.userRepo.find({
            where: { id: In(ownerIds) },
            select: ['id', 'email', 'name'],
          })
        : [];
    const byOwner = Object.fromEntries(owners.map((u) => [u.id, u]));
    return leads.map((l) => ({
      ...l,
      owner: byOwner[l.owner_user_id] || null,
    }));
  }

  async createLead(ctx: TenantContext, dto: CreateBdeLeadDto) {
    this.assertBdeOrAdmin(ctx);
    const ownerId = ctx.isSuperAdmin && ctx.platformRole !== 'bde' ? ctx.userId : ctx.userId;
    return this.leadRepo.save(
      this.leadRepo.create({
        owner_user_id: ownerId,
        company_name: dto.company_name.trim(),
        contact_name: dto.contact_name?.trim() || null,
        contact_email: dto.contact_email?.trim().toLowerCase() || null,
        contact_phone: dto.contact_phone?.trim() || null,
        status: dto.status || 'new',
        estimated_price_rupees: dto.estimated_price_rupees ?? null,
        plan: dto.plan || 'basic',
        billing_interval: dto.billing_interval || 'quarterly',
        notes: dto.notes?.trim() || null,
        source: dto.source || 'outbound',
      }),
    );
  }

  async updateLead(ctx: TenantContext, id: string, dto: UpdateBdeLeadDto) {
    this.assertBdeOrAdmin(ctx);
    const lead = await this.leadRepo.findOne({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (!ctx.isSuperAdmin && lead.owner_user_id !== ctx.userId) {
      throw new ForbiddenException('You can only edit your own leads');
    }
    if (dto.company_name !== undefined) lead.company_name = dto.company_name.trim();
    if (dto.contact_name !== undefined) lead.contact_name = dto.contact_name?.trim() || null;
    if (dto.contact_email !== undefined) lead.contact_email = dto.contact_email?.trim().toLowerCase() || null;
    if (dto.contact_phone !== undefined) lead.contact_phone = dto.contact_phone?.trim() || null;
    if (dto.status !== undefined) lead.status = dto.status;
    if (dto.estimated_price_rupees !== undefined) lead.estimated_price_rupees = dto.estimated_price_rupees;
    if (dto.plan !== undefined) lead.plan = dto.plan;
    if (dto.billing_interval !== undefined) lead.billing_interval = dto.billing_interval;
    if (dto.notes !== undefined) lead.notes = dto.notes?.trim() || null;
    if (dto.source !== undefined) lead.source = dto.source;
    if (dto.converted_tenant_id !== undefined) lead.converted_tenant_id = dto.converted_tenant_id;
    await this.leadRepo.save(lead);
    return lead;
  }
}
