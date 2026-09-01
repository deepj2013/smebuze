import { HttpException, HttpStatus, Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Company } from '../tenant/entities/company.entity';
import { Department } from '../tenant/entities/department.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { UserRole } from './entities/user-role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PendingInvite } from './entities/pending-invite.entity';
import { EmailOtp } from './entities/email-otp.entity';
import { TenantContext } from '../common/tenant-context';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SignupDto } from './dto/signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto, ResetPasswordOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { GoogleCompleteDto } from './dto/google-complete.dto';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { Customer } from '../crm/entities/customer.entity';
import { Warehouse } from '../inventory/entities/warehouse.entity';
import { isPosBusinessType } from '../common/tenant-client-types';
import { tenantSessionFrom, TenantSession } from '../common/tenant-session';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
  roleIds: string[];
  permissions: string[];
}

const PLATFORM_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

const PLAN_FEATURES: Record<string, string[]> = {
  basic: ['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports'],
  advanced: ['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports', 'bulk_upload'],
  enterprise: ['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports', 'bulk_upload', 'audit'],
  ai_pro: ['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports', 'bulk_upload', 'audit', 'ai', 'whatsapp'],
};

const TENANT_ADMIN_PERMISSION_KEYS = [
  'org.company.create', 'org.company.view', 'org.company.update',
  'org.branch.create', 'org.branch.view', 'org.branch.update',
  'org.user.create', 'org.user.view', 'org.role.manage',
  'crm.lead.create', 'crm.lead.view', 'crm.lead.update',
  'crm.customer.create', 'crm.customer.view', 'crm.customer.update',
  'sales.quotation.create', 'sales.quotation.view', 'sales.order.create', 'sales.order.view',
  'sales.invoice.create', 'sales.invoice.view',
  'purchase.vendor.create', 'purchase.vendor.view', 'purchase.order.create', 'purchase.order.view',
  'inventory.item.create', 'inventory.item.view', 'inventory.stock.view',
  'accounting.coa.view', 'accounting.journal.create', 'accounting.journal.view',
  'reports.view',
];

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetRepo: Repository<PasswordResetToken>,
    @InjectRepository(PendingInvite)
    private readonly pendingInviteRepo: Repository<PendingInvite>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(EmailOtp)
    private readonly otpRepo: Repository<EmailOtp>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto): Promise<
    | { access_token: string; user: TenantContext; tenant?: TenantSession }
    | { workspaces: Array<{ slug: string; name: string; tenantId: string | null; isSuperAdmin: boolean }> }
  > {
    const email = dto.email.trim();
    const candidates = dto.platformAdmin
      ? await this.findUsersByEmail(email, undefined, true)
      : await this.findUsersByEmail(email, dto.tenantSlug);

    const matched: User[] = [];
    for (const candidate of candidates) {
      if (!candidate.password_hash) continue;
      if (await bcrypt.compare(dto.password, candidate.password_hash)) matched.push(candidate);
    }

    if (matched.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const usable: User[] = [];
    for (const user of matched) {
      if (user.is_super_admin && !user.tenant_id) {
        usable.push(user);
        continue;
      }
      const tenant = user.tenant ?? (user.tenant_id ? await this.tenantRepo.findOne({ where: { id: user.tenant_id } }) : null);
      if (tenant?.is_active) usable.push(user);
    }
    if (usable.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (usable.length > 1 && !dto.tenantSlug?.trim() && !dto.platformAdmin) {
      return { workspaces: await this.workspacesFromUsers(usable) };
    }

    return this.completeLogin(usable[0]);
  }

  googleConfigured(): boolean {
    return Boolean(
      (process.env.GOOGLE_CLIENT_ID || '').trim() && (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    );
  }

  googleStatus() {
    return { enabled: this.googleConfigured() };
  }

  private googleRedirectUri(): string {
    const base = (process.env.API_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
    return `${base}/api/v1/auth/google/callback`;
  }

  private frontendAuthUrl(query: Record<string, string>, hash?: Record<string, unknown>): string {
    const base = (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3001').replace(/\/$/, '');
    const qs = new URLSearchParams(query).toString();
    const url = `${base}/login${qs ? `?${qs}` : ''}`;
    if (!hash) return url;
    return `${url}#g=${encodeURIComponent(JSON.stringify(hash))}`;
  }

  googleAuthUrl(): string {
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const state = this.jwtService.sign({ purpose: 'google_oauth' }, { expiresIn: '10m' });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.googleRedirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(code: string | undefined, state: string | undefined, googleError?: string): Promise<string> {
    if (googleError) return this.frontendAuthUrl({ error: googleError === 'access_denied' ? 'google_denied' : 'google_failed' });
    if (!this.googleConfigured()) return this.frontendAuthUrl({ error: 'google_off' });
    if (!code || !state) return this.frontendAuthUrl({ error: 'google_failed' });
    try {
      const st = this.jwtService.verify(state) as { purpose?: string };
      if (st.purpose !== 'google_oauth') return this.frontendAuthUrl({ error: 'google_failed' });
    } catch {
      return this.frontendAuthUrl({ error: 'google_failed' });
    }
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: (process.env.GOOGLE_CLIENT_ID || '').trim(),
          client_secret: (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
          redirect_uri: this.googleRedirectUri(),
          grant_type: 'authorization_code',
        }),
      });
      const tokenJson = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error?: string };
      if (!tokenRes.ok || !tokenJson.access_token) {
        return this.frontendAuthUrl({ error: 'google_failed' });
      }
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      const profile = (await profileRes.json().catch(() => ({}))) as {
        email?: string;
        email_verified?: boolean | string;
        name?: string;
      };
      const email = String(profile.email || '').trim();
      const verified = profile.email_verified === true || profile.email_verified === 'true';
      if (!email || !verified) return this.frontendAuthUrl({ error: 'google_failed' });

      const candidates = await this.findUsersByEmail(email);
      const usable: User[] = [];
      for (const user of candidates) {
        if (user.is_super_admin && !user.tenant_id) {
          usable.push(user);
          continue;
        }
        const tenant = user.tenant ?? (user.tenant_id ? await this.tenantRepo.findOne({ where: { id: user.tenant_id } }) : null);
        if (tenant?.is_active) usable.push(user);
      }
      if (usable.length === 0) {
        return this.frontendAuthUrl({ error: 'no_account', email });
      }

      const displayName = String(profile.name || '').trim();
      for (const user of usable) {
        const patch: { email_verified: boolean; name?: string } = { email_verified: true };
        if (displayName && !user.name) patch.name = displayName;
        await this.userRepo.update(user.id, patch);
        user.email_verified = true;
        if (displayName && !user.name) user.name = displayName;
      }

      if (usable.length > 1) {
        const ticket = this.jwtService.sign({ purpose: 'google_login', email }, { expiresIn: '10m' });
        return this.frontendAuthUrl({ google_ticket: ticket });
      }
      const session = await this.completeLogin(usable[0]);
      return this.frontendAuthUrl({}, session);
    } catch {
      return this.frontendAuthUrl({ error: 'google_failed' });
    }
  }

  async completeGoogleLogin(dto: GoogleCompleteDto) {
    let payload: { purpose?: string; email?: string };
    try {
      payload = this.jwtService.verify(dto.ticket);
    } catch {
      throw new UnauthorizedException('Google sign-in expired. Try again.');
    }
    if (payload.purpose !== 'google_login' || !payload.email) {
      throw new UnauthorizedException('Google sign-in expired. Try again.');
    }
    const candidates = dto.platformAdmin
      ? await this.findUsersByEmail(payload.email, undefined, true)
      : await this.findUsersByEmail(payload.email, dto.tenantSlug);
    const usable: User[] = [];
    for (const user of candidates) {
      if (user.is_super_admin && !user.tenant_id) {
        usable.push(user);
        continue;
      }
      const tenant = user.tenant ?? (user.tenant_id ? await this.tenantRepo.findOne({ where: { id: user.tenant_id } }) : null);
      if (tenant?.is_active) usable.push(user);
    }
    if (usable.length === 0) throw new UnauthorizedException('No workspace for this Google account.');
    if (usable.length > 1 && !dto.tenantSlug?.trim() && !dto.platformAdmin) {
      return { workspaces: await this.workspacesFromUsers(usable) };
    }
    return this.completeLogin(usable[0]);
  }

  async register(dto: RegisterDto): Promise<{ access_token: string; user: TenantContext }> {
    const tenant = await this.tenantRepo.findOne({
      where: { slug: dto.tenantSlug, is_active: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const existing = await this.userRepo.findOne({
      where: { email: dto.email, tenant_id: tenant.id },
    });
    if (existing) throw new ConflictException('User already exists for this tenant');

    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      password_hash,
      name: dto.name ?? null,
      phone: dto.phone ?? null,
      tenant_id: tenant.id,
      is_super_admin: false,
    });
    await this.userRepo.save(user);

    const defaultRole = await this.roleRepo.findOne({
      where: { tenant_id: tenant.id, slug: 'staff' },
    });
    if (defaultRole) {
      await this.userRoleRepo.save(
        this.userRoleRepo.create({ user_id: user.id, role_id: defaultRole.id }),
      );
    }

    const context = await this.buildContext(user);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      isSuperAdmin: false,
      roleIds: context.roleIds,
      permissions: context.permissions,
    };

    const access_token = this.jwtService.sign(payload);
    return { access_token, user: context };
  }

  async signup(dto: SignupDto): Promise<{
    access_token: string;
    user: TenantContext;
    email_verified: boolean;
    mailSent: boolean;
    tenant: { id: string; slug: string; plan: string; subscription_ends_at: string | null };
  }> {
    const slug = dto.slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (slug.length < 2) throw new BadRequestException('Slug must be at least 2 characters');

    const existing = await this.tenantRepo.findOne({
      where: { platform_org_id: PLATFORM_ORG_ID as unknown as string, slug },
    });
    if (existing) throw new ConflictException('Organization slug already taken');

    const features = PLAN_FEATURES[dto.plan] ?? PLAN_FEATURES.basic;
    const now = new Date();
    let subscriptionEndsAt: Date;
    if (dto.trial === 'true' || dto.trial === '1') {
      subscriptionEndsAt = new Date(now);
      subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 7);
    } else {
      if (dto.interval === 'yearly') {
        subscriptionEndsAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      } else if (dto.interval === 'quarterly') {
        subscriptionEndsAt = new Date(now);
        subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 3);
      } else {
        subscriptionEndsAt = new Date(now);
        subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
      }
    }

    const businessType = dto.businessType || 'trading';
    const tenant = this.tenantRepo.create({
      platform_org_id: PLATFORM_ORG_ID as unknown as string,
      name: dto.orgName,
      slug,
      plan: dto.plan,
      features,
      settings: {
        business_type: businessType,
        billing: {
          interval: dto.interval || 'monthly',
          trial: dto.trial === 'true' || dto.trial === '1',
        },
      },
      subscription_ends_at: subscriptionEndsAt,
      is_active: true,
    });
    await this.tenantRepo.save(tenant);

    const company = this.companyRepo.create({
      tenant_id: tenant.id,
      name: dto.orgName + ' (Default)',
      is_default: true,
    });
    await this.companyRepo.save(company);

    if (isPosBusinessType(businessType)) {
      await this.customerRepo.save(
        this.customerRepo.create({
          tenant_id: tenant.id,
          company_id: company.id,
          name: 'Walk-in / Counter',
          entity_type: 'individual',
          tags: ['walk_in'],
          segment: 'counter',
        }),
      );
      await this.warehouseRepo.save(
        this.warehouseRepo.create({
          tenant_id: tenant.id,
          company_id: company.id,
          name: 'Shop counter',
          code: 'COUNTER',
          is_default: true,
        }),
      );
    }

    const tenantAdminRoleId = await this.createDefaultRolesForTenant(tenant.id);

    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      password_hash,
      name: dto.name ?? dto.orgName,
      phone: dto.phone ?? null,
      tenant_id: tenant.id,
      default_company_id: company.id,
      is_super_admin: false,
      email_verified: false,
    });
    await this.userRepo.save(user);

    await this.userRoleRepo.save(
      this.userRoleRepo.create({ user_id: user.id, role_id: tenantAdminRoleId }),
    );

    const userWithRelations = await this.userRepo.findOne({
      where: { id: user.id },
      relations: ['defaultCompany', 'defaultBranch'],
    });
    if (!userWithRelations) throw new BadRequestException('User creation failed');
    const context = await this.buildContext(userWithRelations);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      isSuperAdmin: false,
      roleIds: context.roleIds,
      permissions: context.permissions,
    };
    const access_token = this.jwtService.sign(payload);
    const otp = await this.issueOtp(user.id, 'verify_email');
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3001';
    const verifyUrl = `${baseUrl}/verify-email?email=${encodeURIComponent(user.email)}&slug=${encodeURIComponent(tenant.slug)}`;
    const mail = await this.mailService.sendWelcomeVerify(user.email, user.name || dto.orgName, otp, verifyUrl);
    return {
      access_token,
      user: { ...context, email_verified: false },
      email_verified: false,
      mailSent: mail.sent,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        plan: tenant.plan,
        subscription_ends_at: tenant.subscription_ends_at?.toISOString() ?? null,
      },
    };
  }

  private async createDefaultRolesForTenant(tenantId: string): Promise<string> {
    const roles = [
      { name: 'Tenant Admin', slug: 'tenant_admin', keys: TENANT_ADMIN_PERMISSION_KEYS },
      { name: 'Sales Manager', slug: 'sales_manager', keys: ['crm.lead.create', 'crm.lead.view', 'crm.lead.update', 'crm.customer.create', 'crm.customer.view', 'crm.customer.update', 'sales.quotation.create', 'sales.quotation.view', 'sales.order.create', 'sales.order.view', 'sales.invoice.create', 'sales.invoice.view', 'reports.view'] },
      { name: 'Purchase Manager', slug: 'purchase_manager', keys: ['purchase.vendor.create', 'purchase.vendor.view', 'purchase.order.create', 'purchase.order.view', 'reports.view'] },
      { name: 'Staff', slug: 'staff', keys: ['crm.customer.view', 'sales.invoice.create', 'sales.invoice.view', 'purchase.vendor.view', 'purchase.order.view', 'inventory.item.view', 'inventory.stock.view', 'reports.view'] },
      { name: 'Viewer', slug: 'viewer', keys: ['org.company.view', 'org.branch.view', 'org.user.view', 'crm.lead.view', 'crm.customer.view', 'sales.quotation.view', 'sales.order.view', 'sales.invoice.view', 'purchase.vendor.view', 'purchase.order.view', 'inventory.item.view', 'inventory.stock.view', 'accounting.coa.view', 'accounting.journal.view', 'reports.view'] },
    ];
    let tenantAdminRoleId = '';
    const perms = await this.permissionRepo.find({ where: {} });
    const keyToId = new Map(perms.map((p) => [p.key, p.id]));
    for (const r of roles) {
      const role = this.roleRepo.create({ tenant_id: tenantId, name: r.name, slug: r.slug, is_system: false });
      await this.roleRepo.save(role);
      if (r.slug === 'tenant_admin') tenantAdminRoleId = role.id;
      for (const key of r.keys) {
        const pid = keyToId.get(key);
        if (pid) await this.rolePermissionRepo.save(this.rolePermissionRepo.create({ role_id: role.id, permission_id: pid }));
      }
    }
    return tenantAdminRoleId;
  }

  async validatePayload(payload: JwtPayload): Promise<TenantContext> {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, is_active: true },
      relations: ['defaultCompany', 'defaultBranch'],
    });
    if (!user) throw new UnauthorizedException('User not found or inactive');

    let allowed_modules: string[] | undefined;
    if (user.department_id) {
      const dept = await this.departmentRepo.findOne({ where: { id: user.department_id } });
      if (dept?.allowed_modules?.length) allowed_modules = dept.allowed_modules;
    }

    return {
      tenantId: user.tenant_id,
      userId: user.id,
      email: user.email,
      name: user.name ?? undefined,
      isSuperAdmin: user.is_super_admin,
      roleIds: payload.roleIds ?? [],
      permissions: payload.permissions ?? [],
      companyId: user.default_company_id ?? undefined,
      branchId: user.default_branch_id ?? undefined,
      allowed_modules,
      email_verified: user.email_verified !== false,
    };
  }

  async getMe(ctx: TenantContext): Promise<{ user: TenantContext; tenant?: TenantSession }> {
    const user = await this.userRepo.findOne({
      where: { id: ctx.userId, is_active: true },
    });
    if (!user) throw new UnauthorizedException('User not found or inactive');
    let allowed_modules = ctx.allowed_modules;
    if (user.department_id && !allowed_modules) {
      const dept = await this.departmentRepo.findOne({ where: { id: user.department_id } });
      if (dept?.allowed_modules?.length) allowed_modules = dept.allowed_modules;
    }
    let tenant: TenantSession | undefined;
    if (ctx.tenantId) {
      const t = await this.tenantRepo.findOne({
        where: { id: ctx.tenantId },
        select: ['id', 'slug', 'settings', 'plan', 'subscription_ends_at'],
      });
      if (t) tenant = tenantSessionFrom(t);
    }
    return {
      user: {
        ...ctx,
        name: user.name ?? ctx.email,
        allowed_modules,
        email_verified: user.email_verified !== false,
      },
      ...(tenant && { tenant }),
    };
  }

  private async buildContext(user: User): Promise<TenantContext> {
    const roleIds: string[] = [];
    const permissionKeys = new Set<string>();

    if (user.is_super_admin) {
      permissionKeys.add('*');
    } else {
      const userRoles = await this.userRoleRepo.find({
        where: { user_id: user.id },
        select: ['role_id'],
      });
      userRoles.forEach((ur) => roleIds.push(ur.role_id));
      if (roleIds.length > 0) {
        const rolePerms = await this.rolePermissionRepo.find({
          where: { role_id: In(roleIds) },
          relations: ['permission'],
        });
        rolePerms.forEach((rp) => {
          const perm = (rp as RolePermission & { permission?: { key: string } }).permission;
          if (perm?.key) permissionKeys.add(perm.key);
        });
      }
    }

    return {
      tenantId: user.tenant_id,
      userId: user.id,
      email: user.email,
      isSuperAdmin: user.is_super_admin,
      roleIds,
      permissions: Array.from(permissionKeys),
      companyId: user.default_company_id ?? undefined,
      branchId: user.default_branch_id ?? undefined,
      email_verified: user.email_verified !== false,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; resetLink?: string }> {
    const users = await this.findUsersByEmail(dto.email, dto.tenantSlug);
    if (users.length === 0) {
      return { message: 'If an account exists with this email, you will receive a reset code.' };
    }
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3001';
    let devLink: string | undefined;
    for (const user of users) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      await this.passwordResetRepo.save(
        this.passwordResetRepo.create({
          user_id: user.id,
          token,
          expires_at: expiresAt,
        }),
      );
      const otp = await this.issueOtp(user.id, 'reset_password');
      const resetLink = `${baseUrl}/reset-password?token=${token}`;
      const result = await this.mailService.sendPasswordReset(
        user.email,
        user.name || 'there',
        otp,
        resetLink,
      );
      if (!result.sent && process.env.NODE_ENV !== 'production' && result.devLink) {
        devLink = result.devLink;
      }
    }
    if (devLink) {
      return { message: 'If an account exists with this email, you will receive a reset code.', resetLink: devLink };
    }
    return { message: 'If an account exists with this email, you will receive a reset code.' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const record = await this.passwordResetRepo.findOne({
      where: { token: dto.token },
      relations: ['user'],
    });
    if (!record || record.used_at) throw new BadRequestException('Invalid or expired reset link');
    if (new Date() > record.expires_at) throw new BadRequestException('Reset link has expired');
    const password_hash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(record.user_id, { password_hash, email_verified: true });
    await this.passwordResetRepo.update(record.id, { used_at: new Date() });
    return { message: 'Password updated. You can now sign in.' };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{
    message: string;
    access_token?: string;
    user?: TenantContext;
    tenant?: TenantSession;
  }> {
    const purpose = dto.purpose || 'verify_email';
    const user = await this.findUserForEmailOrOtp(dto.email, dto.tenantSlug, purpose, dto.otp);
    if (purpose === 'verify_email') {
      await this.userRepo.update(user.id, { email_verified: true });
      const fresh = await this.userRepo.findOne({ where: { id: user.id }, relations: ['defaultCompany', 'defaultBranch'] });
      if (!fresh) throw new BadRequestException('User not found');
      const context = await this.buildContext(fresh);
      const payload: JwtPayload = {
        sub: fresh.id,
        email: fresh.email,
        tenantId: fresh.tenant_id,
        isSuperAdmin: fresh.is_super_admin,
        roleIds: context.roleIds,
        permissions: context.permissions,
      };
      let tenant: TenantSession | undefined;
      if (fresh.tenant_id) {
        const t = await this.tenantRepo.findOne({
          where: { id: fresh.tenant_id },
          select: ['id', 'slug', 'settings', 'plan', 'subscription_ends_at'],
        });
        if (t) tenant = tenantSessionFrom(t);
      }
      return {
        message: 'Email confirmed.',
        access_token: this.jwtService.sign(payload),
        user: { ...context, email_verified: true },
        ...(tenant && { tenant }),
      };
    }
    return { message: 'Code confirmed.' };
  }

  async resendOtp(dto: ResendOtpDto): Promise<{ message: string }> {
    const purpose = dto.purpose || 'verify_email';
    const users = await this.findUsersByEmail(dto.email, dto.tenantSlug);
    if (users.length === 0) return { message: 'If an account exists, a new code has been sent.' };
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3001';
    for (const user of users) {
      const otp = await this.issueOtp(user.id, purpose);
      if (purpose === 'reset_password') {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        await this.passwordResetRepo.save(this.passwordResetRepo.create({ user_id: user.id, token, expires_at: expiresAt }));
        await this.mailService.sendPasswordReset(user.email, user.name || 'there', otp, `${baseUrl}/reset-password?token=${token}`);
      } else {
        await this.mailService.sendOtp(
          user.email,
          user.name || 'there',
          otp,
          'Enter this code to confirm your SMEBUZE email and open your workspace.',
        );
      }
    }
    return { message: 'If an account exists, a new code has been sent.' };
  }

  async resetPasswordWithOtp(dto: ResetPasswordOtpDto): Promise<{ message: string }> {
    const user = await this.findUserForEmailOrOtp(dto.email, dto.tenantSlug, 'reset_password', dto.otp);
    const password_hash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(user.id, { password_hash, email_verified: true });
    return { message: 'Password updated. You can now sign in.' };
  }

  private async completeLogin(user: User): Promise<{
    access_token: string;
    user: TenantContext;
    tenant?: TenantSession;
  }> {
    if (user.tenant_id) {
      const tenant = user.tenant ?? (await this.tenantRepo.findOne({ where: { id: user.tenant_id } }));
      if (!tenant?.is_active) throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.is_super_admin && user.email_verified === false) {
      const tenant = user.tenant ?? (user.tenant_id ? await this.tenantRepo.findOne({ where: { id: user.tenant_id } }) : null);
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Confirm the 6-digit code we sent to your email before signing in.',
          email: user.email,
          tenantSlug: tenant?.slug ?? '',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    await this.userRepo.update(user.id, { last_login_at: new Date() });

    await this.auditService.log(
      { tenantId: user.tenant_id ?? null, userId: user.id },
      'login',
      'auth',
      user.id,
      { email: user.email },
    ).catch(() => {});

    const context = await this.buildContext(user);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      isSuperAdmin: user.is_super_admin,
      roleIds: context.roleIds,
      permissions: context.permissions,
    };

    let tenant: TenantSession | undefined;
    if (user.tenant_id) {
      const t = user.tenant ?? (await this.tenantRepo.findOne({
        where: { id: user.tenant_id },
        select: ['id', 'slug', 'settings', 'plan', 'subscription_ends_at'],
      }));
      if (t) tenant = tenantSessionFrom(t);
    }

    return { access_token: this.jwtService.sign(payload), user: context, ...(tenant && { tenant }) };
  }

  private async workspacesFromUsers(
    users: User[],
  ): Promise<Array<{ slug: string; name: string; tenantId: string | null; isSuperAdmin: boolean }>> {
    const workspaces: Array<{ slug: string; name: string; tenantId: string | null; isSuperAdmin: boolean }> = [];
    for (const user of users) {
      if (user.is_super_admin && !user.tenant_id) {
        workspaces.push({ slug: '', name: 'Platform admin', tenantId: null, isSuperAdmin: true });
        continue;
      }
      const tenant = user.tenant ?? (user.tenant_id ? await this.tenantRepo.findOne({ where: { id: user.tenant_id } }) : null);
      if (!tenant?.is_active) continue;
      workspaces.push({ slug: tenant.slug, name: tenant.name, tenantId: tenant.id, isSuperAdmin: false });
    }
    return workspaces;
  }

  private async findUsersByEmail(email: string, tenantSlug?: string, platformAdmin = false): Promise<User[]> {
    const normalized = email.trim();
    const relations = ['defaultCompany', 'defaultBranch', 'tenant'] as const;
    if (platformAdmin) {
      const user = await this.userRepo.findOne({
        where: { email: normalized, tenant_id: IsNull(), is_super_admin: true, is_active: true },
        relations: [...relations],
      });
      return user ? [user] : [];
    }
    if (tenantSlug?.trim()) {
      const tenant = await this.tenantRepo.findOne({ where: { slug: tenantSlug.trim(), is_active: true } });
      if (!tenant) return [];
      const user = await this.userRepo.findOne({
        where: { email: normalized, tenant_id: tenant.id, is_active: true },
        relations: [...relations],
      });
      return user ? [user] : [];
    }
    return this.userRepo.find({
      where: { email: normalized, is_active: true },
      relations: [...relations],
    });
  }

  /** When the same email exists in more than one workspace, match the OTP instead of asking for a slug. */
  private async findUserForEmailOrOtp(
    email: string,
    tenantSlug: string | undefined,
    purpose: string,
    code: string,
  ): Promise<User> {
    const users = await this.findUsersByEmail(email, tenantSlug);
    if (users.length === 0) throw new BadRequestException('Invalid code or email');
    if (users.length === 1) {
      await this.assertOtp(users[0].id, purpose, code);
      return users[0];
    }
    for (const user of users) {
      const row = await this.otpRepo.findOne({
        where: { user_id: user.id, purpose, used_at: IsNull() },
        order: { created_at: 'DESC' },
      });
      if (!row || new Date() > row.expires_at || row.attempts >= 5) continue;
      const ok = await bcrypt.compare(code, row.code_hash);
      if (!ok) continue;
      row.attempts += 1;
      row.used_at = new Date();
      await this.otpRepo.save(row);
      return user;
    }
    throw new BadRequestException('Invalid or expired code');
  }

  private sixDigit(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private async issueOtp(userId: string, purpose: string): Promise<string> {
    const open = await this.otpRepo.find({ where: { user_id: userId, purpose, used_at: IsNull() } });
    for (const row of open) {
      row.used_at = new Date();
      await this.otpRepo.save(row);
    }
    const code = this.sixDigit();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);
    await this.otpRepo.save(
      this.otpRepo.create({
        user_id: userId,
        purpose,
        code_hash: await bcrypt.hash(code, 8),
        expires_at: expires,
      }),
    );
    return code;
  }

  private async assertOtp(userId: string, purpose: string, code: string): Promise<void> {
    const row = await this.otpRepo.findOne({
      where: { user_id: userId, purpose, used_at: IsNull() },
      order: { created_at: 'DESC' },
    });
    if (!row) throw new BadRequestException('Invalid or expired code');
    if (new Date() > row.expires_at) throw new BadRequestException('This code has expired. Request a new one.');
    if (row.attempts >= 5) throw new BadRequestException('Too many attempts. Request a new code.');
    const ok = await bcrypt.compare(code, row.code_hash);
    row.attempts += 1;
    if (!ok) {
      await this.otpRepo.save(row);
      throw new BadRequestException('Invalid or expired code');
    }
    row.used_at = new Date();
    await this.otpRepo.save(row);
  }

  async acceptInvite(token: string, password: string, name?: string): Promise<{ access_token: string; user: TenantContext }> {
    const invite = await this.pendingInviteRepo.findOne({
      where: { token },
      relations: ['tenant', 'role'],
    });
    if (!invite) throw new BadRequestException('Invalid or expired invite link');
    if (invite.used_at) throw new BadRequestException('This invite has already been used');
    if (new Date() > invite.expires_at) throw new BadRequestException('Invite link has expired');

    const existing = await this.userRepo.findOne({
      where: { email: invite.email, tenant_id: invite.tenant_id },
    });
    if (existing) throw new ConflictException('A user with this email already exists in the organisation');

    const password_hash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({
      email: invite.email,
      password_hash,
      name: name ?? null,
      tenant_id: invite.tenant_id,
      is_super_admin: false,
      email_verified: true,
    });
    await this.userRepo.save(user);

    const roleId = invite.role_id ?? null;
    if (roleId) {
      const role = await this.roleRepo.findOne({ where: { id: roleId, tenant_id: invite.tenant_id } });
      if (role) {
        await this.userRoleRepo.save(this.userRoleRepo.create({ user_id: user.id, role_id: role.id }));
      }
    } else {
      const defaultRole = await this.roleRepo.findOne({
        where: { tenant_id: invite.tenant_id, slug: 'staff' },
      });
      if (defaultRole) {
        await this.userRoleRepo.save(this.userRoleRepo.create({ user_id: user.id, role_id: defaultRole.id }));
      }
    }

    await this.pendingInviteRepo.update(invite.id, { used_at: new Date() });

    const context = await this.buildContext(user);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      isSuperAdmin: false,
      roleIds: context.roleIds,
      permissions: context.permissions,
    };
    const access_token = this.jwtService.sign(payload);
    return { access_token, user: context };
  }
}
