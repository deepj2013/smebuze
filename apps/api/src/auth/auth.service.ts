import { HttpException, HttpStatus, Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { Customer } from '../crm/entities/customer.entity';
import { Warehouse } from '../inventory/entities/warehouse.entity';
import { isPosBusinessType } from '../common/tenant-client-types';

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

  async login(dto: LoginDto): Promise<{ access_token: string; user: TenantContext }> {
    let user: User | null = null;

    if (dto.tenantSlug) {
      const tenant = await this.tenantRepo.findOne({
        where: { slug: dto.tenantSlug, is_active: true },
      });
      if (!tenant) throw new UnauthorizedException('Invalid tenant');
      user = await this.userRepo.findOne({
        where: { email: dto.email, tenant_id: tenant.id, is_active: true },
        relations: ['defaultCompany', 'defaultBranch'],
      });
    } else {
      user = await this.userRepo.findOne({
        where: { email: dto.email, tenant_id: IsNull(), is_super_admin: true, is_active: true },
      });
    }

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const match = await bcrypt.compare(dto.password, user.password_hash);
    if (!match) throw new UnauthorizedException('Invalid email or password');

    if (!user.is_super_admin && user.email_verified === false) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Confirm the 6-digit code we sent to your email before signing in.',
          email: user.email,
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

    const access_token = this.jwtService.sign(payload);
    return { access_token, user: context };
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
      settings: { business_type: businessType },
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

  async getMe(ctx: TenantContext): Promise<{ user: TenantContext; tenant?: { slug: string; settings: Record<string, unknown> } }> {
    const user = await this.userRepo.findOne({
      where: { id: ctx.userId, is_active: true },
    });
    if (!user) throw new UnauthorizedException('User not found or inactive');
    let allowed_modules = ctx.allowed_modules;
    if (user.department_id && !allowed_modules) {
      const dept = await this.departmentRepo.findOne({ where: { id: user.department_id } });
      if (dept?.allowed_modules?.length) allowed_modules = dept.allowed_modules;
    }
    let tenant: { slug: string; settings: Record<string, unknown> } | undefined;
    if (ctx.tenantId) {
      const t = await this.tenantRepo.findOne({
        where: { id: ctx.tenantId },
        select: ['slug', 'settings'],
      });
      if (t) tenant = { slug: t.slug, settings: (t.settings as Record<string, unknown>) ?? {} };
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
    const user = await this.findUserForEmail(dto.email, dto.tenantSlug);
    if (!user) {
      return { message: 'If an account exists with this email, you will receive a reset code.' };
    }
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
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3001';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    const { sent, devLink } = await this.mailService.sendPasswordReset(
      user.email,
      user.name || 'there',
      otp,
      resetLink,
    );
    if (!sent && process.env.NODE_ENV !== 'production' && devLink) {
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
    tenant?: { slug: string; settings: Record<string, unknown> };
  }> {
    const purpose = dto.purpose || 'verify_email';
    const user = await this.findUserForEmail(dto.email, dto.tenantSlug);
    if (!user) throw new BadRequestException('Invalid code or email');
    await this.assertOtp(user.id, purpose, dto.otp);
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
      let tenant: { slug: string; settings: Record<string, unknown> } | undefined;
      if (fresh.tenant_id) {
        const t = await this.tenantRepo.findOne({ where: { id: fresh.tenant_id }, select: ['slug', 'settings'] });
        if (t) tenant = { slug: t.slug, settings: (t.settings as Record<string, unknown>) ?? {} };
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
    const user = await this.findUserForEmail(dto.email, dto.tenantSlug);
    if (!user) return { message: 'If an account exists, a new code has been sent.' };
    const otp = await this.issueOtp(user.id, purpose);
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3001';
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
    return { message: 'If an account exists, a new code has been sent.' };
  }

  async resetPasswordWithOtp(dto: ResetPasswordOtpDto): Promise<{ message: string }> {
    const user = await this.findUserForEmail(dto.email, dto.tenantSlug);
    if (!user) throw new BadRequestException('Invalid code or email');
    await this.assertOtp(user.id, 'reset_password', dto.otp);
    const password_hash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(user.id, { password_hash, email_verified: true });
    return { message: 'Password updated. You can now sign in.' };
  }

  private async findUserForEmail(email: string, tenantSlug?: string): Promise<User | null> {
    if (tenantSlug?.trim()) {
      const tenant = await this.tenantRepo.findOne({ where: { slug: tenantSlug.trim(), is_active: true } });
      if (!tenant) return null;
      return this.userRepo.findOne({ where: { email, tenant_id: tenant.id, is_active: true } });
    }
    const superAdmin = await this.userRepo.findOne({
      where: { email, tenant_id: IsNull(), is_super_admin: true, is_active: true },
    });
    if (superAdmin) return superAdmin;
    const matches = await this.userRepo.find({ where: { email, is_active: true } });
    if (matches.length === 1) return matches[0];
    return null;
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
