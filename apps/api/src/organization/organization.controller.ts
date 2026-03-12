import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('organization')
@UseGuards(JwtAuthGuard, TenantGuard)
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get('roles')
  @RequirePermissions('org.user.view')
  async getRoles(@CurrentTenant() ctx: TenantContext) {
    return this.orgService.findRoles(ctx);
  }

  @Get('roles/:id')
  @RequirePermissions('org.role.manage')
  async getRole(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.orgService.findOneRole(id, ctx);
  }

  @Post('roles')
  @RequirePermissions('org.role.manage')
  async createRole(@Body() body: { name: string; slug?: string; permission_ids?: string[] }, @CurrentTenant() ctx: TenantContext) {
    return this.orgService.createRole(body, ctx);
  }

  @Patch('roles/:id')
  @RequirePermissions('org.role.manage')
  async updateRole(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.orgService.updateRole(id, body as Parameters<OrganizationService['updateRole']>[1], ctx);
  }

  @Get('permissions')
  @RequirePermissions('org.role.manage')
  async getPermissions() {
    return this.orgService.findPermissions();
  }

  @Get('users')
  @RequirePermissions('org.user.view')
  async getUsers(@CurrentTenant() ctx: TenantContext) {
    return this.orgService.findUsers(ctx);
  }

  @Get('users/:id')
  @RequirePermissions('org.user.view')
  async getUser(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.orgService.findOneUser(id, ctx);
  }

  @Post('users')
  @RequirePermissions('org.user.create')
  async createUser(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.orgService.createUser(body as Parameters<OrganizationService['createUser']>[0], ctx);
  }

  @Patch('users/:id')
  @RequirePermissions('org.user.create')
  async updateUser(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.orgService.updateUser(id, body as Parameters<OrganizationService['updateUser']>[1], ctx);
  }

  @Get('departments')
  @RequirePermissions('org.user.view')
  async getDepartments(@CurrentTenant() ctx: TenantContext) {
    return this.orgService.findDepartments(ctx);
  }

  @Get('departments/:id')
  @RequirePermissions('org.user.view')
  async getDepartment(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.orgService.findOneDepartment(id, ctx);
  }

  @Post('departments')
  @RequirePermissions('org.user.create')
  async createDepartment(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.orgService.createDepartment(body as Parameters<OrganizationService['createDepartment']>[0], ctx);
  }

  @Patch('departments/:id')
  @RequirePermissions('org.user.create')
  async updateDepartment(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.orgService.updateDepartment(id, body as Parameters<OrganizationService['updateDepartment']>[1], ctx);
  }

  @Post('companies')
  @RequirePermissions('org.company.create')
  async createCompany(
    @Body() body: { name: string; legal_name?: string; gstin?: string; address?: Record<string, unknown> },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.orgService.createCompany(body, ctx);
  }

  @Get('companies')
  @RequirePermissions('org.company.view')
  async getCompanies(@CurrentTenant() ctx: TenantContext) {
    return this.orgService.findCompanies(ctx);
  }

  @Get('companies/:id')
  @RequirePermissions('org.company.view')
  async getCompany(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.orgService.findOneCompany(id, ctx);
  }

  @Patch('companies/:id')
  @RequirePermissions('org.company.create')
  async updateCompany(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; legal_name: string; gstin: string; address: Record<string, unknown> }>,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.orgService.updateCompany(id, body, ctx);
  }

  @Post('branches')
  @RequirePermissions('org.branch.create')
  async createBranch(
    @Body() body: { company_id: string; name: string; address?: Record<string, unknown> },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.orgService.createBranch(body, ctx);
  }

  @Get('companies/:companyId/branches')
  @RequirePermissions('org.branch.view')
  async getBranches(@Param('companyId') companyId: string, @CurrentTenant() ctx: TenantContext) {
    return this.orgService.findBranches(companyId, ctx);
  }

  @Get('branches/:id')
  @RequirePermissions('org.branch.view')
  async getBranch(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.orgService.findOneBranch(id, ctx);
  }

  @Patch('branches/:id')
  @RequirePermissions('org.branch.create')
  async updateBranch(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; address: Record<string, unknown> }>,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.orgService.updateBranch(id, body, ctx);
  }

  @Post('invites')
  @RequirePermissions('org.user.create')
  async createInvite(
    @Body() body: { email: string; role_id?: string | null },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.orgService.createInvite(ctx, body.email, body.role_id);
  }

  @Get('invites')
  @RequirePermissions('org.user.view')
  async listInvites(@CurrentTenant() ctx: TenantContext) {
    return this.orgService.listInvites(ctx);
  }
}
