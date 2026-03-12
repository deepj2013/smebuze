import { Injectable, ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Company } from '../tenant/entities/company.entity';
import { Branch } from '../tenant/entities/branch.entity';
import { Department } from '../tenant/entities/department.entity';
import { User } from '../auth/entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import { UserRole } from '../auth/entities/user-role.entity';
import { PendingInvite } from '../auth/entities/pending-invite.entity';
import { TenantContext } from '../common/tenant-context';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { isValidGstin } from '../common/gstin.validator';
import { RolePermission } from '../auth/entities/role-permission.entity';
import { Permission } from '../auth/entities/permission.entity';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(PendingInvite)
    private readonly pendingInviteRepo: Repository<PendingInvite>,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  private assertTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant context required');
    return ctx.tenantId;
  }

  async createCompany(
    dto: { name: string; legal_name?: string; gstin?: string; address?: Record<string, unknown> },
    ctx: TenantContext,
  ): Promise<Company> {
    const tenantId = this.assertTenantId(ctx);
    if (dto.gstin && !isValidGstin(dto.gstin)) throw new BadRequestException('Invalid GSTIN format');
    const company = this.companyRepo.create({
      tenant_id: tenantId,
      name: dto.name,
      legal_name: dto.legal_name ?? null,
      gstin: dto.gstin ?? null,
      address: dto.address ?? {},
    });
    const saved = await this.companyRepo.save(company);
    await this.auditService.log(ctx, 'company.create', 'company', saved.id, { name: saved.name }).catch(() => {});
    return saved;
  }

  async findCompanies(ctx: TenantContext): Promise<Company[]> {
    const tenantId = this.assertTenantId(ctx);
    return this.companyRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'ASC' },
    });
  }

  async findOneCompany(id: string, ctx: TenantContext): Promise<Company> {
    const tenantId = this.assertTenantId(ctx);
    const company = await this.companyRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async createBranch(
    dto: { company_id: string; name: string; address?: Record<string, unknown> },
    ctx: TenantContext,
  ): Promise<Branch> {
    const tenantId = this.assertTenantId(ctx);
    const company = await this.companyRepo.findOne({
      where: { id: dto.company_id, tenant_id: tenantId },
    });
    if (!company) throw new NotFoundException('Company not found');
    const branch = this.branchRepo.create({
      company_id: dto.company_id,
      name: dto.name,
      address: dto.address ?? {},
    });
    const saved = await this.branchRepo.save(branch);
    await this.auditService.log(ctx, 'branch.create', 'branch', saved.id, { name: saved.name }).catch(() => {});
    return saved;
  }

  async findBranches(companyId: string, ctx: TenantContext): Promise<Branch[]> {
    const tenantId = this.assertTenantId(ctx);
    const company = await this.companyRepo.findOne({
      where: { id: companyId, tenant_id: tenantId },
    });
    if (!company) throw new NotFoundException('Company not found');
    return this.branchRepo.find({
      where: { company_id: companyId },
      order: { created_at: 'ASC' },
    });
  }

  async updateCompany(
    id: string,
    dto: Partial<{ name: string; legal_name: string; gstin: string; address: Record<string, unknown> }>,
    ctx: TenantContext,
  ): Promise<Company> {
    if (dto.gstin != null && !isValidGstin(dto.gstin)) throw new BadRequestException('Invalid GSTIN format');
    const company = await this.findOneCompany(id, ctx);
    if (dto.name != null) company.name = dto.name;
    if (dto.legal_name != null) company.legal_name = dto.legal_name;
    if (dto.gstin != null) company.gstin = dto.gstin;
    if (dto.address != null) company.address = dto.address;
    const saved = await this.companyRepo.save(company);
    await this.auditService.log(ctx, 'company.update', 'company', id, { name: saved.name }).catch(() => {});
    return saved;
  }

  async findOneBranch(branchId: string, ctx: TenantContext): Promise<Branch> {
    const tenantId = this.assertTenantId(ctx);
    const branch = await this.branchRepo.findOne({
      where: { id: branchId },
      relations: ['company'],
    });
    if (!branch || (branch.company as Company).tenant_id !== tenantId) throw new NotFoundException('Branch not found');
    return branch;
  }

  async updateBranch(
    id: string,
    dto: Partial<{ name: string; address: Record<string, unknown> }>,
    ctx: TenantContext,
  ): Promise<Branch> {
    const branch = await this.findOneBranch(id, ctx);
    if (dto.name != null) branch.name = dto.name;
    if (dto.address != null) branch.address = dto.address;
    const saved = await this.branchRepo.save(branch);
    await this.auditService.log(ctx, 'branch.update', 'branch', id, { name: saved.name }).catch(() => {});
    return saved;
  }

  // ——— Departments ———
  async findDepartments(ctx: TenantContext): Promise<Department[]> {
    const tenantId = this.assertTenantId(ctx);
    return this.departmentRepo.find({
      where: { tenant_id: tenantId },
      order: { name: 'ASC' },
    });
  }

  async createDepartment(
    dto: { name: string; company_id?: string; allowed_modules?: string[] },
    ctx: TenantContext,
  ): Promise<Department> {
    const tenantId = this.assertTenantId(ctx);
    const dept = this.departmentRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id ?? null,
      name: dto.name,
      allowed_modules: dto.allowed_modules ?? ['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports', 'bulk_upload'],
    });
    return this.departmentRepo.save(dept);
  }

  async findOneDepartment(id: string, ctx: TenantContext): Promise<Department> {
    const tenantId = this.assertTenantId(ctx);
    const dept = await this.departmentRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async updateDepartment(
    id: string,
    dto: Partial<{ name: string; company_id: string | null; allowed_modules: string[] }>,
    ctx: TenantContext,
  ): Promise<Department> {
    const dept = await this.findOneDepartment(id, ctx);
    if (dto.name != null) dept.name = dto.name;
    if (dto.company_id !== undefined) dept.company_id = dto.company_id;
    if (dto.allowed_modules != null) dept.allowed_modules = dto.allowed_modules;
    return this.departmentRepo.save(dept);
  }

  async findRoles(ctx: TenantContext): Promise<Role[]> {
    const tenantId = this.assertTenantId(ctx);
    return this.roleRepo.find({
      where: { tenant_id: tenantId },
      order: { name: 'ASC' },
    });
  }

  async findPermissions(): Promise<Permission[]> {
    return this.permissionRepo.find({ order: { key: 'ASC' } });
  }

  async findOneRole(id: string, ctx: TenantContext): Promise<Role & { permission_ids?: string[] }> {
    const tenantId = this.assertTenantId(ctx);
    const role = await this.roleRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!role) throw new NotFoundException('Role not found');
    const rps = await this.rolePermissionRepo.find({ where: { role_id: id } });
    const permission_ids = rps.map((rp) => rp.permission_id);
    return { ...role, permission_ids };
  }

  async createRole(
    dto: { name: string; slug?: string; permission_ids?: string[] },
    ctx: TenantContext,
  ): Promise<Role> {
    const tenantId = this.assertTenantId(ctx);
    const slug = (dto.slug ?? dto.name.toLowerCase().replace(/\s+/g, '_')).replace(/[^a-z0-9_]/g, '');
    const existing = await this.roleRepo.findOne({ where: { tenant_id: tenantId, slug } });
    if (existing) throw new ConflictException('Role with this slug already exists');
    const role = this.roleRepo.create({
      tenant_id: tenantId,
      name: dto.name,
      slug,
      is_system: false,
    });
    const saved = await this.roleRepo.save(role);
    for (const pid of dto.permission_ids ?? []) {
      const perm = await this.permissionRepo.findOne({ where: { id: pid } });
      if (perm) await this.rolePermissionRepo.save(this.rolePermissionRepo.create({ role_id: saved.id, permission_id: pid }));
    }
    await this.auditService.log(ctx, 'role.create', 'role', saved.id, { name: saved.name }).catch(() => {});
    return saved;
  }

  async updateRole(
    id: string,
    dto: Partial<{ name: string; slug: string; permission_ids: string[] }>,
    ctx: TenantContext,
  ): Promise<Role> {
    const tenantId = this.assertTenantId(ctx);
    const role = await this.roleRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.is_system && dto.permission_ids != null) {
      // allow updating permissions on system roles (e.g. Tenant Admin)
      // no-op for name/slug on system
    }
    if (!role.is_system) {
      if (dto.name != null) role.name = dto.name;
      if (dto.slug != null) role.slug = dto.slug.replace(/[^a-z0-9_]/g, '');
    }
    await this.roleRepo.save(role);
    if (dto.permission_ids != null) {
      await this.rolePermissionRepo.delete({ role_id: id });
      for (const pid of dto.permission_ids) {
        const perm = await this.permissionRepo.findOne({ where: { id: pid } });
        if (perm) await this.rolePermissionRepo.save(this.rolePermissionRepo.create({ role_id: id, permission_id: pid }));
      }
    }
    await this.auditService.log(ctx, 'role.update', 'role', id, { name: role.name }).catch(() => {});
    return this.roleRepo.findOne({ where: { id } }) as Promise<Role>;
  }

  // ——— Users ———
  async findUsers(ctx: TenantContext): Promise<(User & { role_names?: string[] })[]> {
    const tenantId = this.assertTenantId(ctx);
    const users = await this.userRepo.find({
      where: { tenant_id: tenantId },
      order: { email: 'ASC' },
      relations: ['defaultCompany'],
    });
    const result: (User & { role_names?: string[] })[] = [];
    for (const u of users) {
      const roles = await this.userRoleRepo.find({ where: { user_id: u.id }, relations: ['role'] });
      const roleNames = roles.map((ur) => (ur as UserRole & { role?: Role }).role?.name).filter(Boolean) as string[];
      result.push({ ...u, role_names: roleNames, password_hash: null } as User & { role_names: string[] });
    }
    return result;
  }

  async findOneUser(id: string, ctx: TenantContext): Promise<User & { role_ids?: string[]; role_names?: string[] }> {
    const tenantId = this.assertTenantId(ctx);
    const user = await this.userRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['defaultCompany', 'defaultBranch'],
    });
    if (!user) throw new NotFoundException('User not found');
    const userRoles = await this.userRoleRepo.find({ where: { user_id: id }, relations: ['role'] });
    const roleIds = userRoles.map((ur) => ur.role_id);
    const roleNames = userRoles.map((ur) => (ur as UserRole & { role?: Role }).role?.name).filter(Boolean) as string[];
    const out = { ...user, password_hash: null, role_ids: roleIds, role_names: roleNames } as User & { role_ids: string[]; role_names: string[] };
    return out;
  }

  async createUser(
    dto: { email: string; password: string; name?: string; phone?: string; default_company_id?: string; default_branch_id?: string; department_id?: string; role_ids: string[] },
    ctx: TenantContext,
  ): Promise<User> {
    const tenantId = this.assertTenantId(ctx);
    const existing = await this.userRepo.findOne({ where: { tenant_id: tenantId, email: dto.email } });
    if (existing) throw new ConflictException('User with this email already exists');
    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      tenant_id: tenantId,
      email: dto.email,
      password_hash,
      name: dto.name ?? null,
      phone: dto.phone ?? null,
      default_company_id: dto.default_company_id ?? null,
      default_branch_id: dto.default_branch_id ?? null,
      department_id: dto.department_id ?? null,
      is_active: true,
    });
    const saved = await this.userRepo.save(user);
    for (const roleId of dto.role_ids ?? []) {
      const role = await this.roleRepo.findOne({ where: { id: roleId, tenant_id: tenantId } });
      if (role) await this.userRoleRepo.save(this.userRoleRepo.create({ user_id: saved.id, role_id: roleId }));
    }
    await this.auditService.log(ctx, 'user.create', 'user', saved.id, { email: saved.email }).catch(() => {});
    return saved;
  }

  async updateUser(
    id: string,
    dto: Partial<{ name: string; phone: string; email: string; default_company_id: string | null; default_branch_id: string | null; department_id: string | null; is_active: boolean; role_ids: string[] }>,
    ctx: TenantContext,
  ): Promise<User> {
    const user = await this.findOneUser(id, ctx);
    if (dto.name != null) user.name = dto.name;
    if (dto.phone != null) user.phone = dto.phone;
    if (dto.email != null) user.email = dto.email;
    if (dto.default_company_id !== undefined) user.default_company_id = dto.default_company_id;
    if (dto.default_branch_id !== undefined) user.default_branch_id = dto.default_branch_id;
    if (dto.department_id !== undefined) user.department_id = dto.department_id;
    if (dto.is_active !== undefined) user.is_active = dto.is_active;
    await this.userRepo.save(user);
    if (dto.role_ids != null) {
      await this.userRoleRepo.delete({ user_id: id });
      const tenantId = this.assertTenantId(ctx);
      for (const roleId of dto.role_ids) {
        const role = await this.roleRepo.findOne({ where: { id: roleId, tenant_id: tenantId } });
        if (role) await this.userRoleRepo.save(this.userRoleRepo.create({ user_id: id, role_id: roleId }));
      }
    }
    await this.auditService.log(ctx, 'user.update', 'user', id, { is_active: dto.is_active }).catch(() => {});
    return this.userRepo.findOne({ where: { id } }) as Promise<User>;
  }

  async createInvite(
    ctx: TenantContext,
    email: string,
    roleId?: string | null,
  ): Promise<{ inviteLink: string; token: string; expiresAt: string }> {
    const tenantId = this.assertTenantId(ctx);
    const existing = await this.userRepo.findOne({ where: { tenant_id: tenantId, email: email.trim().toLowerCase() } });
    if (existing) throw new ConflictException('A user with this email already exists');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3001';
    const inviteLink = `${baseUrl}/join?token=${token}`;
    await this.pendingInviteRepo.save(
      this.pendingInviteRepo.create({
        tenant_id: tenantId,
        email: email.trim().toLowerCase(),
        role_id: roleId ?? null,
        token,
        expires_at: expiresAt,
        created_by: ctx.userId,
      }),
    );
    await this.mailService.sendInvite(email.trim(), inviteLink);
    return { inviteLink, token, expiresAt: expiresAt.toISOString() };
  }

  async listInvites(ctx: TenantContext): Promise<{ email: string; expires_at: string; used_at: string | null }[]> {
    const tenantId = this.assertTenantId(ctx);
    const invites = await this.pendingInviteRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
      take: 50,
    });
    return invites.map((i) => ({
      email: i.email,
      expires_at: i.expires_at.toISOString(),
      used_at: i.used_at?.toISOString() ?? null,
    }));
  }
}
